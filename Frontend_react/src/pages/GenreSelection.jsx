import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/genre-selection.css";

const genres = [
  { id: 1, name: "Action", icon: "⚡" },
  { id: 2, name: "Comedy", icon: "😂" },
  { id: 3, name: "Drama", icon: "🎭" },
  { id: 4, name: "Thriller", icon: "🔪" },
  { id: 5, name: "Horror", icon: "👻" },
  { id: 6, name: "Romance", icon: "❤️" },
  { id: 7, name: "Sci-Fi", icon: "🚀" },
  { id: 8, name: "Adventure", icon: "🗺️" },
  { id: 9, name: "Fantasy", icon: "🧙" },
  { id: 10, name: "Mystery", icon: "🔎" },
  { id: 11, name: "Crime", icon: "🕵️" },
  { id: 12, name: "Animation", icon: "🎨" },
  { id: 13, name: "Documentary", icon: "🎥" },
  { id: 14, name: "Family", icon: "👨‍👩‍👧" },
  { id: 15, name: "Musical", icon: "🎵" },
  { id: 16, name: "War", icon: "⚔️" },
  { id: 17, name: "Western", icon: "🤠" },
  { id: 18, name: "History", icon: "🏛️" },
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
      // 🌟 Map selected IDs to actual genre names (strings) so backend receives a list of strings
      const selectedGenreNames = genres
        .filter((genre) => selectedGenres.includes(genre.id))
        .map((genre) => genre.name);

      const response = await fetch("http://127.0.0.1:5000/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          genres: selectedGenreNames // 👈 Sending names array to match backend string expectation
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
          <div className="genre-icon">🎬</div>
          <h1>Tell us what you love</h1>
          <p>
            Choose a few genres you enjoy and we'll personalize your MovieVerse experience.
          </p>
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
                <span className="genre-card-icon">{genre.icon}</span>
                <span className="genre-name">{genre.name}</span>
                {isSelected && <span className="genre-check">✓</span>}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ color: "#ff4757", textAlign: "center", marginBottom: "15px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <div className="genre-bottom">
          {selectedGenres.length < 3 ? (
            <p className="genre-hint">
              Select {3 - selectedGenres.length} more
              {3 - selectedGenres.length === 1 ? " genre" : " genres"}
            </p>
          ) : (
            <p className="genre-ready">
              Great! Your recommendations are ready.
            </p>
          )}

          <button
            type="button"
            className={`continue-button ${selectedGenres.length >= 3 ? "active" : ""}`}
            onClick={handleContinue}
            disabled={selectedGenres.length < 3 || loading}
          >
            {loading ? "Saving..." : "Continue"}
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}