// File Path: Frontend_react/src/pages/ExploreMovies.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import SearchModal from "../components/SearchModal";
import { getSurpriseMovie } from "../services/homeService";
import "../styles/explore.css";

export default function ExploreMovies() {
  const location = useLocation();
  const initialGenre = location.state?.genre || "All";

  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // --- Advanced Filters State ---
  const [sortBy, setSortBy] = useState("Newest");
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedLang, setSelectedLang] = useState("All");
  const [selectedDuration, setSelectedDuration] = useState("All");
  const [selectedDecade, setSelectedDecade] = useState("All");

  const observer = useRef();

  // 🚀 FIX: Ref callback mein JSX return nahi karte
  const lastMovieElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // 🚀 FIX: encodeURIComponent lagaya taaki "120m+" aur "Top Rated" URL mein toote nahi
  const fetchMovies = async (pageNum) => {
    setLoading(true);
    try {
      const url = `http://127.0.0.1:5000/explore/movies?page=${pageNum}&limit=20&genre=${encodeURIComponent(
        selectedGenre
      )}&sort_by=${encodeURIComponent(sortBy)}&lang=${encodeURIComponent(
        selectedLang
      )}&duration=${encodeURIComponent(
        selectedDuration
      )}&decade=${encodeURIComponent(selectedDecade)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.movies) {
        console.error("API Error:", data.error || "Movies not found");
        return;
      }

      setMovies((prev) =>
        pageNum === 1 ? data.movies : [...prev, ...data.movies]
      );
      setHasMore(data.has_more);
    } catch (error) {
      console.error("Explore fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Jab bhi KOI BHI filter change ho, tabhi page 1 se reload karo
  useEffect(() => {
    setPage(1);
    fetchMovies(1);
    // eslint-disable-next-line
  }, [selectedGenre, sortBy, selectedLang, selectedDuration, selectedDecade]);

  useEffect(() => {
    if (page > 1) fetchMovies(page);
    // eslint-disable-next-line
  }, [page]);

  const clearFilters = () => {
    setSortBy("Newest");
    setSelectedGenre("All");
    setSelectedLang("All");
    setSelectedDuration("All");
    setSelectedDecade("All");
  };

  const [isSurprising, setIsSurprising] = useState(false);

  const handleSurpriseMe = async () => {
    setIsSurprising(true);

    const data = await getSurpriseMovie();

    if (data && data.movie_id) {
      setMovies([data]);
      setHasMore(false);
    } else {
      alert("Oops! Couldn't find a surprise movie right now.");
    }

    setIsSurprising(false);
  };

  // Filter Options arrays
  const genresList = [
    "All",
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Sci-Fi",
    "Romance",
    "Thriller",
    "Mystery",
  ];
  const durationList = ["All", "Under 90m", "90-120m", "120m+"];

  return (
    <div className="explore-wrapper">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <div className="explore-layout">
        {/* --- LEFT SIDEBAR (PREMIUM FILTERS) --- */}
        <aside className="explore-sidebar">
          <div className="filter-header">
            <h3>
              Filters <span>{movies.length > 0 ? "Active" : ""}</span>
            </h3>
            <button onClick={clearFilters} className="clear-btn">
              ✕ Clear
            </button>
          </div>

          <div className="filter-scroll-area">
            {/* SORTING */}
            <div className="filter-section">
              <label>SORT BY</label>
              <div className="custom-select-wrapper">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="Newest">Newest Releases</option>
                  <option value="Top Rated">Top Rated</option>
                  <option value="A-Z">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>

            {/* GENRES (Grid Style Badges) */}
            <div className="filter-section">
              <label>GENRE</label>
              <div className="genre-badges-grid">
                {genresList.map((g) => (
                  <button
                    key={g}
                    className={`filter-badge ${
                      selectedGenre === g ? "active" : ""
                    }`}
                    onClick={() => setSelectedGenre(g)}
                  >
                    {selectedGenre === g && <span className="active-dot"></span>}
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* LANGUAGES (Select) */}
            <div className="filter-section">
              <label>LANGUAGE</label>
              <div className="custom-select-wrapper">
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Languages</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                </select>
              </div>
            </div>

            {/* DECADE (Select) */}
            <div className="filter-section">
              <label>DECADE</label>
              <div className="custom-select-wrapper">
                <select
                  value={selectedDecade}
                  onChange={(e) => setSelectedDecade(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Time</option>
                  <option value="2020s">2020s</option>
                  <option value="2010s">2010s</option>
                  <option value="2000s">2000s</option>
                  <option value="Classic">Classics (Pre-2000)</option>
                </select>
              </div>
            </div>

            {/* DURATION (Pills) */}
            <div className="filter-section">
              <label>DURATION</label>
              <div className="duration-pills">
                {durationList.map((dur) => (
                  <button
                    key={dur}
                    className={`dur-pill ${
                      selectedDuration === dur ? "active" : ""
                    }`}
                    onClick={() => setSelectedDuration(dur)}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* SURPRISE ME BUTTON */}
            <div className="surprise-me-box-container">
              <button
                className="btn-surprise-me-simple"
                onClick={handleSurpriseMe}
                disabled={isSurprising}
              >
                {isSurprising ? "Searching..." : "Surprise Me"}
              </button>
            </div>
          </div>
        </aside>

        {/* --- RIGHT MAIN GRID --- */}
        <main className="explore-main">
          {/* Active Tags Bar */}
          <div className="active-tags-bar">
            {selectedGenre !== "All" && (
              <span className="glow-tag">{selectedGenre}</span>
            )}
            {selectedLang !== "All" && (
              <span className="glow-tag">{selectedLang}</span>
            )}
            {selectedDuration !== "All" && (
              <span className="glow-tag">{selectedDuration}</span>
            )}
            {selectedDecade !== "All" && (
              <span className="glow-tag">{selectedDecade}</span>
            )}
            <span className="plain-tag">Sort: {sortBy}</span>
          </div>

          <div className="premium-movie-grid">
            {movies.map((movie, index) => {
              const isLast = movies.length === index + 1;
              return (
                <Link
                  to={`/movie/${movie.movie_id}`}
                  key={movie.movie_id}
                  ref={isLast ? lastMovieElementRef : null}
                  className="premium-movie-card"
                >
                  <div className="card-img-wrapper">
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      loading="lazy"
                    />
                    <div className="card-overlay">
                      <span className="play-btn">▶</span>
                    </div>
                    {movie.avg_rating && (
                      <div className="rating-badge">
                        ★ {Number(movie.avg_rating).toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="card-info">
                    <h4>{movie.title}</h4>
                    <p>{movie.release_year} • Movie</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {loading && (
            <div className="ex-loader">
              <div className="spinner"></div>
              <span>Discovering movies...</span>
            </div>
          )}
          {!hasMore && movies.length > 0 && (
            <div className="end-msg">
              🎉 You've explored all movies in this category!
            </div>
          )}
          {!loading && movies.length === 0 && (
            <div className="empty-state">
              No movies found for these filters.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}