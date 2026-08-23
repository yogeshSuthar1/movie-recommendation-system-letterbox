import React from "react";

export default function MovieCard({ movie }) {

  return (
    <div className="movie-card">

      <div className="movie-poster-wrapper">

        <img
          src={movie.poster_url}
          alt={movie.title}
          className="movie-poster"
          loading="lazy"
        />

      </div>

      <div className="movie-info">

        <h3>
          {movie.title}
        </h3>

        <div className="movie-meta">

          <span>
            ⭐ {movie.avg_rating}
          </span>

          <span>
            {movie.release_year}
          </span>

        </div>

      </div>

    </div>
  );
}