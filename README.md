# Frontend-MovieRama-Danae

A Single Page Application (SPA) for exploring movies, built with vanilla JavaScript and the [TMDB API](https://www.themoviedb.org/documentation/api).

## Features

- Modern, responsive UI with a glassmorphic header and movie grid
- **Infinite scroll:** Loads more movies as you scroll down
- **Live search:** Instantly find movies by title
- Movie cards show: poster, title, genres, overview, vote stars, release date
- Click any movie to expand and view:
  - **Trailer** (embedded video from TMDB)
  - Up to 2 reviews (styled as review cards)
  - Up to 6 similar movies (round poster thumbnails)
- Smooth expand/collapse animations
- All design is **mobile-friendly** (fully responsive CSS)
- Error handling for failed API calls and no results

## Tech Stack

- Vanilla JavaScript (ES6+)
- HTML5 + semantic markup
- CSS3 (Flexbox/Grid, custom scrollbar, gradients, modern card design)
- [TMDB API](https://www.themoviedb.org/documentation/api)

## Project Structure
/
├── index.html
├── style.css
├── script.js
└── README.md

## Author

Danae Archontouli

---

**Note:**  
_Do NOT open `index.html` by double-clicking it (i.e. as a `file://` URL)._  
Use a local server, otherwise the app will not load data due to browser security (CORS).
