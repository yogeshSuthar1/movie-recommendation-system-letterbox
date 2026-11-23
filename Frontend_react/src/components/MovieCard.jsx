import React from "react";
import { Link } from "react-router-dom";
import "../styles/home.css";

export default function MovieCard({ movie }) {
  // Rating ko 1 decimal tak format karna (e.g., 4.56 -> 4.6)
  const formattedRating = movie.avg_rating 
    ? parseFloat(movie.avg_rating).toFixed(1) 
    : "N/A";

  return (
    <Link to={`/movie/${movie.movie_id}`} className="movie-card">
      <div className="movie-poster-wrapper">
        
        {/* Poster Image */}
        <img 
          src={movie.poster_url} 
          alt={movie.title} 
          className="movie-poster" 
          loading="lazy" 
        />
        
        {/* Gradient Overlay (Text ab image ke upar bottom mein aayega) */}
        <div className="movie-card-overlay">
          <div className="movie-info">
            <h3 className="movie-title">{movie.title}</h3>
            
            <div className="movie-meta">
              <span
                className="rating"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {formattedRating}
              </span>
              {movie.release_year && <span className="year">{movie.release_year}</span>}
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}