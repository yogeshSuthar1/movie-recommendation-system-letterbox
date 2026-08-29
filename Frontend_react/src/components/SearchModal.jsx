import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { performSearch } from "../services/homeService";
import "../styles/searchModal.css";

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("movie"); // Naya state: movie ya user
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setSearchType("movie");
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        const data = await performSearch(query, searchType);
        setResults(data);
        setLoading(false);
      } else {
        setResults([]);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, searchType]); // Jab type change hoga, tab bhi API hit hogi

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="search-input-wrapper">
          <span className="search-icon-big">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input-huge"
            placeholder={searchType === "movie" ? "Search movies..." : "Search users..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="close-btn" onClick={onClose}>ESC</button>
        </div>

        {/* NAYA: TOGGLE BUTTONS */}
        <div className="search-toggle-container">
          <button 
            className={`toggle-btn ${searchType === "movie" ? "active" : ""}`}
            onClick={() => setSearchType("movie")}
          >
            🎬 Movies
          </button>
          <button 
            className={`toggle-btn ${searchType === "user" ? "active" : ""}`}
            onClick={() => setSearchType("user")}
          >
            👤 Users
          </button>
        </div>

        <div className="search-results-container">
          {loading && <p className="search-loading">Searching {searchType}s...</p>}
          
          {!loading && results.length > 0 && (
            <div className="search-grid">
              {results.map((item) => (
                <Link 
                  to={searchType === "movie" ? `/movie/${item.movie_id}` : `/profile/${item.user_id}`} 
                  key={searchType === "movie" ? item.movie_id : item.user_id} 
                  className={`search-card ${searchType === "user" ? "user-card" : ""}`}
                  onClick={onClose}
                >
                  <img 
                    src={searchType === "movie" ? item.poster_url : (item.profile_pic || "https://cdn-icons-png.flaticon.com/512/149/149071.png")} 
                    alt={item.title || item.username} 
                  />
                  <div className="search-card-info">
                    <h4>{item.title || item.username}</h4>
                    {searchType === "movie" && <span>{item.release_year} • ⭐ {item.avg_rating}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}