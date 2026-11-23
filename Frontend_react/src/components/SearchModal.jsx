// File Path: Frontend_react/src/components/SearchModal.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import {
  performSearch,
  saveSearchQuery,
  getSearchHistory,
  clearSearchHistory,
  getFollowingList
} from "../services/homeService";
import "../styles/searchModal.css";

export default function SearchModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("movie"); // "movie", "actor", or "user"
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState({});

  const loggedInUserId = localStorage.getItem("user_id");
  const token = localStorage.getItem("token");

  // 1. Escape Key Handler to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 2. Load Search History & Initial Following Status on Open
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      fetchInitialFollowing();
    } else {
      setSearchTerm("");
      setResults([]);
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    const hist = await getSearchHistory();
    setHistory(Array.isArray(hist) ? hist : []);
  };

  const fetchInitialFollowing = async () => {
    if (!loggedInUserId) return;
    try {
      const followingList = await getFollowingList(loggedInUserId);
      if (Array.isArray(followingList)) {
        const statusMap = {};
        followingList.forEach((u) => {
          statusMap[u.user_id] = "Following";
        });
        setFollowStatus(statusMap);
      }
    } catch (err) {
      console.error("Failed to fetch following status:", err);
    }
  };

  const handleClearHistory = async () => {
    const success = await clearSearchHistory();
    if (success) setHistory([]);
  };

  // Save search query only on Enter or clicking a result
  const handleResultClick = (labelToSave) => {
    const queryToSave = (labelToSave || searchTerm || "").trim();
    if (queryToSave.length >= 2) {
      saveSearchQuery(queryToSave);
    }
    onClose();
  };

  const handleInputKeyDown = async (e) => {
    if (e.key === "Enter" && searchTerm.trim().length >= 2) {
      await saveSearchQuery(searchTerm.trim());
      fetchHistory();
    }
  };

  // 3. Secure Token-based Follow Toggle
  const handleFollowAction = async (e, targetUserId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/user/${targetUserId}/follow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFollowStatus((prev) => ({
          ...prev,
          [targetUserId]: data.status === "followed" || data.is_following ? "Following" : "Follow"
        }));
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        setLoading(true);
        const data = await performSearch(searchTerm, searchType, false);
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 400);

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
            onKeyDown={handleInputKeyDown}
            autoFocus
          />
          <button className="close-search-btn" onClick={onClose}>ESC</button>
        </div>

        <div className="search-tabs">
          <button
            className={`s-tab ${searchType === "movie" ? "active" : ""}`}
            onClick={() => setSearchType("movie")}
          >Movies</button>
          <button
            className={`s-tab ${searchType === "actor" ? "active" : ""}`}
            onClick={() => setSearchType("actor")}
          >Actors</button>
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
              {history.slice(0, 8).map((item) => (
                <div
                  key={item.history_id}
                  className="history-item"
                  onClick={() => setSearchTerm(item.search_query)}
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.65, flexShrink: 0 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{item.search_query}</span>
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
                    <Link
                      to={`/movie/${item.movie_id}`}
                      key={item.movie_id || idx}
                      className="search-result-card"
                      onClick={() => handleResultClick(item.title)}
                    >
                      <div className="src-poster-wrapper">
                        <img src={item.poster_url} alt={item.title} className="src-poster" />
                      </div>
                      <div className="src-info">
                        <h4>{item.title}</h4>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <span>{item.release_year}</span>
                          <span>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="#f5c518"
                              aria-hidden="true"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            {item.avg_rating || "N/A"}
                          </span>
                        </span>
                      </div>
                    </Link>
                  );
                } else if (searchType === "user") {
                  const isFollowing = followStatus[item.user_id] === "Following";
                  const validAvatar =
                    item.profile_image && /^https?:\/\//i.test(item.profile_image)
                      ? item.profile_image
                      : null;

                  return (
                    <Link
                      to={`/profile/${item.user_id}`}
                      key={item.user_id || idx}
                      className="search-result-card"
                      onClick={() => handleResultClick(item.username)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="src-avatar">
                          {validAvatar ? (
                            <img src={validAvatar} alt={item.username} />
                          ) : (
                            item.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="src-info">
                          <h4>@{item.username}</h4>
                        </div>
                      </div>
                      {Number(item.user_id) !== Number(loggedInUserId) && (
                        <button
                          onClick={(e) => handleFollowAction(e, item.user_id)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            background: isFollowing ? "transparent" : "var(--primary-accent)",
                            color: "#fff",
                            border: isFollowing ? "1px solid rgba(255,255,255,0.25)" : "none"
                          }}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </Link>
                  );
                } else {
                  const cleanActor = item.actor_name.split(" as ")[0];
                  return (
                    <Link
                      to={`/actor/${encodeURIComponent(cleanActor)}`}
                      key={idx}
                      className="search-result-card"
                      onClick={() => handleResultClick(cleanActor)}
                    >
                      <div className="src-avatar" style={{ background: "linear-gradient(135deg, #1a4a6e, #1db954)" }}>
                        {cleanActor.charAt(0).toUpperCase()}
                      </div>
                      <div className="src-info">
                        <h4 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {cleanActor}
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