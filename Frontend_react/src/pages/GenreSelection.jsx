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

  const toggleGenre = (genreId) => {

    setSelectedGenres((current) => {

      if (current.includes(genreId)) {
        return current.filter((id) => id !== genreId);
      }

      return [...current, genreId];
    });
  };


const handleContinue = async () => {

  if (selectedGenres.length < 3) {
    return;
  }

  console.log("Selected genre IDs:", selectedGenres);

  try {

    const token = localStorage.getItem("token");

    console.log("Token exists:", !!token);

    if (!token) {
      navigate("/login");
      return;
    }

    const selectedGenreNames = genres
      .filter((genre) => selectedGenres.includes(genre.id))
      .map((genre) => genre.name);

    console.log(
      "Sending genres:",
      selectedGenreNames
    );

    const response = await fetch(
      "http://127.0.0.1:5000/preferences",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },

        body: JSON.stringify({
          genres: selectedGenreNames
        })
      }
    );

    console.log(
      "Preference response status:",
      response.status
    );

    const data = await response.json();

    console.log(
      "Preference response:",
      data
    );

    if (!response.ok) {
      console.error(
        "Preference error:",
        data
      );

      return;
    }

    localStorage.setItem(
      "selectedGenres",
      JSON.stringify(selectedGenreNames)
    );

    console.log("Going to home...");

    navigate("/home");

  } catch (error) {

    console.error(
      "Preference connection error:",
      error
    );

  }
};

  return (
    <div className="genre-page">

      {/* Background glow */}

      <div className="genre-glow genre-glow-one"></div>
      <div className="genre-glow genre-glow-two"></div>


      {/* Main content */}

      <div className="genre-container">

        {/* Logo */}

        <div className="genre-logo">
          MOVIE<span>VERSE</span>
        </div>


        {/* Heading */}

        <div className="genre-header">

          <div className="genre-icon">
            🎬
          </div>

          <h1>
            Tell us what you love
          </h1>

          <p>
            Choose a few genres you enjoy and we'll
            personalize your MovieVerse experience.
          </p>

        </div>


        {/* Selection count */}

        <div className="selection-info">

          <span>
            Select at least 3 genres
          </span>

          <strong>
            {selectedGenres.length} selected
          </strong>

        </div>


        {/* Genres */}

        <div className="genres-grid">

          {genres.map((genre) => {

            const isSelected =
              selectedGenres.includes(genre.id);

            return (
              <button
                key={genre.id}
                className={`genre-card ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() =>
                  toggleGenre(genre.id)
                }
              >

                <span className="genre-card-icon">
                  {genre.icon}
                </span>

                <span className="genre-name">
                  {genre.name}
                </span>

                {isSelected && (
                  <span className="genre-check">
                    ✓
                  </span>
                )}

              </button>
            );

          })}

        </div>


        {/* Bottom */}

        <div className="genre-bottom">

          {selectedGenres.length < 3 ? (

            <p className="genre-hint">
              Select {3 - selectedGenres.length} more
              {3 - selectedGenres.length === 1
                ? " genre"
                : " genres"}
            </p>

          ) : (

            <p className="genre-ready">
              Great! Your recommendations are ready.
            </p>

          )}


          <button
            className={`continue-button ${
              selectedGenres.length >= 3
                ? "active"
                : ""
            }`}
            onClick={handleContinue}
            disabled={selectedGenres.length < 3}
          >
            Continue
            <span>→</span>
          </button>

        </div>

      </div>

    </div>
  );
}