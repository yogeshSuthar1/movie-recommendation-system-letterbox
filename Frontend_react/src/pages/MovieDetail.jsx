import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getMovieDetail, toggleReviewLike, postReview, getMovieReviews, addToWatchlist } from "../services/homeService";
import SearchModal from "../components/SearchModal";
import Navbar from "../components/Navbar";
import "../styles/movieDetail.css";

export default function MovieDetail() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // Review & Search States
  const [reviewInput, setReviewInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Watchlist state
  const [isWatchlistAdded, setIsWatchlistAdded] = useState(false);

  // Rating & Display States
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [visibleReviews, setVisibleReviews] = useState(3);
  const [reviews, setReviews] = useState([]);

  // 🌟 NAYA: Auto-scroll ke liye reference aur current user ka data
  const reviewSectionRef = useRef(null);
  const currentUsername = localStorage.getItem("username");

  const ratingDistribution = [
    { stars: 5, percentage: 65 },
    { stars: 4, percentage: 20 },
    { stars: 3, percentage: 10 },
    { stars: 2, percentage: 3 },
    { stars: 1, percentage: 2 },
  ];

  const getInitials = (name) => {
    if (!name) return "";
    const nameParts = name.split(" ");
    return nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      : nameParts[0][0].toUpperCase();
  };

  useEffect(() => {
    window.scrollTo(0, 0); 
    const fetchData = async () => {
      try {
        setLoading(true);
        const movieId = id || 1000001;
        
        const movieData = await getMovieDetail(movieId);
        setMovie(movieData);
        
        const reviewsData = await getMovieReviews(movieId);
        if (reviewsData && reviewsData.reviews) {
          setReviews(reviewsData.reviews);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAddToWatchlist = async () => {
    const success = await addToWatchlist(id);
    if (success) {
      setIsWatchlistAdded(true);
    }
  };

  const handlePostReview = async () => {
    if (!reviewInput.trim() || userRating === 0) {
      alert("Please write a review and give a star rating!"); 
      return; 
    }
    
    setIsSubmitting(true);
    const result = await postReview(id, reviewInput, userRating); 
    
    if (result) {
      const freshReviews = await getMovieReviews(id || 1000001);
      if (freshReviews && freshReviews.reviews) {
        setReviews(freshReviews.reviews);
      }
      setReviewInput(""); 
      setUserRating(0); 
    }
    setIsSubmitting(false);
  };

  const handleMouseMove = (e, index) => {
    const { left, width } = e.target.getBoundingClientRect();
    const percent = (e.clientX - left) / width;
    if (percent < 0.5) setHoverRating(index - 0.5);
    else setHoverRating(index);
  };

  const handleLikeClick = async (reviewId, index) => {
    const result = await toggleReviewLike(reviewId);
    if (result) {
      const updatedReviews = [...reviews];
      updatedReviews[index].is_liked = result.liked;
      updatedReviews[index].likes = result.likes_count;
      setReviews(updatedReviews);
    }
  };

  // 🌟 NAYA: Check karo ki logged-in user ne is movie ko review kiya hai ya nahi
  const hasReviewed = reviews.some(review => review.username === currentUsername);

  const handleWatchedClick = () => {
    if (!hasReviewed && reviewSectionRef.current) {
      // Agar review nahi diya hai, toh smooth scroll karke form par le jao
      reviewSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (loading) return <h1 style={{ color: "white", textAlign: "center", marginTop: "20%" }}>⏳ Loading Cinematic Experience...</h1>;
  if (!movie) return <h1 style={{ color: "red", textAlign: "center", marginTop: "20%" }}>❌ Movie Not Found or API Failed! (Check Console)</h1>;

  return (
    <div className="movie-detail-page">
      
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* ================= HERO SECTION ================= */}
      <div className="md-hero">
        <div className="md-hero-bg" style={{ backgroundImage: `url(${movie.poster_url})` }}></div>
        <div className="md-hero-overlay"></div>

        <div className="md-hero-content">
          <div className="md-poster-wrapper">
            <img src={movie.poster_url} alt={movie.title} className="md-poster" />
          </div>

          <div className="md-info-right">
            <div className="md-meta-top">
              <span>Movie</span> • <span>{movie.release_year}</span> • <span>{movie.runtime_minutes || "120"} mins</span> • <span>Directed by {movie.director}</span>
            </div>
            <h1 className="md-title">{movie.title}</h1>
            
            <div className="md-genres-hero">
              {movie.genres?.map(g => <span key={g} className="genre-pill">{g}</span>)}
            </div>

            <div className="md-actions">
              
              {/* 🌟 NAYA: Smart "Watched" Button */}
              <button 
                className={hasReviewed ? "btn-watched" : "btn-watchlist"}
                onClick={handleWatchedClick}
                style={{
                  background: hasReviewed ? "#1db954" : "rgba(255, 255, 255, 0.1)",
                  color: hasReviewed ? "#000" : "#fff",
                  borderColor: hasReviewed ? "transparent" : "rgba(255, 255, 255, 0.3)",
                  cursor: hasReviewed ? "default" : "pointer"
                }}
              >
                {hasReviewed ? "✔ Watched" : "Mark as Watched"}
              </button>
              
              {/* Watchlist Button */}
              <button 
                className="btn-watchlist" 
                onClick={handleAddToWatchlist}
                style={{ 
                  background: isWatchlistAdded ? 'rgba(29, 185, 84, 0.2)' : '', 
                  borderColor: isWatchlistAdded ? '#1db954' : '',
                  color: isWatchlistAdded ? '#1db954' : ''
                }}
              >
                {isWatchlistAdded ? "✔ Added to Watchlist" : "🔖 Add to Watchlist"}
              </button>
              
            </div>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT (SPLIT LAYOUT) ================= */}
      <div className="md-main-split">
        
        {/* LEFT COLUMN */}
        <div className="md-left-col">
          <section className="md-section">
            <h2>Overview</h2>
            <p className="md-overview-text">{movie.overview}</p>
          </section>

          <section className="md-section">
            <h2>Cast</h2>
            <div className="md-cast-row">
              {movie.cast?.map((actor) => (
                <div key={actor.id} className="cast-card">
                  <div className="cast-avatar">{getInitials(actor.name)}</div>
                  <h4 className="cast-name">{actor.name}</h4>
                  <p className="cast-role">{actor.role}</p>
                </div>
              ))}
            </div>
          </section>

          <hr className="md-divider" />

          {/* 🌟 NAYA: Ref attached to scroll target */}
          <section className="md-section" ref={reviewSectionRef}>
            <div className="review-header-flex">
              <h2>Your Review</h2>
              <div className="huge-star-container">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const currentDisplayRating = hoverRating || userRating;
                  const isFull = currentDisplayRating >= starIndex;
                  const isHalf = currentDisplayRating === starIndex - 0.5;

                  return (
                    <div 
                      key={starIndex}
                      className="star-wrapper"
                      onMouseMove={(e) => handleMouseMove(e, starIndex)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(hoverRating)}
                    >
                      <span className={`star-icon ${isFull ? "active" : isHalf ? "half-active" : ""}`}>★</span>
                    </div>
                  );
                })}
                <span className="rating-display-text">{userRating > 0 ? `${userRating}/5` : ""}</span>
              </div>
            </div>

            <div className="write-review-box">
              <textarea 
                className="review-textarea" 
                placeholder="Write your review here..."
                rows="4"
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value)}
              ></textarea>
              <div className="review-btn-row">
                <button 
                  className="btn-submit-review" 
                  onClick={handlePostReview}
                  disabled={isSubmitting || !reviewInput.trim()}
                  style={{ opacity: (!reviewInput.trim() || isSubmitting) ? 0.5 : 1, cursor: (!reviewInput.trim() || isSubmitting) ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? "Posting..." : "Post Review"}
                </button>
              </div>
            </div>
          </section>

          {/* ASLI USER REVIEWS */}
          <section className="md-section">
            <h2>User Reviews</h2>
            <div className="reviews-list">
              {reviews.slice(0, visibleReviews).map((review, index) => (
                <div key={review.review_id} className="user-review-card">
                  <div className="ur-header">
                    <div className="ur-avatar">{getInitials(review.username)}</div>
                    <div className="ur-info">
                      <h4>{review.username}</h4>
                      <span className="ur-stars" style={{ color: "#f5c518", fontSize: "14px", letterSpacing: "2px" }}>
                        {"★".repeat(Math.floor(review.rating || 0))} 
                        {(review.rating || 0) % 1 !== 0 ? "½" : ""}
                      </span>
                    </div>
                  </div>
                  <p className="ur-text">{review.review_text}</p>
                  
                  {/* LIKE BUTTON ZONE */}
                  <div className="review-actions">
                    <button 
                      className={`like-btn ${review.is_liked ? 'liked' : ''}`}
                      onClick={() => handleLikeClick(review.review_id, index)}
                    >
                      {review.is_liked ? '❤️' : '🤍'} 
                      <span className="like-count">{review.likes || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {reviews.length === 0 && (
              <p style={{ color: "#888" }}>No reviews yet. Be the first to review!</p>
            )}

            {visibleReviews < reviews.length && (
              <button className="btn-see-more" onClick={() => setVisibleReviews(reviews.length)}>
                See More
              </button>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: MOVIE DETAILS & RATING GRAPH */}
        <div className="md-right-col">
          <div className="sidebar-card">
            <h3>Rating Distribution</h3>
            <div className="rating-graph-container">
              <div className="rg-avg-score">
                <span className="rg-big-star">★</span>
                <h2>{movie.avg_rating}</h2>
              </div>
              <div className="rg-bars">
                {ratingDistribution.map((item) => (
                  <div key={item.stars} className="rg-row">
                    <span className="rg-star-label">{item.stars} ★</span>
                    <div className="rg-bar-bg">
                      <div className="rg-bar-fill" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                    <span className="rg-percent">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>Movie Details</h3>
            <div className="movie-facts-list">
              <p><strong>Directed By:</strong> {movie.director}</p>
              <p><strong>Status:</strong> Released</p>
              <p><strong>Original Language:</strong> English</p>
              <p><strong>Runtime:</strong> {movie.runtime_minutes} mins</p>
              <p><strong>Production:</strong> Cinematic Studios</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM: MORE LIKE THIS ================= */}
      <div className="md-bottom-full">
        <h2>More Like This</h2>
        <div className="md-recommendation-row">
          {movie.recommendations?.map(rec => (
            <Link to={`/movie/${rec.movie_id}`} key={rec.movie_id} className="ml-poster-card">
              <img src={rec.poster_url} alt={rec.title} />
              <div className="ml-poster-info">
                <h4>{rec.title}</h4>
                <span>⭐ {rec.avg_rating}</span>
              </div>
            </Link>
          ))}
          {movie.recommendations?.length >= 10 && (
            <div className="view-more-card" onClick={() => alert("Navigate to full genre page here!")}>
              <div className="view-more-circle">→</div>
              <span>View More</span>
            </div>
          )}
        </div>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

    </div>
  );
}