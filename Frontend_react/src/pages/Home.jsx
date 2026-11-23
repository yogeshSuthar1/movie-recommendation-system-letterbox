// File Path: Frontend_react/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
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
        const res = await fetch(`${API_BASE_URL}/home`, {
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
          
          fetch(`${API_BASE_URL}/warmup`)
            .then(() => console.log("ML Models Warm-up Complete!"))
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
      alert("Added to your watchlist successfully!");
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
                  <div
                    className="hero-badge"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2c.5 3.5-1.5 5.5-3.5 7.5C6.5 11.5 5 13.5 5 16a7 7 0 0 0 14 0c0-3.5-2.5-6.5-4.5-8.5-.5 1.5-1.5 2.5-2.5 2.5 0-2.5 0-5.5 0-8z" />
                    </svg>
                    <span>Featured Release</span>
                  </div>
                  <h1 className="hero-title">{featured.title}</h1>
                  <div className="hero-meta">
                    <span
                      className="rating"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {featured.avg_rating ? Number(featured.avg_rating).toFixed(1) : "N/A"}
                    </span>
                    <span className="year">{featured.release_year || "Unknown"}</span>
                    <span className="quality">HD</span>
                  </div>
                  <p className="hero-overview">
                    {featured.overview 
                      ? (featured.overview.length > 200 ? featured.overview.substring(0, 200) + "..." : featured.overview) 
                      : "No description available for this movie."}
                  </p>
                  <div className="hero-actions">
                    <Link
                      to={`/movie/${featured.movie_id}`}
                      className="btn-play"
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}
                    >
                      <span className="play-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <polygon points="6 3 20 12 6 21 6 3" />
                        </svg>
                      </span>
                      <span>View Details</span>
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
              <MovieRow title="HIDDEN GEMS" movies={homeData.hidden_gems} seeMoreLink="/explore?sort_by=Top Rated" />
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