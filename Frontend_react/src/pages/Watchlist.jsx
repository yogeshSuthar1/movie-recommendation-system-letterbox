// File Path: Frontend_react/src/pages/Watchlist.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getWatchlist, removeFromWatchlist } from "../services/homeService";
import Navbar from "../components/Navbar";
import SearchModal from "../components/SearchModal";
import "../styles/watchlist.css";

export default function Watchlist() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState("recent");

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    setLoading(true);
    const data = await getWatchlist();
    setMovies(data || []);
    setLoading(false);
  };

  const handleRemove = async (movieId, e) => {
    e.preventDefault();
    const success = await removeFromWatchlist(movieId);
    if (success) {
      setMovies((prev) => prev.filter((m) => m.movie_id !== movieId));
    }
  };

  // 🚀 FIX: Fake alert ki jagah Watchlist se remove karke Movie Review page par le jayega
  const handleMarkWatched = async (movieId, e) => {
    e.preventDefault();
    await removeFromWatchlist(movieId);
    setMovies((prev) => prev.filter((m) => m.movie_id !== movieId));
    navigate(`/movie/${movieId}`);
  };

  const sortedMovies = [...movies].sort((a, b) => {
    if (sortOption === "recent") return new Date(b.added_at) - new Date(a.added_at);
    if (sortOption === "rating") return (b.avg_rating || 0) - (a.avg_rating || 0);
    if (sortOption === "alpha") return (a.title || "").localeCompare(b.title || "");
    return 0;
  });

  return (
    <div className="watchlist-page">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <div className="wl-container">
        <header className="wl-header">
          <h1>My Watchlist</h1>
          <p>Your curated collection of must-see movies ({movies.length} items).</p>
          
          <div className="wl-filters">
            <div className="wl-sort-group">
              <span className="wl-label">Sort by:</span>
              <select className="wl-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="recent">Recently Added</option>
                <option value="rating">Highest Rated</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
          </div>
        </header>

        {loading ? (
          <h2 className="loading-text">Loading Collection...</h2>
        ) : movies.length === 0 ? (
          <div className="wl-empty">
            <h2>Your watchlist is empty!</h2>
            <Link to="/home" className="btn-explore">Explore Movies</Link>
          </div>
        ) : (
          <div className="wl-grid">
            {sortedMovies.map((movie) => (
              <Link to={`/movie/${movie.movie_id}`} key={movie.movie_id} className="wl-card">
                <img src={movie.poster_url} alt={movie.title} className="wl-poster" />
                
                <div className="wl-overlay">
                  <div className="wl-overlay-content">
                    <h3 className="wl-title">{movie.title}</h3>
                    <div className="wl-stars">
                      {"★".repeat(Math.floor(movie.avg_rating || 0))}
                      <span className="wl-rating-num">{movie.avg_rating}</span>
                    </div>
                    <p className="wl-synopsis">
                      {movie.overview?.length > 70 ? movie.overview.substring(0, 70) + "..." : movie.overview || "No overview available."}
                    </p>
                  </div>
                  
                  <div className="wl-actions">
                    <button className="wl-btn-watched" onClick={(e) => handleMarkWatched(movie.movie_id, e)}>
                      Mark as Watched ✔
                    </button>
                    <button className="wl-btn-remove" onClick={(e) => handleRemove(movie.movie_id, e)}>
                      Remove 
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}