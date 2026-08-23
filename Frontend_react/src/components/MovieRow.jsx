import React from "react";
import MovieCard from "./MovieCard";

export default function MovieRow({ title, movies }) {
  return (
    <section className="movie-section">
      <div className="section-header">
        <h2>{title}</h2>
        <button className="see-all">See All <span>→</span></button>
      </div>

      <div className="movie-row">
        {movies?.length > 0 ? (
          movies.map((movie) => (
            <MovieCard key={movie.movie_id} movie={movie} />
          ))
        ) : (
          <p className="no-movies">No movies found.</p>
        )}
      </div>
    </section>
  );
}