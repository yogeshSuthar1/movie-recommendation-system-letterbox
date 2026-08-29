import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getUserProfile } from "../services/homeService";
import SearchModal from "../components/SearchModal";
import Navbar from "../components/Navbar";
import "../styles/profile.css"; 

export default function Profile() {
  const { id } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Naye States for Tabs and Filters
  const [activeTab, setActiveTab] = useState("reviews");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProfile = async () => {
      setLoading(true);
      const data = await getUserProfile(id);
      setProfileData(data);
      setLoading(false);
    };
    fetchProfile();
  }, [id]);

  const getInitials = (name) => {
    if (!name) return "";
    return name.substring(0, 2).toUpperCase();
  };

  // 🌟 SMART FILTER LOGIC (0-1, 1-3, 3-4, 4-5)
  const getFilteredReviews = () => {
    if (!profileData || !profileData.reviews) return [];
    return profileData.reviews.filter(review => {
      const r = review.rating || 0;
      if (activeFilter === "All") return true;
      if (activeFilter === "0-1 Star") return r >= 0 && r <= 1;
      if (activeFilter === "1-3 Stars") return r > 1 && r <= 3;
      if (activeFilter === "3-4 Stars") return r > 3 && r <= 4;
      if (activeFilter === "4-5 Stars") return r > 4 && r <= 5;
      return true;
    });
  };

  // Badge Name Logic based on Rating
  const getRatingBadge = (rating) => {
    if (rating >= 4.5) return { text: "Perfection", class: "badge-perfect" };
    if (rating >= 3.5) return { text: "Go For It", class: "badge-good" };
    if (rating >= 2) return { text: "Timepass", class: "badge-avg" };
    return { text: "Skip", class: "badge-bad" };
  };

  if (loading) return <h1 className="loading-text">Loading Profile...</h1>;
  if (!profileData || !profileData.user) return <h1 className="error-text">❌ User Not Found</h1>;

  const filteredReviews = getFilteredReviews();

  return (
    <div className="profile-page-wrapper">
      {/* HEADER */}
        <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* MAIN LAYOUT */}
      <div className="profile-layout">
        
        {/* LEFT SIDEBAR: PROFILE CARD */}
        <aside className="profile-sidebar">
          <div className="profile-card">
            <div className="pc-avatar">{getInitials(profileData.user.username)}</div>
            <h2 className="pc-fullname">{profileData.user.username}</h2>
            <span className="pc-username">@{profileData.user.username.toLowerCase().replace(/\s/g, '_')}</span>
            
            <div className="pc-stats-row">
              <div className="pc-stat-box">
                <h3>{profileData.total_reviews}</h3>
                <p>Reviews<br/>Posted</p>
              </div>
              <div className="pc-stat-box">
                <h3>0</h3>
                <p>Public<br/>Collections</p>
              </div>
            </div>
            
            <div className="pc-footer-info">
              <p>👥 0 Followers • 0 Following</p>
              <p>📅 Joined recently</p>
            </div>
            
            <button className="btn-edit-profile">Edit Profile</button>
          </div>
        </aside>

        {/* RIGHT AREA: CONTENT */}
        <main className="profile-main-area">
          
          {/* TABS */}
          <div className="profile-tabs-container">
            <button 
              className={`ptab ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              📝 Reviews
            </button>
            <button 
              className={`ptab ${activeTab === "collections" ? "active" : ""}`}
              onClick={() => setActiveTab("collections")}
            >
              📁 Collections
            </button>
          </div>

          {activeTab === "reviews" && (
            <>
              {/* FILTERS */}
              <div className="profile-filters">
                {["All", "0-1 Star", "1-3 Stars", "3-4 Stars", "4-5 Stars"].map(filter => (
                  <button 
                    key={filter}
                    className={`pfilter-btn ${activeFilter === filter ? "active" : ""}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* REVIEWS LIST */}
              <div className="profile-reviews-list">
                {filteredReviews.length === 0 ? (
                  <p className="no-reviews-msg">No reviews found for this filter.</p>
                ) : (
                  filteredReviews.map((review) => {
                    const badge = getRatingBadge(review.rating);
                    return (
                      <div key={review.review_id} className="pr-list-card">
                        <Link to={`/movie/${review.movie_id}`} className="pr-poster-link">
                          <img src={review.poster_url} alt={review.title} className="pr-list-poster" />
                        </Link>
                        
                        <div className="pr-list-content">
                          <div className="pr-list-header">
                            <Link to={`/movie/${review.movie_id}`} className="pr-title">{review.title}</Link>
                            <span className={`pr-badge ${badge.class}`}>{badge.text}</span>
                          </div>
                          
                          <div className="pr-meta">
                            Movie • {new Date(review.created_at).getFullYear() || "2024"} • 
                            <span className="pr-star-display">
                              {" ★".repeat(Math.floor(review.rating || 0))}
                              {(review.rating || 0) % 1 !== 0 ? " ½" : ""}
                            </span>
                          </div>
                          
                          <p className="pr-review-text">{review.review_text}</p>
                          
                          <div className="pr-actions">
                            <span className="pr-action-btn">❤️ {review.likes || 0}</span>
                            <span className="pr-action-btn">💬 0</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === "collections" && (
            <div className="collections-placeholder">
              <p>No collections created yet.</p>
            </div>
          )}
        </main>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}