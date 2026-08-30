import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getActorMovies } from "../services/homeService";
import "../styles/searchModal.css"; // ya apni koi bhi styling file

export default function ActorProfile() {
  const { actorName } = useParams();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchMovies = async () => {
      setLoading(true);
      const data = await getActorMovies(actorName);
      setMovies(data);
      setLoading(false);
    };
    fetchMovies();
  }, [actorName]);

  return (
    <div style={{ background: "#0b0b0e", minHeight: "100vh", color: "#fff", paddingBottom: "50px" }}>
      <Navbar />
      
      <div style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "30px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #3a1a6e, #9b5cff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold" }}>
            {actorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px" }}>{actorName}</h1>
            <p style={{ color: "#888", margin: "5px 0 0 0" }}>Featured Movies & Filmography</p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#888" }}>Loading movies...</p>
        ) : movies.length === 0 ? (
          <p style={{ color: "#888" }}>No movies found for this actor.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px" }}>
            {movies.map(movie => (
              <Link to={`/movie/${movie.movie_id}`} key={movie.movie_id} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "#15151a", borderRadius: "10px", overflow: "hidden", transition: "0.2s", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <img src={movie.poster_url} alt={movie.title} style={{ width: "100%", height: "260px", objectFit: "cover" }} />
                  <div style={{ padding: "12px" }}>
                    <h4 style={{ margin: "0 0 5px 0", fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{movie.title}</h4>
                    <span style={{ fontSize: "13px", color: "#888" }}>{movie.release_year} • ⭐ {movie.avg_rating || "N/A"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}