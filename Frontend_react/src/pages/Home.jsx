import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MovieRow from "../components/MovieRow";
import SearchModal from "../components/SearchModal"; 
import Navbar from "../components/Navbar";
import CinematicLoader from "../components/CinematicLoader";
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
        const res = await fetch("http://127.0.0.1:5000/home", {
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
          
          // 🚀 JAISE HI HOME PAGE LOAD HO, CHUP-CHAAP BACKGROUND MEIN MODEL LOAD KAR DO
          fetch("http://127.0.0.1:5000/warmup")
            .then(() => console.log("🔥 ML Models Warm-up Complete!"))
            .catch((err) => console.log("Warmup failed", err));

        } else {
          // 🔥 SMART FIX: Agar Token expire ho gaya (401), seedha login par bhejo!
          if (res.status === 401) {
            console.warn("Token expired! Redirecting to login...");
            localStorage.removeItem("token"); // Purana kachra saaf
            window.location.href = "/login"; // Seedha login page par dhakka
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

  if (loading) return <CinematicLoader />;
  if (error) return <div className="home-error">Failed to load home: {error}</div>;

  const featured = homeData?.featured_movies ? homeData.featured_movies[featuredIndex] : null;

  return (
    <div className="home-page">
      <Navbar onOpenSearch={() => setIsSearchModalOpen(true)} />
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />

      {featured && (
        <div className="hero-banner">
          <div className="hero-bg fade-bg" style={{ backgroundImage: `url(${featured.poster_url})` }}></div>
          <div className="hero-overlay"></div>
          <div className="hero-container">
            <div className="hero-content" key={featured.movie_id}>
              <div className="hero-badge">🔥 Latest Release</div>
              <h1 className="hero-title">{featured.title}</h1>
              <div className="hero-meta">
                <span className="rating">⭐ {featured.avg_rating || "N/A"}</span>
                <span className="year">{featured.release_year || "Unknown"}</span>
                <span className="quality">4K</span>
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
                <button className="btn-watchlist"><span>+</span> Add to Watchlist</button>
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
    </div>
  );
}