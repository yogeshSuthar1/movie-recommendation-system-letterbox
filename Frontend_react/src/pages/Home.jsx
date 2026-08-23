import React, { useEffect, useState } from "react";
import { getHomeData } from "../services/homeService";
import MovieRow from "../components/MovieRow";
import "../styles/home.css";

export default function Home() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [featuredIndex, setFeaturedIndex] = useState(0);

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
    if (homeData && homeData.featured_movies && homeData.featured_movies.length > 0) {
      const interval = setInterval(() => {
        setFeaturedIndex((prevIndex) => 
          (prevIndex + 1) % homeData.featured_movies.length
        );
      }, 3500); 
      return () => clearInterval(interval); // Cleanup on unmount
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

  // Get current rotating movie
  const featured = homeData.featured_movies ? homeData.featured_movies[featuredIndex] : null;

  return (
    <div className="home-page">
      {/* ================= HEADER ================= */}
      <header className="home-header">
        <div className="logo">MOVIE<span>VERSE</span></div>
        <nav>
          <a href="/home" className="active">Home</a>
          <a href="#">Browse</a>
          <a href="#">My Watchlist</a>
        </nav>
        <div className="profile">👤</div>
      </header>

      {/* ================= ROTATING HERO BANNER ================= */}
      {featured && (
        <div className="hero-banner">
          {/* Blurred Background with smooth transition */}
          <div 
            className="hero-bg fade-bg" 
            style={{ backgroundImage: `url(${featured.poster_url})` }}
          ></div>
          <div className="hero-overlay"></div>

          <div className="hero-container">
            {/* Adding key forces the animation to replay when movie changes */}
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
                <button className="btn-play"><span className="play-icon">▶</span> Watch Now</button>
                <button className="btn-watchlist"><span>+</span> Add to Watchlist</button>
              </div>
            </div>

            {/* Poster on Right side */}
            <div className="hero-poster-box" key={`poster-${featured.movie_id}`}>
              <img src={featured.poster_url} alt={featured.title} className="hero-poster-img" />
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <main className="home-content">
        {/* NEW RELEASES ROW FIRST */}
        <MovieRow
          title="NEW RELEASES"
          movies={homeData.new_releases}
        />

        <MovieRow
          title="RECOMMENDED FOR YOU"
          movies={homeData.recommended_for_you}
        />

        <MovieRow
          title="ALL TIME TOP RATED"
          movies={homeData.top_rated}
        />

        {homeData.genre_sections.map((section) => (
          <MovieRow
            key={section.genre}
            title={`TOP IN ${section.genre.toUpperCase()}`}
            movies={section.movies}
          />
        ))}
      </main>
    </div>
  );
}