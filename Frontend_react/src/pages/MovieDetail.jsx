import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  getMovieDetail, 
  toggleReviewLike, 
  postReview, 
  getMovieReviews, 
  addToWatchlist, 
  getUserCollections, 
  createCollection, 
  addMovieToCollection,
  getMovieTrailerKey
} from "../services/homeService";
import SearchModal from "../components/SearchModal";
import Navbar from "../components/Navbar";
import "../styles/movieDetail.css";
import CinematicLoader from "../components/CinematicLoader";

export default function MovieDetail() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reviewInput, setReviewInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWatchlistAdded, setIsWatchlistAdded] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [visibleReviews, setVisibleReviews] = useState(3);
  const [reviews, setReviews] = useState([]);

  const [showColModal, setShowColModal] = useState(false);
  const [userCollections, setUserCollections] = useState([]);
  const [newColTitle, setNewColTitle] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);

  const [activeCommentReviewId, setActiveCommentReviewId] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false); 
  const [sortBy, setSortBy] = useState("recent"); 
  const [revealedSpoilers, setRevealedSpoilers] = useState({}); 

  // 🌟 TRAILER MODAL STATES
  const [trailerKey, setTrailerKey] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  // ✈️ SHARE MOVIE STATES
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUsername, setShareUsername] = useState("");
  const [shareMessage, setShareMessage] = useState("Hey, check out this movie! I think you'll love it.");
  const [shareStatus, setShareStatus] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // All users state

  const handleOpenCollectionModal = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      alert("Please login first!");
      return;
    }
    const cols = await getUserCollections(userId);
    setUserCollections(cols);
    setShowColModal(true);
  };

  const reviewSectionRef = useRef(null);
  const currentUsername = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "U";
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2 && nameParts[0] && nameParts[1]) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return nameParts[0] ? nameParts[0][0].toUpperCase() : "U";
  };

  const handleAddToExisting = async (collectionId) => {
    const res = await addMovieToCollection(collectionId, id);
    alert(res.message);
    if (res.success) setShowColModal(false);
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newColTitle.trim()) return;
    const success = await createCollection(newColTitle, "");
    if (success) {
      setNewColTitle("");
      setCreatingNew(false);
      const userId = localStorage.getItem("user_id");
      const cols = await getUserCollections(userId);
      setUserCollections(cols);
    }
  };

  // 🚀 Fetch Users for Suggestions
  useEffect(() => {
    if (showShareModal && token) {
      fetch("http://127.0.0.1:5000/users", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setAllUsers(data.users || []))
      .catch(err => console.log("Failed to load users", err));
    }
  }, [showShareModal, token]);

  const fetchTrailer = async (movieTitle, releaseYear) => {
    try {
      const videoId = await getMovieTrailerKey(movieTitle, releaseYear);
      if (videoId) {
        setTrailerKey(videoId);
        setIsTrailerOpen(true);
      } else {
        alert("Trailer not found on YouTube for this movie!");
      }
    } catch (err) {
      console.error("Trailer fetch error:", err);
      alert("Unable to fetch trailer at the moment.");
    }
  };

  const handleShareMovie = async () => {
    if (!shareUsername.trim()) {
      setShareStatus({ type: "error", msg: "Please enter a username!" });
      return;
    }
    
    setShareStatus({ type: "loading", msg: "Sending..." });
    try {
      const res = await fetch("http://127.0.0.1:5000/share/movie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: shareUsername,
          movie_id: id,
          message: shareMessage
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setShareStatus({ type: "success", msg: data.message });
        setTimeout(() => {
          setShowShareModal(false);
          setShareStatus(null);
          setShareUsername("");
          setShareMessage("Hey, check out this movie! I think you'll love it.");
        }, 2000);
      } else {
        setShareStatus({ type: "error", msg: data.error });
      }
    } catch (err) {
      setShareStatus({ type: "error", msg: "Network Error! Is Flask running?" });
    }
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
    const result = await postReview(id, reviewInput, userRating, isSpoiler); 
    
    if (result) {
      const freshReviews = await getMovieReviews(id || 1000001);
      if (freshReviews && freshReviews.reviews) {
        setReviews(freshReviews.reviews);
      }
      setReviewInput(""); 
      setUserRating(0); 
      setIsSpoiler(false);
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
      const updatedReviews = reviews.map(r => {
        if (r.review_id === reviewId) {
          return { ...r, is_liked: result.liked, likes: result.likes_count };
        }
        return r;
      });
      setReviews(updatedReviews);
    }
  };

  const hasReviewed = reviews.some(review => review.username === currentUsername);

  const handleWatchedClick = () => {
    if (!hasReviewed && reviewSectionRef.current) {
      reviewSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === "liked") {
      return (b.likes || 0) - (a.likes || 0);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (loading) return <CinematicLoader/>;
  if (!movie) return <h1 style={{ color: "red", textAlign: "center", marginTop: "20%" }}>❌ Movie Not Found or API Failed! (Check Console)</h1>;

  const avg = Number(movie.avg_rating) || 0;
  const ratingDistribution = [
    { stars: 5, percentage: Math.min(100, Math.max(5, Math.round((avg / 5) * 70))) },
    { stars: 4, percentage: Math.min(100, Math.max(5, Math.round((avg / 5) * 20))) },
    { stars: 3, percentage: Math.min(100, Math.max(5, Math.round((avg / 5) * 8))) },
    { stars: 2, percentage: 2 },
    { stars: 1, percentage: 1 },
  ];

  return (
    <div className="movie-detail-page">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* 🌟 WIDE CINEMATIC BACKDROP HERO */}
      <div className="md-backdrop-hero" style={{ backgroundImage: `url(${movie.backdrop_url || movie.poster_url})` }}>
        <div className="md-backdrop-overlay"></div>

        <div className="md-center-play-btn" onClick={() => fetchTrailer(movie.title, movie.release_year)}>
          <div className="play-icon-circle">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px" }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        </div>

        <div className="md-backdrop-content">
          <div className="md-backdrop-poster-box">
            <img src={movie.poster_url} alt={movie.title} />
          </div>

          <div className="md-backdrop-info" style={{ width: '100%' }}>
            
            {/* 🚀 Sleek Top Row: Title + Meta on Left, Share on Right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <div className="md-meta-top">
                  <span>Movie</span> • <span>{movie.release_year}</span> • <span>{movie.runtime_minutes || "120"} mins</span> • <span>Directed by {movie.director || "Unknown"}</span>
                </div>
                <h1 className="md-backdrop-title" style={{ marginTop: '5px' }}>{movie.title}</h1>
              </div>

              {/* 🚀 PREMIUM SHARE BUTTON (Top Right) */}
              <button 
                onClick={() => setShowShareModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '8px 16px', borderRadius: '30px', color: '#fff',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)', marginTop: '5px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(155, 92, 255, 0.2)'; e.currentTarget.style.borderColor='rgba(155, 92, 255, 0.5)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor='rgba(255, 255, 255, 0.15)'; }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                <span style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.5px" }}>Share</span>
              </button>
            </div>
            
            <div className="md-genres-hero" style={{ marginTop: '10px' }}>
              {movie.genres?.map(g => <span key={g} className="genre-pill">{g}</span>)}
            </div>

            {/* 🚀 LIBRARY ACTION BUTTONS (SVGs Only) */}
            <div className="md-backdrop-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
              
              <button 
                className={hasReviewed ? "btn-watched" : "btn-watchlist"}
                onClick={handleWatchedClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: hasReviewed ? "#1db954" : "rgba(255, 255, 255, 0.12)",
                  color: hasReviewed ? "#000" : "#fff",
                  borderColor: hasReviewed ? "transparent" : "rgba(255, 255, 255, 0.25)",
                  cursor: hasReviewed ? "default" : "pointer",
                  padding: '10px 20px', borderRadius: '8px', fontWeight: '600'
                }}
              >
                {hasReviewed ? 
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : 
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                }
                {hasReviewed ? "Watched" : "Mark as Watched"}
              </button>

              <button 
                className="btn-secondary-action" 
                onClick={handleOpenCollectionModal}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                Collections
              </button>
              
              <button 
                className="btn-secondary-action" 
                onClick={handleAddToWatchlist}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  background: isWatchlistAdded ? 'rgba(29, 185, 84, 0.15)' : '', 
                  borderColor: isWatchlistAdded ? '#1db954' : '',
                  color: isWatchlistAdded ? '#1db954' : ''
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill={isWatchlistAdded ? "currentColor" : "none"} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                {isWatchlistAdded ? "Added" : "Watch Later"}
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* 🌟 TRAILER MODAL POPUP */}
      {isTrailerOpen && trailerKey && (
        <div className="trailer-modal-overlay" onClick={() => { setIsTrailerOpen(false); setTrailerKey(null); }}>
          <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-trailer-btn" onClick={() => { setIsTrailerOpen(false); setTrailerKey(null); }}>✕</button>
            <div className="video-responsive">
              <iframe
                width="100%"
                height="480"
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title={`${movie.title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      <div className="md-main-split">
        <div className="md-left-col">
          <section className="md-section">
            <h2>Overview</h2>
            <p className="md-overview-text">{movie.overview}</p>
          </section>

          <section className="md-section">
            <h2>Cast</h2>
            <div className="md-cast-row">
              {movie.cast?.map((actor) => (
                <Link 
                  to={`/actor/${encodeURIComponent(actor.name || actor)}`} 
                  key={actor.id || actor} 
                  className="cast-card"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="cast-avatar">{getInitials(actor.name)}</div>
                  <h4 className="cast-name">{actor.name}</h4>
                  <p className="cast-role">{actor.role}</p>
                </Link>
              ))}
            </div>
          </section>

          <hr className="md-divider" />

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
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', fontSize: '13px', marginTop: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isSpoiler} 
                  onChange={(e) => setIsSpoiler(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ffcc00" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                This review contains spoilers
              </label>

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

          <section className="md-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>User Reviews</h2>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ background: '#1a1a22', color: '#fff', padding: '8px 12px', border: '1px solid #333', borderRadius: '6px', outline: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                <option value="recent">Most Recent</option>
                <option value="liked">Most Liked</option>
              </select>
            </div>

            <div className="reviews-list">
              {sortedReviews.slice(0, visibleReviews).map((review, index) => {
                const isHiddenSpoiler = Boolean(review.is_spoiler) && !revealedSpoilers[review.review_id];
                
                return (
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
                    
                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                      <p 
                        className="ur-text" 
                        onClick={() => {
                          if (isHiddenSpoiler) {
                            setRevealedSpoilers(prev => ({ ...prev, [review.review_id]: true }));
                          }
                        }}
                        style={{
                          filter: isHiddenSpoiler ? "blur(8px)" : "none",
                          cursor: isHiddenSpoiler ? "pointer" : "text",
                          userSelect: isHiddenSpoiler ? "none" : "auto",
                          transition: "filter 0.3s ease",
                          margin: 0,
                          padding: isHiddenSpoiler ? "10px 0" : "0"
                        }}
                      >
                        {review.review_text}
                      </p>
                      
                      {isHiddenSpoiler && (
                        <div 
                          onClick={() => setRevealedSpoilers(prev => ({ ...prev, [review.review_id]: true }))}
                          style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(26, 26, 34, 0.3)',
                            cursor: 'pointer', borderRadius: '8px', zIndex: 2
                          }}
                        >
                          <span style={{
                            background: 'rgba(255, 77, 77, 0.15)', color: '#ff4d4d',
                            padding: '8px 18px', borderRadius: '24px', fontSize: '13px',
                            fontWeight: '600', border: '1px solid rgba(255, 77, 77, 0.3)',
                            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '8px'
                          }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            Reveal Spoilers
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="review-actions" style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
                      <button 
                        className={`like-btn ${review.is_liked ? 'liked' : ''}`}
                        onClick={() => handleLikeClick(review.review_id, index)}
                        style={{ background: 'transparent', border: 'none', color: review.is_liked ? '#ff4757' : '#aaa', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill={review.is_liked ? "currentColor" : "none"} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span className="like-count" style={{ color: '#aaa' }}>{review.likes || 0}</span>
                      </button>

                      <button 
                        className="comment-toggle-btn"
                        onClick={() => setActiveCommentReviewId(activeCommentReviewId === review.review_id ? null : review.review_id)}
                        style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        {review.comments?.length || 0} Comments
                      </button>
                    </div>

                    {activeCommentReviewId === review.review_id && (
                      <div className="review-comments-section" style={{ 
                        marginTop: '15px', 
                        padding: '16px', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '8px', 
                        borderLeft: '3px solid #9b5cff' 
                      }}>
                        
                        <div className="existing-comments" style={{ marginBottom: '16px' }}>
                          {review.comments && review.comments.length === 0 && (
                            <p style={{ color: '#888', fontSize: '13.5px', textAlign: 'center', margin: '10px 0' }}>No comments yet. Be the first to reply!</p>
                          )}
                          {review.comments && review.comments.map((cmt) => (
                            <div key={cmt.comment_id} style={{ 
                              background: '#16161d', 
                              padding: '14px 16px', 
                              borderRadius: '8px', 
                              marginBottom: '10px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'flex-start',
                              border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                              <div style={{ fontSize: '14.5px', color: '#e0e0e0', lineHeight: '1.5', paddingRight: '15px' }}>
                                <strong style={{ color: '#9b5cff', marginRight: '6px' }}>{cmt.username}</strong>
                                {cmt.comment_text}
                              </div>
                              
                              {cmt.username === currentUsername && (
                                <button 
                                  onClick={async () => {
                                    const res = await fetch(`http://127.0.0.1:5000/comments/${cmt.comment_id}`, {
                                      method: 'DELETE',
                                      headers: { 
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                       },
                                      body: JSON.stringify({ user_id: localStorage.getItem("user_id") ,comment_text: commentInput})
                                    });
                                    if (res.ok) {
                                      const freshReviews = await getMovieReviews(id);
                                      if (freshReviews && freshReviews.reviews) {
                                        setReviews(freshReviews.reviews);
                                      }
                                    }
                                  }}
                                  style={{ 
                                    background: 'rgba(255, 77, 77, 0.1)', 
                                    border: 'none', 
                                    color: '#ff4d4d', 
                                    cursor: 'pointer', 
                                    fontSize: '12px', 
                                    fontWeight: '600',
                                    padding: '6px 12px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          <input 
                            type="text" 
                            placeholder="Write a reply..." 
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            style={{ 
                              flex: 1, 
                              padding: '12px 16px', 
                              background: '#111', 
                              border: '1px solid #333', 
                              color: '#fff', 
                              borderRadius: '8px', 
                              fontSize: '14.5px',
                              outline: 'none'
                            }}
                          />
                          <button 
                            onClick={async () => {
                              if (!commentInput.trim()) return;
                              
                              const res = await fetch(`http://127.0.0.1:5000/reviews/${review.review_id}/comments`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  user_id: localStorage.getItem("user_id"), 
                                  comment_text: commentInput 
                                })
                              });

                              if (res.ok) {
                                setCommentInput("");
                                const freshReviews = await getMovieReviews(id);
                                if (freshReviews && freshReviews.reviews) {
                                  setReviews(freshReviews.reviews);
                                }
                              }
                            }}
                            style={{ 
                              padding: '0 24px', 
                              background: '#9b5cff', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: '8px', 
                              cursor: 'pointer', 
                              fontSize: '14.5px', 
                              fontWeight: '600',
                              height: '45px'
                            }}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

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
              <p><strong>Directed By:</strong> {movie.director || "Unknown"}</p>
              <p><strong>Status:</strong> {Number(movie.release_year) > 2026 ? "Upcoming" : "Released"}</p>
              <p><strong>Original Language:</strong> {movie.language || "English"}</p>
              <p><strong>Runtime:</strong> {movie.runtime_minutes || "120"} mins</p>
              <p><strong>Production:</strong> {movie.production || "Independent"}</p>
            </div>
          </div>
        </div>
      </div>

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
        </div>
      </div>

      {showColModal && (
        <div className="modal-overlay" onClick={() => setShowColModal(false)}>
          <div className="col-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add to Collection</h3>
            
            <div className="col-list-scroll">
              {userCollections.length === 0 ? (
                <p className="no-col-text" style={{ color: "#888", textAlign: "center", padding: "10px" }}>No collections found. Create one below!</p>
              ) : (
                userCollections.map(col => (
                  <div key={col.collection_id} className="col-select-item" onClick={() => handleAddToExisting(col.collection_id)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                      {col.title}
                    </span>
                    <button className="add-plus-btn">+</button>
                  </div>
                ))
              )}
            </div>

            {!creatingNew ? (
              <button className="btn-create-toggle" onClick={() => setCreatingNew(true)}>+ Create New Collection</button>
            ) : (
              <form onSubmit={handleCreateAndAdd} className="quick-create-form">
                <input 
                  type="text" 
                  placeholder="Collection Name..." 
                  value={newColTitle} 
                  onChange={(e) => setNewColTitle(e.target.value)}
                  autoFocus
                />
                <div className="qc-actions">
                  <button type="submit" className="qc-save">Save & Create</button>
                  <button type="button" className="qc-cancel" onClick={() => setCreatingNew(false)}>Cancel</button>
                </div>
              </form>
            )}

            <button className="close-modal-x" onClick={() => setShowColModal(false)}>✕</button>
          </div>
        </div>
      )}

      {/* 🚀 JADU WALA MODAL: SHARE MOVIE POPUP */}
      {showShareModal && (
        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowShareModal(false)}>
          <div className="col-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "420px", background: "#111116", border: "1px solid rgba(155, 92, 255, 0.2)", borderRadius: "16px" }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px", display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="#9b5cff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              Share "{movie.title}"
            </h3>

            <div style={{ padding: "10px 0" }}>
              <label style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "8px", fontWeight: "700", letterSpacing: "0.5px" }}>FRIEND'S EXACT USERNAME</label>
              <input 
                type="text" 
                value={shareUsername}
                onChange={(e) => setShareUsername(e.target.value)}
                style={{ width: "93%", padding: "14px", borderRadius: "8px", background: "#1a1a24", border: "1px solid #333", color: "#fff", outline: "none", fontSize: "14px" }}
                placeholder="e.g. op_yogi"
                autoFocus
              />

              {/* 🚀 SUGGESTED FRIENDS CHIPS (INSTA STYLE) */}
              {allUsers.length > 0 && (
                <div style={{ marginTop: "12px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Suggested Friends</span>
                  
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '10px 0', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {allUsers
                      .filter(u => u.username.toLowerCase().includes(shareUsername.toLowerCase()))
                      .map(u => (
                      <div 
                        key={u.username}
                        onClick={() => setShareUsername(u.username)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: shareUsername === u.username ? 'rgba(155, 92, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${shareUsername === u.username ? '#9b5cff' : 'rgba(255, 255, 255, 0.1)'}`,
                          padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                          color: shareUsername === u.username ? '#fff' : '#aaa', fontSize: '13px', whiteSpace: 'nowrap', transition: '0.2s'
                        }}
                      >
                        {/* Chhota Avatar */}
                        <div style={{ width: '22px', height: '22px', background: shareUsername === u.username ? '#9b5cff' : '#333', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        {u.username}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label style={{ fontSize: "12px", color: "#888", display: "block", marginTop: "10px", marginBottom: "8px", fontWeight: "700", letterSpacing: "0.5px" }}>PERSONAL MESSAGE (OPTIONAL)</label>
              <textarea 
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                style={{ width: "93%", padding: "14px", borderRadius: "8px", background: "#1a1a24", border: "1px solid #333", color: "#fff", height: "80px", resize: "none", outline: "none", fontSize: "14px" }}
              />
            </div>

            {shareStatus && (
              <div style={{ 
                padding: "12px", 
                borderRadius: "8px", 
                background: shareStatus.type === "error" ? "rgba(255, 71, 87, 0.1)" : "rgba(46, 213, 115, 0.1)", 
                color: shareStatus.type === "error" ? "#ff4757" : "#2ed573", 
                fontSize: "14px", 
                marginTop: "10px",
                border: `1px solid ${shareStatus.type === "error" ? "rgba(255, 71, 87, 0.3)" : "rgba(46, 213, 115, 0.3)"}`,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {shareStatus.type === "success" && <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                {shareStatus.type === "error" && <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
                {shareStatus.msg}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "25px" }}>
              <button 
                onClick={() => setShowShareModal(false)} 
                style={{ padding: "10px 20px", background: "transparent", color: "#aaa", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleShareMovie} 
                disabled={shareStatus?.type === "loading"}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: "10px 24px", background: "#9b5cff", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", opacity: shareStatus?.type === "loading" ? 0.7 : 1 }}
              >
                {shareStatus?.type === "loading" ? "Sending..." : (
                  <><span>Send</span><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></>
                )}
              </button>
            </div>

            <button className="close-modal-x" onClick={() => setShowShareModal(false)}>✕</button>
          </div>
        </div>
      )}

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}