// File Path: Frontend_react/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api"; // 🚀 FIX N4
import MovieRow from "../components/MovieRow";
import SearchModal from "../components/SearchModal"; 
import Navbar from "../components/Navbar";
import { HeroSkeleton, MovieRowSkeleton } from "../components/SkeletonLoader"; 
import { addToWatchlist } from "../services/homeService";
import "../styles/home.css";

export default function Home() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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
    const fetchHomeData = async () => {
      try {
        setLoading(true); 
        const res = await fetch(`${API_BASE_URL}/home`, { // 🚀 FIX N4
          method: "GET",
          cache: "no-store",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setHomeData(data);
          
          fetch(`${API_BASE_URL}/warmup`) // 🚀 FIX N4
            .then(() => console.log("🔥 ML Models Warm-up Complete!"))
            .catch((err) => console.log("Warmup failed", err));

        } else {
          if (res.status === 401) {
            console.warn("Token expired! Redirecting to login...");
            localStorage.removeItem("token"); 
            window.location.href = "/login"; 
            return;
          }
          const errData = await res.json();
          setError(errData.error || "Failed to fetch data");
        }
      } catch (error) {
        console.error("Home load error:", error);
        setError("Network Error. Is Flask running?");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

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

  const handleHeroWatchlist = async (movieId) => {
    if (!movieId) return;
    const success = await addToWatchlist(movieId);
    if (success) {
      alert("Added to your watchlist successfully! 🔖");
    } else {
      alert("Movie is already in your watchlist.");
    }
  };

  if (error) return (
      <div>
        <Navbar onOpenSearch={() => setIsSearchModalOpen(true)} />
        <div className="home-error" style={{textAlign:"center", padding:"100px", color:"#ff4757"}}>Failed to load home: {error}</div>
      </div>
  );

  const featured = homeData?.featured_movies ? homeData.featured_movies[featuredIndex] : null;

  return (
    <div className="home-page">
      <Navbar onOpenSearch={() => setIsSearchModalOpen(true)} />
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />

      {loading ? (
        <>
          <HeroSkeleton />
          <MovieRowSkeleton count={5} />
          <MovieRowSkeleton count={5} />
          <MovieRowSkeleton count={5} />
        </>
      ) : (
        <>
          {featured && (
            <div className="hero-banner">
              <div className="hero-bg fade-bg" style={{ backgroundImage: `url(${featured.poster_url})` }}></div>
              <div className="hero-overlay"></div>
              <div className="hero-container">
                <div className="hero-content" key={featured.movie_id}>
                  <div className="hero-badge">🔥 Featured Release</div>
                  <h1 className="hero-title">{featured.title}</h1>
                  <div className="hero-meta">
                    <span className="rating">⭐ {featured.avg_rating ? Number(featured.avg_rating).toFixed(1) : "N/A"}</span>
                    <span className="year">{featured.release_year || "Unknown"}</span>
                    <span className="quality">HD</span>
                  </div>
                  <p className="hero-overview">
                    {featured.overview 
                      ? (featured.overview.length > 200 ? featured.overview.substring(0, 200) + "..." : featured.overview) 
                      : "No description available for this movie."}
                  </p>
                  <div className="hero-actions">
                    <Link to={`/movie/${featured.movie_id}`} className="btn-play" style={{ textDecoration: 'none', display: 'inline-block' }}>
                      <span className="play-icon">▶</span> View Details
                    </Link>
                    <button className="btn-watchlist" onClick={() => handleHeroWatchlist(featured.movie_id)}>
                      <span>+</span> Add to Watchlist
                    </button>
                  </div>
                </div>
                <Link to={`/movie/${featured.movie_id}`} className="hero-poster-box" key={`poster-${featured.movie_id}`}>
                  <img src={featured.poster_url} alt={featured.title} className="hero-poster-img" />
                </Link>
              </div>
            </div>
          )}

          <main className="home-content">
            {homeData?.because_you_love?.length > 0 && homeData?.dynamic_genre_name && (
              <MovieRow 
                title={`BECAUSE YOU LOVE ${homeData.dynamic_genre_name.toUpperCase()}`} 
                movies={homeData.because_you_love} 
                seeMoreLink={`/explore?genre=${homeData.dynamic_genre_name}`}
              />
            )}

            <MovieRow title="NEW RELEASES" movies={homeData?.new_releases || []} seeMoreLink="/explore?sort_by=Newest" />
            
            {homeData?.hidden_gems?.length > 0 && (
              <MovieRow title="💎 HIDDEN GEMS" movies={homeData.hidden_gems} seeMoreLink="/explore?sort_by=Top Rated" />
            )}

            <MovieRow title="RECOMMENDED FOR YOU" movies={homeData?.recommended_for_you || []} seeMoreLink="/explore" />
            
            <MovieRow title="ALL TIME TOP RATED" movies={homeData?.top_rated || []} seeMoreLink="/explore?sort_by=Top Rated" />
            
            {homeData?.genre_sections?.map((section) => (
              <MovieRow 
                key={section.genre} 
                title={`TOP IN ${(section.genre || "").toUpperCase()}`} 
                movies={section.movies || []} 
                seeMoreLink={`/explore?genre=${section.genre}`} 
              />
            ))}
          </main>
        </>
      )}
    </div>
  );
}