import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { performSearch, getSearchHistory, clearSearchHistory, toggleFollowUser } from "../services/homeService";
import "../styles/searchModal.css"; 

export default function SearchModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("movie"); // "movie" or "user"
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState({}); // Tracking follow states

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    } else {
      setSearchTerm("");
      setResults([]);
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    const hist = await getSearchHistory();
    setHistory(hist);
  };

  const handleClearHistory = async () => {
    const success = await clearSearchHistory();
    if (success) setHistory([]);
  };

  const handleFollowAction = async (e, userId) => {
    e.preventDefault(); // Link par click hone se roke
    e.stopPropagation();
    const res = await toggleFollowUser(userId);
    if (res && res.status) {
      setFollowStatus(prev => ({
        ...prev,
        [userId]: res.status === "followed" ? "Following" : "Follow"
      }));
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        setLoading(true);
        const data = await performSearch(searchTerm, searchType);
        setResults(data);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchType]); 

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="search-input-wrapper">
          <svg className="search-icon-inside" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder={`Search for ${searchType}s...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <button className="close-search-btn" onClick={onClose}>ESC</button>
        </div>

        <div className="search-tabs">
          <button 
            className={`s-tab ${searchType === "movie" ? "active" : ""}`}
            onClick={() => setSearchType("movie")}
          >Movies</button>
          <button className={`s-tab ${searchType === "actor" ? "active" : ""}`} onClick={() => setSearchType("actor")}>Actors</button>
          <button 
            className={`s-tab ${searchType === "user" ? "active" : ""}`}
            onClick={() => setSearchType("user")}
          >Users</button>
        </div>
        
        <div className="search-results-container">
          {loading && <p className="search-msg">Searching...</p>}
          
          {!loading && searchTerm.length < 2 && history.length > 0 && (
            <div className="search-history-section">
              <div className="sh-header">
                <h4>Recent Searches</h4>
                <button onClick={handleClearHistory} className="clear-hist-btn">Clear All</button>
              </div>
              {history.slice(0, 5).map(item => (
                <div 
                  key={item.history_id} 
                  className="history-item"
                  onClick={() => setSearchTerm(item.search_query)}
                >
                  🕒 {item.search_query}
                </div>
              ))}
            </div>
          )}

          {!loading && searchTerm.length > 1 && results.length === 0 && (
            <p className="search-msg">No {searchType} found. Try another term!</p>
          )}

          {!loading && results.length > 0 && (
            <div className="results-grid">
              {results.map((item, idx) => {
                if (searchType === "movie") {
                  return (
                    <Link to={`/movie/${item.movie_id}`} key={idx} className="search-result-card" onClick={onClose}>
                      <div className="src-poster-wrapper">
                        <img src={item.poster_url} alt={item.title} className="src-poster" />
                      </div>
                      <div className="src-info">
                        <h4>{item.title}</h4>
                        <span>{item.release_year} • ⭐ {item.avg_rating}</span>
                      </div>
                    </Link>
                  );
                } else if (searchType === "user") {
                  return (
                    <Link to={`/profile/${item.user_id}`} key={idx} className="search-result-card" onClick={onClose}>
                      <div className="src-avatar">
                        {item.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="src-info">
                        <h4>@{item.username}</h4>
                      </div>
                    </Link>
                  );
                } else {
                  // Actors Search Result Card
                  return (
                    <Link to={`/actor/${encodeURIComponent(item.actor_name.split(" as ")[0])}`} key={idx} className="search-result-card" onClick={onClose}>
                      <div className="src-avatar" style={{ background: "linear-gradient(135deg, #1a4a6e, #1db954)" }}>
                        {item.actor_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="src-info">
                        <h4 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.actor_name.split(" as ")[0]}
                        </h4>
                        <span style={{ fontSize: "12px", color: "#888" }}>Actor / Cast</span>
                      </div>
                    </Link>
                  );
                }
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}