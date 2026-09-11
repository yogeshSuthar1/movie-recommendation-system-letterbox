import React from "react";
import { Link } from "react-router-dom";
import MovieCard from "./MovieCard";

function MovieRow({ title, movies, seeMoreLink }) {
  return (
    <section className="movie-section">
      <div className="section-header">
        <h2>{title}</h2>
        {seeMoreLink && (
          <Link to={seeMoreLink} className="see-all">
            See All <span>→</span>
          </Link>
        )}
      </div>

      <div className="movie-row">
        {movies?.length > 0 ? (
          <>
            {movies.map((movie) => (
              <MovieCard key={movie.movie_id} movie={movie} />
            ))}
            
            {/* {seeMoreLink && (
              // <Link to={seeMoreLink} className="see-more-card">
              //   <div className="see-more-content">
              //     <span className="see-more-icon">➔</span>
              //     <p>Explore More</p>
              //   </div>
              // </Link>
            )} */}
          </>
        ) : (
          <p className="no-movies">No movies found.</p>
        )}
      </div>
    </section>
  );
}

// 🌟 YEH LINE SPAM ROK DEGI: Sirf tabhi render hoga jab props change honge
export default React.memo(MovieRow);