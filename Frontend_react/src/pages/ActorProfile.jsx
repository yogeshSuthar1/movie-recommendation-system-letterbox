import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getActorMovies } from "../services/homeService";
import Navbar from "../components/Navbar";
import SearchModal from "../components/SearchModal"; // 👈 Import added

export default function Actor() {
  const params = useParams();
  const name = params.name || params.actorName || params.actor || Object.values(params)[0];
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("year");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // 🌟 Search Modal State Added
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const observer = useRef();
  const lastMovieElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
  }, [sortBy, name]);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      const newMovies = await getActorMovies(name, page, sortBy);
      
      if (newMovies.length === 0) {
        setHasMore(false);
      } else {
        setMovies(prevMovies => {
          const existingIds = new Set(prevMovies.map(m => m.movie_id));
          const filtered = newMovies.filter(m => !existingIds.has(m.movie_id));
          return [...prevMovies, ...filtered];
        });
      }
      setLoading(false);
    };
    
    fetchMovies();
  }, [name, page, sortBy]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", paddingBottom: "50px" }}>
      {/* 🌟 Passed onOpenSearch prop */}
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      
      <div style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 20px" }}>
        
        {/* ================= HEADER SECTION ================= */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px", borderBottom: "1px solid #333", paddingBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ 
              width: "80px", height: "80px", borderRadius: "50%", background: "#9b5cff", 
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold" 
            }}>
              {name ? name.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "32px" }}>{name || "Actor Profile"}</h1>
              <p style={{ margin: "5px 0 0 0", color: "#aaa" }}>Featured Movies & Filmography</p>
            </div>
          </div>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ 
              background: "#1a1a22", color: "#fff", padding: "10px 16px", 
              border: "1px solid #333", borderRadius: "8px", outline: "none", cursor: "pointer", fontSize: "14px" 
            }}
          >
            <option value="year">Sort by Release Year</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>

        {/* ================= MOVIES GRID ================= */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "25px" }}>
          {movies.map((movie, index) => {
            const isLastElement = index === movies.length - 1;
            
            return (
              <Link 
                to={`/movie/${movie.movie_id}`} 
                key={`${movie.movie_id}-${index}`} 
                ref={isLastElement ? lastMovieElementRef : null}
                style={{ 
                  textDecoration: "none", color: "inherit", background: "#111", 
                  borderRadius: "10px", overflow: "hidden", transition: "transform 0.2s" 
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <img src={movie.poster_url} alt={movie.title} style={{ width: "100%", height: "300px", objectFit: "cover" }} />
                <div style={{ padding: "12px" }}>
                  <h4 style={{ margin: "0 0 5px 0", fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {movie.title}
                  </h4>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#aaa" }}>
                    <span>{movie.release_year || "N/A"}</span>
                    <span style={{ color: "#f5c518" }}>⭐ {movie.avg_rating > 0 ? movie.avg_rating : "N/A"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "30px", color: "#9b5cff", fontSize: "16px", fontWeight: "bold" }}>
            ⏳ Loading more movies...
          </div>
        )}
        
        {!hasMore && movies.length > 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "#555", fontSize: "14px" }}>
            You've reached the end of the filmography.
          </div>
        )}

      </div>

      {/* 🌟 Search Modal Rendered at the Bottom */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}