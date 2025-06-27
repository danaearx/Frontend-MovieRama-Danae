/**
 * MovieRama - Front End Assignment
 * Author: Danae Archontouli
 * Description: Single Page App (SPA) για προβολή ταινιών με TMDB API,
 * infinite scroll, search, trailer, reviews και similar movies.
 */

const API_KEY = "bc50218d91157b1ba4f142ef7baaa6a0";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let page = 1; // Current page for API requests
let isLoading = false; // Prevents multiple simultaneous fetches
let currentQuery = ""; // Keeps the current search query (empty for "Now Playing")
let totalPages = Infinity; // Will be set from API response
let genreMap = {}; // { genre_id: genre_name }

/**
 * DOM Elements
 */
const movieList = document.getElementById("movieList");
const loader = document.getElementById("loader");
const searchInput = document.getElementById("searchInput");

/**
 * Fetch all movie genres once and create a {id: name} mapping
 * This improves UX by showing genre names instead of IDs for each movie
 */
async function fetchGenres() {
  try {
    const res = await fetch(
      `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`
    );
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    genreMap = {};
    (data.genres || []).forEach((g) => {
      genreMap[g.id] = g.name;
    });
  } catch (e) {
    genreMap = {};
    // Still allow the app to function (will show N/A for genres)
  }
}

/**
 * Build API URL for now playing or search
 * Returns the correct TMDB endpoint based on the current query and page
 */
function buildUrl() {
  if (currentQuery) {
    // Searching
    return `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      currentQuery
    )}&language=en-US&page=${page}`;
  } else {
    // Now Playing (default)
    return `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=${page}`;
  }
}

/**
 * Fetch and render movies (handles infinite scroll and search)
 * isNewSearch: boolean - true όταν ξεκινά νέα αναζήτηση (καθαρίζει το movieList)
 */
async function fetchMovies(isNewSearch = false) {
  if (isLoading || page > totalPages) return;
  isLoading = true;
  loader.style.display = "block";
  try {
    const url = buildUrl();
    const res = await fetch(url);
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    totalPages = data.total_pages || Infinity;

    if (isNewSearch) movieList.innerHTML = "";

    const sectionTitle = document.getElementById("movieSectionTitle");
    if (currentQuery) {
      sectionTitle.textContent = `Results for: "${currentQuery}"`;
    } else {
      sectionTitle.textContent = "Now Playing";
    }

    renderMovies(data.results);

    // If nothing found on search, show friendly message
    if (data.results.length === 0 && isNewSearch) showNoResults();
  } catch (e) {
    // Show error but don't crash app
    movieList.innerHTML = `<div class="error">Failed to load data. Try again later.</div>`;
  }
  isLoading = false;
  page++;

  // Hide loader if we've loaded everything
  loader.style.display = page > totalPages ? "none" : "block";

  /**
   * Fallback: Αν το παράθυρο δεν έχει γεμίσει με results
   * (π.χ. ο χρήστης είναι σε μεγάλο monitor), φέρε επόμενη σελίδα
   * ώστε να γεμίσει το UI, και όχι να αφήνει “τρύπες”.
   */
  setTimeout(() => {
    const doc = document.documentElement;
    if (
      doc.scrollHeight <= window.innerHeight &&
      page <= totalPages &&
      !isLoading
    ) {
      fetchMovies();
    }
    // Extra fallback: If loader is still visible, trigger observer logic manually
    const loaderRect = loader.getBoundingClientRect();
    if (
      loaderRect.top < window.innerHeight &&
      loaderRect.bottom > 0 &&
      page <= totalPages &&
      !isLoading
    ) {
      fetchMovies();
    }
  }, 200);
}

/**
 * Render an array of movies (each as a card)
 * Adds event listeners for expand/collapse on click
 */
