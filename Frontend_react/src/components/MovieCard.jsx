import React from 'react';
import { Link } from 'react-router-dom';
// Agar is file ka koi CSS tha toh use yahan import rehne dena

export default function MovieCard({ movie }) {
  // Agar movie object empty hai toh kuch render mat karo
  if (!movie) return null;

  return (
    <Link 
      to={`/movie/${movie.movie_id}`} 
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="movie-card">
        <img 
          src={movie.poster_url} 
          alt={movie.title} 
          loading="lazy" 
        />
        <div className="movie-info">
          <h4>{movie.title}</h4>
          <span>⭐ {movie.avg_rating}</span>
        </div>
      </div>
    </Link>
  );
}