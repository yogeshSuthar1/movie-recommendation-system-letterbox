// File Path: Frontend_react/src/pages/GenreSelection.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import "../styles/genre-selection.css";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const genres = [
  {
    id: 1,
    name: "Action",
    icon: (
      <svg {...iconProps}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: 2,
    name: "Comedy",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  {
    id: 3,
    name: "Drama",
    icon: (
      <svg {...iconProps}>
        <path d="M4 4h16v7a8 8 0 0 1-16 0V4z" />
        <path d="M9 9h.01" />
        <path d="M15 9h.01" />
        <path d="M9.5 14a3.5 3.5 0 0 0 5 0" />
      </svg>
    ),
  },
  {
    id: 4,
    name: "Thriller",
    icon: (
      <svg {...iconProps}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 5,
    name: "Horror",
    icon: (
      <svg {...iconProps}>
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
      </svg>
    ),
  },
  {
    id: 6,
    name: "Romance",
    icon: (
      <svg {...iconProps}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: 7,
    name: "Sci-Fi",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)" />
      </svg>
    ),
  },
  {
    id: 8,
    name: "Adventure",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    id: 9,
    name: "Fantasy",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
        <path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" />
      </svg>
    ),
  },
  {
    id: 10,
    name: "Mystery",
    icon: (
      <svg {...iconProps}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 11,
    name: "Crime",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    id: 12,
    name: "Animation",
    icon: (
      <svg {...iconProps}>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    id: 13,
    name: "Documentary",
    icon: (
      <svg {...iconProps}>
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 14,
    name: "Family",
    icon: (
      <svg {...iconProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 15,
    name: "Musical",
    icon: (
      <svg {...iconProps}>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: 16,
    name: "War",
    icon: (
      <svg {...iconProps}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 17,
    name: "Western",
    icon: (
      <svg {...iconProps}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 18,
    name: "History",
    icon: (
      <svg {...iconProps}>
        <line x1="3" y1="22" x2="21" y2="22" />
        <line x1="6" y1="18" x2="6" y2="11" />
        <line x1="10" y1="18" x2="10" y2="11" />
        <line x1="14" y1="18" x2="14" y2="11" />
        <line x1="18" y1="18" x2="18" y2="11" />
        <polygon points="12 2 20 7 4 7 12 2" />
      </svg>
    ),
  },
];

export default function GenreSelection() {
  const navigate = useNavigate();
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleGenre = (genreId) => {
    setSelectedGenres((current) => {
      if (current.includes(genreId)) {
        return current.filter((id) => id !== genreId);
      }
      return [...current, genreId];
    });
  };

  const handleContinue = async () => {
    if (selectedGenres.length < 3) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const selectedGenreNames = genres
        .filter((genre) => selectedGenres.includes(genre.id))
        .map((genre) => genre.name);

      const response = await fetch(`${API_BASE_URL}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          genres: selectedGenreNames
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save genres");
        setLoading(false);
        return;
      }

      localStorage.setItem("selectedGenres", JSON.stringify(selectedGenreNames));
      navigate("/home");
    } catch (err) {
      console.error("Preference connection error:", err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="genre-page">
      <div className="genre-glow genre-glow-one"></div>
      <div className="genre-glow genre-glow-two"></div>

      <div className="genre-container">
        <div className="genre-logo">
          MOVIE<span>VERSE</span>
        </div>

        <div className="genre-header">
          <div className="genre-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.5" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </div>
          <h1>Tell us what you love</h1>
          <p>Choose a few genres you enjoy and we'll personalize your MovieVerse experience.</p>
        </div>

        <div className="selection-info">
          <span>Select at least 3 genres</span>
          <strong>{selectedGenres.length} selected</strong>
        </div>

        <div className="genres-grid">
          {genres.map((genre) => {
            const isSelected = selectedGenres.includes(genre.id);
            return (
              <button
                key={genre.id}
                type="button"
                className={`genre-card ${isSelected ? "selected" : ""}`}
                onClick={() => toggleGenre(genre.id)}
              >
                <span className="genre-card-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {genre.icon}
                </span>
                <span className="genre-name">{genre.name}</span>
                {isSelected && (
                  <span className="genre-check" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && <div style={{ color: "#ff4757", textAlign: "center", marginBottom: "15px", fontSize: "14px" }}>{error}</div>}

        <div className="genre-bottom">
          {selectedGenres.length < 3 ? (
            <p className="genre-hint">
              Select {3 - selectedGenres.length} more {3 - selectedGenres.length === 1 ? " genre" : " genres"}
            </p>
          ) : (
            <p className="genre-ready">Great! Your recommendations are ready.</p>
          )}

          <button
            type="button"
            className={`continue-button ${selectedGenres.length >= 3 ? "active" : ""}`}
            onClick={handleContinue}
            disabled={selectedGenres.length < 3 || loading}
          >
            {loading ? "Saving..." : "Continue"}
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}