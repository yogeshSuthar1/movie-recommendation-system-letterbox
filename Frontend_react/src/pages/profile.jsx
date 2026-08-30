import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import SearchModal from "../components/SearchModal";
import Navbar from "../components/Navbar";
import { 
  getUserProfile, 
  getUserAnalytics, 
  getUserCollections, 
  createCollection, 
  getCollectionDetails, 
  toggleFollowUser, 
  getUserFollowStats,
  updateUserProfile,
  getFollowersList, 
  getFollowingList
} from "../services/homeService";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import "../styles/profile.css"; 

export default function Profile() {
  const { id } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [analyticsData, setAnalyticsData] = useState({
    total_hours: 0,
    movies_this_year: 0,
    avg_rating: 0,
    top_genres: [],
    monthly_activity: []
  });
  
  const [collections, setCollections] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Collection Detail Modal States
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionMovies, setCollectionMovies] = useState([]);
  const [isColDetailOpen, setIsColDetailOpen] = useState(false);

  // Edit Profile States (Username & Bio)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");

  // Follow & Stats States
  const loggedInUserId = parseInt(localStorage.getItem("user_id"));
  const isMyProfile = loggedInUserId === parseInt(id);  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });

  const COLORS = ["#9b5cff", "#1db954", "#f5c518", "#ff4757"];
  
  const [activeTab, setActiveTab] = useState("reviews");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState(""); // "followers" ya "following"
  const [followListData, setFollowListData] = useState([]);

  const handleOpenFollowModal = async (type) => {
    setFollowModalType(type);
    setShowFollowModal(true);
    setFollowListData([]); // Purana data clear karne ke liye

    if (type === "followers") {
      const data = await getFollowersList(id);
      setFollowListData(data);
    } else {
      const data = await getFollowingList(id);
      setFollowListData(data);
    }
  };
  
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      setLoading(true);
      const [pData, aData, cData, sData] = await Promise.all([
        getUserProfile(id),
        getUserAnalytics(id),
        getUserCollections(id),
        getUserFollowStats(id)
      ]);
      setProfileData(pData);
      if (aData) setAnalyticsData(aData);
      if (cData) setCollections(cData);
      if (sData) setFollowStats(sData);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const getInitials = (name) => {
    if (!name) return "";
    return name.substring(0, 2).toUpperCase();
  };

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

  const getRatingBadge = (rating) => {
    if (rating >= 4.5) return { text: "Perfection", class: "badge-perfect" };
    if (rating >= 3.5) return { text: "Go For It", class: "badge-good" };
    if (rating >= 2) return { text: "Timepass", class: "badge-avg" };
    return { text: "Skip", class: "badge-bad" };
  };

  const handleOpenEdit = () => {
    setEditUsername(profileData.user.username);
    setEditBio(profileData.user.bio || "");
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); // Page refresh roko
    
    // 🌟 FIX: editBioText ko editBio se replace kar diya hai
    console.log("Saving bio for user:", id, "Bio text:", editBio); 

    try {
      const res = await fetch("http://127.0.0.1:5000/user/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          user_id: id, 
          bio: editBio // 🌟 FIX
        })
      });

      if (res.ok) {
        // Success!
        setProfileData((prev) => ({
          ...prev,
          user: { ...prev.user, bio: editBio, username: editUsername } // 🌟 FIX
        }));
        alert("Profile is saved! 🎉");
        setShowEditModal(false);
      } else {
        const errData = await res.json();
        alert(`Backend Error: ${errData.error || 'Failed to save bio'}`);
      }
    } catch (error) {
      console.error("Save profile crash:", error);
      alert("Code crash ho gaya! F12 daba ke Console tab mein red error check kar.");
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const success = await createCollection(newTitle, newDesc);
    if (success) {
      setNewTitle("");
      setNewDesc("");
      setShowCreateModal(false);
      const data = await getUserCollections(id);
      setCollections(data);
    }
  };

  const handleCardClick = async (colId) => {
    const data = await getCollectionDetails(colId);
    if (data) {
      setSelectedCollection(data.collection);
      setCollectionMovies(data.movies);
      setIsColDetailOpen(true);
    }
  };

  const handleFollowToggle = async () => {
    const res = await toggleFollowUser(id);
    if (res && res.status) {
      setIsFollowing(res.status === "followed");
      const sData = await getUserFollowStats(id);
      setFollowStats(sData);
    }
  };

  if (loading) return <h1 className="loading-text">Loading Profile...</h1>;
  if (!profileData || !profileData.user) return <h1 className="error-text">❌ User Not Found</h1>;

  const filteredReviews = getFilteredReviews();

  return (
    <div className="profile-page-wrapper">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-card">
            <div className="pc-avatar">{getInitials(profileData.user.username)}</div>
            <h2 className="pc-fullname">{profileData.user.username}</h2>
            <span className="pc-username">@{profileData.user.username.toLowerCase().replace(/\s/g, '_')}</span>
            
            {/* Bio Display */}
            {profileData.user.bio && (
              <p style={{ color: "#aaa", fontSize: "13px", textAlign: "center", margin: "10px 0", fontStyle: "italic" }}>
                "{profileData.user.bio}"
              </p>
            )}
            
            <div className="pc-stats-row">
              <div className="pc-stat-box">
                <h3>{profileData.total_reviews}</h3>
                <p>Reviews<br/>Posted</p>
              </div>
              <div className="pc-stat-box">
                <h3>{collections.length}</h3>
                <p>Public<br/>Collections</p>
              </div>
            </div>
            
            <div className="pc-footer-info">
              <p style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                👥 
                <span 
                  onClick={() => handleOpenFollowModal("followers")} 
                  style={{ cursor: "pointer", color: "#9b5cff", fontWeight: "600" }}
                >
                  {followStats.followers_count} Followers
                </span> 
                • 
                <span 
                  onClick={() => handleOpenFollowModal("following")} 
                  style={{ cursor: "pointer", color: "#9b5cff", fontWeight: "600" }}
                >
                  {followStats.following_count} Following
                </span>
              </p>
              {profileData.user.bio ? (
                <p style={{ marginTop: "15px", fontSize: "14px", fontStyle: "italic", color: "#ddd", padding: "0 10px", lineHeight: "1.4" }}>
                  "{profileData.user.bio}"
                </p>
              ) : (
                <p style={{ marginTop: "15px", fontSize: "13px", color: "#888" }}>
                  No bio added yet.
                </p>
              )}
            </div>
            
            {isMyProfile ? (
              <button className="btn-edit-profile" onClick={handleOpenEdit}>Edit Profile</button>
            ) : (
              <button 
                className="btn-edit-profile" 
                onClick={handleFollowToggle}
                style={{
                  background: isFollowing ? "transparent" : "#9b5cff",
                  color: "#fff",
                  border: isFollowing ? "1px solid rgba(255,255,255,0.2)" : "none",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
            
          </div>
        </aside>

        <main className="profile-main-area">
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
            <button 
              className={`ptab ${activeTab === "analytics" ? "active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              📊 Analytics
            </button>
          </div>

          {activeTab === "reviews" && (
            <>
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
            <div className="collections-container">
              <div className="col-top-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "20px" }}>My Custom Lists</h3>
                {isMyProfile && (
                  <button 
                    className="btn-create-col" 
                    onClick={() => setShowCreateModal(true)}
                    style={{ background: "#9b5cff", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                  >
                    + New Collection
                  </button>
                )}
              </div>

              {showCreateModal && isMyProfile && (
                <form onSubmit={handleCreateCollection} className="create-col-form" style={{ background: "#111", padding: "20px", borderRadius: "12px", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <input 
                    type="text" 
                    placeholder="Collection Name (e.g. Masterpieces)" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "#1a1a20", border: "1px solid #333", color: "#fff", borderRadius: "6px", marginBottom: "10px", outline: "none" }}
                  />
                  <textarea 
                    placeholder="Short description..." 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "#1a1a20", border: "1px solid #333", color: "#fff", borderRadius: "6px", marginBottom: "15px", outline: "none", resize: "none", height: "80px" }}
                  />
                  <div className="form-actions" style={{ display: "flex", gap: "10px" }}>
                    <button type="submit" style={{ background: "#1db954", color: "#000", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Create</button>
                    <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: "transparent", color: "#aaa", border: "1px solid #444", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                  </div>
                </form>
              )}

              <div className="collections-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                {collections.length === 0 ? (
                  <p className="no-reviews-msg" style={{ gridColumn: "1 / -1", textAlign: "center", color: "#888", padding: "40px" }}>No collections found.</p>
                ) : (
                  collections.map(col => (
                    <div 
                      key={col.collection_id} 
                      className="collection-card" 
                      onClick={() => handleCardClick(col.collection_id)}
                      style={{ background: "#111", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "0.2s" }}
                    >
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#fff" }}>{col.title}</h4>
                      <p style={{ margin: "0 0 15px 0", color: "#888", fontSize: "14px" }}>{col.description || "No description provided."}</p>
                      <span className="col-count" style={{ fontSize: "12px", color: "#9b5cff", fontWeight: "600" }}>🎬 {col.movie_count} Movies</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="analytics-dashboard">
              <div className="stat-cards-row">
                <div className="stat-card">
                  <h4>Total Watch Time</h4>
                  <h2>{analyticsData.total_hours} <span>hours</span></h2>
                </div>
                <div className="stat-card">
                  <h4>Movies This Year</h4>
                  <h2>{analyticsData.movies_this_year}</h2>
                </div>
                <div className="stat-card">
                  <h4>Average Rating Given</h4>
                  <h2>{analyticsData.avg_rating} ★</h2>
                </div>
              </div>

              <div className="charts-row">
                <div className="chart-box">
                  <h3>Top Genres</h3>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={analyticsData.top_genres}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {analyticsData.top_genres.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#333", color: "#fff" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-legend">
                    {analyticsData.top_genres.map((g, i) => (
                      <span key={g.name}><span className="dot" style={{ background: COLORS[i] }}></span> {g.name}</span>
                    ))}
                  </div>
                </div>

                <div className="chart-box">
                  <h3>Monthly Watch Activity</h3>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.monthly_activity}>
                        <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888' }} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                          contentStyle={{ backgroundColor: "#111", borderColor: "#333", color: "#fff" }} 
                        />
                        <Bar dataKey="movies" fill="#9b5cff" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* COLLECTION DETAIL POPUP MODAL */}
      {isColDetailOpen && selectedCollection && (
        <div className="modal-overlay" onClick={() => setIsColDetailOpen(false)}>
          <div className="col-modal-content" style={{ maxWidth: "600px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h2>{selectedCollection.title}</h2>
            <p style={{ color: "#888", marginBottom: "20px", fontSize: "14px" }}>{selectedCollection.description || "No description provided."}</p>
            
            <div className="col-list-scroll" style={{ maxHeight: "350px", overflowY: "auto" }}>
              {collectionMovies.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "30px" }}>No movies added in this collection yet.</p>
              ) : (
                collectionMovies.map(movie => (
                  <Link to={`/movie/${movie.movie_id}`} key={movie.movie_id} className="col-select-item" style={{ textDecoration: "none", color: "#fff", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <img src={movie.poster_url} alt={movie.title} style={{ width: "45px", height: "65px", objectFit: "cover", borderRadius: "6px" }} />
                      <div>
                        <h4 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>{movie.title}</h4>
                        <span style={{ fontSize: "13px", color: "#aaa" }}>{movie.release_year} • ⭐ {movie.avg_rating || "N/A"}</span>
                      </div>
                    </div>
                    <span style={{ color: "#9b5cff", fontSize: "14px", fontWeight: "600" }}>View →</span>
                  </Link>
                ))
              )}
            </div>

            <button className="close-modal-x" onClick={() => setIsColDetailOpen(false)}>✕</button>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL (Username & Bio) */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="col-modal-content" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            
            <form onSubmit={handleSaveProfile}>
              <label style={{ fontSize: "13px", color: "#aaa", display: "block", marginBottom: "5px" }}>Username</label>
              <input 
                type="text" 
                value={editUsername} 
                onChange={(e) => setEditUsername(e.target.value)}
                style={{ width: "100%", padding: "12px", background: "#1a1a20", border: "1px solid #444", color: "#fff", borderRadius: "6px", marginBottom: "15px", outline: "none" }}
                autoFocus
              />

              <label style={{ fontSize: "13px", color: "#aaa", display: "block", marginBottom: "5px" }}>Bio</label>
              <textarea 
                value={editBio} 
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell something about yourself..."
                style={{ width: "100%", padding: "12px", background: "#1a1a20", border: "1px solid #444", color: "#fff", borderRadius: "6px", marginBottom: "20px", outline: "none", resize: "none", height: "80px", fontFamily: "inherit" }}
              />
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className="qc-save" style={{ flex: 1, padding: "10px" }}>Save Changes</button>
                <button type="button" className="qc-cancel" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: "10px" }}>Cancel</button>
              </div>
            </form>

            <button className="close-modal-x" onClick={() => setShowEditModal(false)}>✕</button>
          </div>
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING MODAL */}
      {showFollowModal && (
        <div className="modal-overlay" onClick={() => setShowFollowModal(false)}>
          <div className="col-modal-content" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textTransform: "capitalize", marginBottom: "20px" }}>{followModalType}</h3>
            
            <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {followListData.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center" }}>No {followModalType} found.</p>
              ) : (
                followListData.map((user) => (
                  <Link 
                    to={`/profile/${user.user_id}`} 
                    key={user.user_id} 
                    onClick={() => {
                      setShowFollowModal(false);
                      // Page force reload to load new user profile instantly
                      setTimeout(() => window.location.reload(), 100);
                    }}
                    style={{ 
                      display: "flex", alignItems: "center", gap: "15px", 
                      padding: "12px", background: "#1a1a20", borderRadius: "10px", 
                      textDecoration: "none", color: "#fff", transition: "0.2s",
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}
                  >
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #9b5cff, #47b8ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px" }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: "16px", fontWeight: "600" }}>@{user.username}</span>
                  </Link>
                ))
              )}
            </div>

            <button className="close-modal-x" onClick={() => setShowFollowModal(false)}>✕</button>
          </div>
        </div>
      )}

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}