import React from "react";
import { Link } from "react-router-dom";
import "../styles/home.css"; // Tera CSS path

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
        
        {/* 🌟 NAYA: Gradient Overlay (Text ab image ke upar bottom mein aayega) */}
        <div className="movie-card-overlay">
          <div className="movie-info">
            <h3 className="movie-title">{movie.title}</h3>
            
            <div className="movie-meta">
              <span className="rating">⭐ {formattedRating}</span>
              {movie.release_year && <span className="year">{movie.release_year}</span>}
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}