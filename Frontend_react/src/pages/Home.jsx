import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeData } from "../services/homeService";
import MovieRow from "../components/MovieRow";
import SearchModal from "../components/SearchModal"; 
import Navbar from "../components/Navbar";
import "../styles/home.css";

export default function Home() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Ctrl + K Shortcut Logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const loadHome = async () => {
      try {
        const data = await getHomeData();
        setHomeData(data);
      } catch (err) {
        console.error("HOME ERROR:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadHome();
  }, []);

  // Auto-Rotate Hero Banner every 3.5 seconds
  useEffect(() => {
    if (homeData?.featured_movies?.length > 0) {
      const interval = setInterval(() => {
        setFeaturedIndex((prevIndex) => 
          (prevIndex + 1) % homeData.featured_movies.length
        );
      }, 3500); 
      return () => clearInterval(interval);
    }
  }, [homeData]);

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loader"></div>
        <p>Loading MovieVerse...</p>
      </div>
    );
  }

  if (error) {
    return <div className="home-error">Failed to load home: {error}</div>;
  }

  const featured = homeData?.featured_movies ? homeData.featured_movies[featuredIndex] : null;

  return (
    <div className="home-page">
      {/* 🌟 Clean Global Navbar */}
      <Navbar onOpenSearch={() => setIsSearchModalOpen(true)} />

      {/* 🔍 Search Modal */}
      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
      />

      {/* ================= ROTATING HERO BANNER ================= */}
      {featured && (
        <div className="hero-banner">
          <div 
            className="hero-bg fade-bg" 
            style={{ backgroundImage: `url(${featured.poster_url})` }}
          ></div>
          <div className="hero-overlay"></div>

          <div className="hero-container">
            <div className="hero-content" key={featured.movie_id}>
              <div className="hero-badge">🔥 Latest Release</div>
              <h1 className="hero-title">{featured.title}</h1>
              
              <div className="hero-meta">
                <span className="rating">⭐ {featured.avg_rating}</span>
                <span className="year">{featured.release_year}</span>
                <span className="quality">4K</span>
              </div>
              
              <p className="hero-overview">
                {featured.overview.length > 200 
                  ? featured.overview.substring(0, 200) + "..." 
                  : featured.overview}
              </p>
              
              <div className="hero-actions">
                <Link to={`/movie/${featured.movie_id}`} className="btn-play" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  <span className="play-icon">▶</span> View Details
                </Link>
                <button className="btn-watchlist"><span>+</span> Add to Watchlist</button>
              </div>
            </div>

            <Link to={`/movie/${featured.movie_id}`} className="hero-poster-box" key={`poster-${featured.movie_id}`}>
              <img src={featured.poster_url} alt={featured.title} className="hero-poster-img" />
            </Link>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <main className="home-content">
        <MovieRow title="NEW RELEASES" movies={homeData.new_releases} />
        <MovieRow title="RECOMMENDED FOR YOU" movies={homeData.recommended_for_you} />
        <MovieRow title="ALL TIME TOP RATED" movies={homeData.top_rated} />
        {homeData.genre_sections.map((section) => (
          <MovieRow key={section.genre} title={`TOP IN ${section.genre.toUpperCase()}`} movies={section.movies} />
        ))}
      </main>
    </div>
  );
}