function renderMovies(movies) {
  movies.forEach((movie) => {
    // Get genre names from ids
    const genreNames = (movie.genre_ids || [])
      .map((id) => genreMap[id])
      .filter(Boolean)
      .join(", ");

    // Stars visualization (vote_average 0–10 → 0–5 stars)
    let stars = "";
    if (movie.vote_average) {
      const n = Math.round(movie.vote_average / 2);
      stars = "★".repeat(n).padEnd(5, "☆");
    }

    // Build the card
    const div = document.createElement("div");
    div.classList.add("movie");
    div.innerHTML = `
      <img src="${IMG_URL + movie.poster_path}" alt="${movie.title}" />
      <h3>${movie.title}</h3>
      <div class="vote-stars">${stars} <span style="font-weight:400; color:#aaa; margin-left:5px;">(${
      movie.vote_average || "N/A"
    })</span></div>
      <p>${movie.release_date}</p>
      <p><strong>Genres:</strong> ${genreNames || "N/A"}</p>
      <p><strong>Overview:</strong> ${movie.overview || "N/A"}</p>
      <div class="extra" style="display: none;"></div>
    `;

    // On click: expand/collapse details (trailer, reviews, similar)
    div.addEventListener("click", async () => {
      const extraDiv = div.querySelector(".extra");
      if (extraDiv.style.display === "none") {
        const details = await fetchMovieDetails(movie.id);
        extraDiv.innerHTML = `
          <div><strong>Trailer:</strong><br>${details.trailer}</div>
          <div class="reviews"><strong>Reviews:</strong>${details.reviews}</div>
          <div><strong>Similar Movies:</strong>${details.similar}</div>
        `;
        extraDiv.style.display = "block";
        div.classList.add("expanded");
      } else {
        extraDiv.style.display = "none";
        div.classList.remove("expanded");
      }
    });
    movieList.appendChild(div);
  });
}

/**
 * Fetch details for a movie: trailer, up to 2 reviews, similar movies
 * All requests are parallel for performance (Promise.all)
 */
async function fetchMovieDetails(movieId) {
  try {
    const [videosRes, reviewsRes, similarRes] = await Promise.all([
      fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`),
      fetch(`${BASE_URL}/movie/${movieId}/reviews?api_key=${API_KEY}`),
      fetch(
        `${BASE_URL}/movie/${movieId}/similar?api_key=${API_KEY}&language=en-US&page=1`
      ),
    ]);
    const videosData = await videosRes.json();
    const reviewsData = await reviewsRes.json();
    const similarData = await similarRes.json();

    // Trailer (YouTube)
    const trailer = videosData.results.find(
      (v) => v.type === "Trailer" && v.site === "YouTube"
    );

    // Up to 2 reviews
    const reviews = (reviewsData.results || []).slice(0, 2);

    // Up to 6 similar movies
    const similar = (similarData.results || []).slice(0, 6);

    // Each review is wrapped in a .review-card element for improved UI styling
    let reviewsHtml = "N/A";
    if (reviews.length > 0) {
      reviewsHtml = reviews
        .map(
          (r) =>
            `<div class="review-card">
      <div class="review-author">${r.author}</div>
      <div class="review-text">${r.content}</div>
    </div>`
        )
        .join("");
    }

    // Render similar movies as centered round posters with titles
    let similarHtml = "N/A";
    if (similar.length > 0) {
      similarHtml =
        '<div class="similar-movies-container">' +
        similar
          .map(
            (movie) => `
      <div class="similar-movie-item">
        <img src="${
          movie.poster_path ? IMG_URL + movie.poster_path : ""
        }" alt="${movie.title}">
        <div class="similar-movie-title">${movie.title}</div>
      </div>
    `
          )
          .join("") +
        "</div>";
    }

    return {
      trailer: trailer
        ? `<iframe width="100%" height="220" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`
        : "N/A",
      reviews: reviewsHtml,
      similar: similarHtml,
    };
  } catch (e) {
    // Fail gracefully in UI if details can't be fetched
    return {
      trailer: "N/A",
      reviews: "<div class='error'>Failed to load reviews.</div>",
      similar: "<div class='error'>Failed to load similar movies.</div>",
    };
  }
}

/**
 * Show "No results" message for search queries with no hits
 */
function showNoResults() {
  movieList.innerHTML = `<div class="no-results">No movies found.</div>`;
}

/**
 * Infinite scroll: Uses IntersectionObserver to fetch more movies
 * when the loader is visible at the bottom of the viewport.
 */
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !isLoading && page <= totalPages) {
      fetchMovies();
    }
  },
  {
    rootMargin: "100px",
  }
);
observer.observe(loader);

/**
 * Search input handler (live search)
 * Resets to page 1, clears results, triggers new fetch.
 */
searchInput.addEventListener("input", (e) => {
  currentQuery = e.target.value.trim();
  page = 1;
  totalPages = Infinity;
  movieList.innerHTML = "";
  fetchMovies(true);
});

// MAIN INIT
fetchGenres().then(fetchMovies);
