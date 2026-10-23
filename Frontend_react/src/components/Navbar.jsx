import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/navbar.css"; 

export default function Navbar({ onOpenSearch }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token"); 
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef(null);

  // 🚀 INBOX STATES (NEW)
  const [inbox, setInbox] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const inboxDropdownRef = useRef(null);

  const formatNotifDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const suffix = (day % 10 === 1 && day !== 11) ? 'st' :
                   (day % 10 === 2 && day !== 12) ? 'nd' :
                   (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
    return `${day}${suffix} ${month}`;
  };

  const formatMessage = (msg) => {
    if (msg.startsWith('@')) {
      const firstSpace = msg.indexOf(' ');
      const username = msg.substring(1, firstSpace);
      const restOfMsg = msg.substring(firstSpace);
      return <span style={{ color: "#aaa" }}><strong style={{ color: "#fff" }}>{username}</strong>{restOfMsg}</span>;
    }
    return <span style={{ color: "#aaa" }}>{msg}</span>;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      // 🚀 INBOX CLICK OUTSIDE LOGIC
      if (inboxDropdownRef.current && !inboxDropdownRef.current.contains(event.target)) {
        setShowInbox(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (userId && token) {
      fetchNotifications();
      fetchInbox(); // 🚀 FETCH INBOX ON LOAD
    }
  }, [userId, token]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/notifications", {
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        }
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  // 🚀 FETCH INBOX API FUNCTION
  const fetchInbox = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/inbox", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInbox(data.inbox || []);
      }
    } catch (e) {
      console.error("Failed to fetch inbox:", e);
    }
  };

  const handleNotifClick = async () => {
    setShowNotifDropdown(!showNotifDropdown);
    setShowDropdown(false);
    setShowInbox(false); // Close other dropdowns

    if (!showNotifDropdown && unreadCount > 0) {
      setUnreadCount(0); 
      try {
        await fetch("http://127.0.0.1:5000/notifications/read", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          }
        });
        setNotifications((prev) => prev.map(n => ({ ...n, is_read: 1 })));
      } catch (e) {
        console.error("Failed to mark notifications read:", e);
      }
    }
  };

  const handleDeleteNotif = async (e, notifId) => {
    e.stopPropagation(); 
    setNotifications((prev) => prev.filter((n) => n.notification_id !== notifId));
    try {
      await fetch(`http://127.0.0.1:5000/notifications/${notifId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      {/* 🚀 PREMIUM NEXUS LOGO */}
      <div className="navbar-logo-container">
        <Link to="/home" className="nexus-logo">NEXUS</Link>
        <span className="nexus-tagline">| The Cinematic Connection</span>
      </div>

      {/* Right Navigation Icons */}
      <div className="header-actions">
        
        {/* Explore */}
        <Link to="/explore" className="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          <span className="nav-text">Explore</span>
        </Link>

        {/* Watchlist */}
        <Link to="/watchlist" className="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          <span className="nav-text">Watchlist</span>
        </Link>

        {/* Messages */}
        <Link to="/messages" className="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="nav-text">Messages</span>
        </Link>
        
        {/* Search */}
        <button onClick={onOpenSearch} className="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span className="nav-text">Search</span>
        </button>

        {/* 📩 INBOX / MESSAGES (NEW) */}
        <div style={{ position: "relative" }} ref={inboxDropdownRef}>
          <div onClick={() => {
            setShowInbox(!showInbox);
            setShowNotifDropdown(false);
            setShowDropdown(false);
          }} className="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span className="nav-text">Inbox</span>
            {inbox.length > 0 && <span className="notif-dot" style={{ background: "#47b8ff" }}></span>}
          </div>

          {showInbox && (
            <div className="custom-dropdown" style={{ 
              width: "380px", maxHeight: "480px", overflowY: "auto",
              background: "rgba(18, 18, 22, 0.75)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }}>
              
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#fff", fontSize: "16px", letterSpacing: "0.5px" }}>Shared With You</strong>
              </div>

              {inbox.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#666", fontSize: "14px" }}>
                  Your inbox is empty. No movies shared yet.
                </div>
              ) : (
                inbox.map((msg) => (
                  <Link 
                    to={`/movie/${msg.movie_id}`} 
                    key={msg.share_id} 
                    onClick={() => setShowInbox(false)}
                    style={{
                      padding: "16px 20px", 
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: msg.is_read ? "transparent" : "rgba(71, 184, 255, 0.05)",
                      display: "flex", gap: "14px", alignItems: "center", transition: "0.2s",
                      textDecoration: "none"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = msg.is_read ? "transparent" : "rgba(71, 184, 255, 0.05)"}
                  >
                    <img src={msg.poster_url} alt={msg.title} style={{ width: "45px", height: "68px", borderRadius: "6px", objectFit: "cover", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }} />
                    <div style={{ flex: 1, paddingRight: "10px" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "12.5px", color: "#47b8ff", fontWeight: "600" }}>
                        @{msg.sender_name} shared a movie
                      </p>
                      <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", color: "#fff" }}>{msg.title}</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#aaa", fontStyle: "italic", lineHeight: "1.4" }}>
                        "{msg.message}"
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        {/* 🔔 NOTIFICATIONS */}
        <div style={{ position: "relative" }} ref={notifDropdownRef}>
          <div onClick={handleNotifClick} className="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span className="nav-text">Alerts</span>
            {unreadCount > 0 && <span className="notif-dot"></span>}
          </div>

          {/* 🔥 NOTIFICATIONS DROPDOWN */}
          {showNotifDropdown && (
            <div className="custom-dropdown" style={{ 
              width: "360px", maxHeight: "480px", overflowY: "auto",
              background: "rgba(18, 18, 22, 0.75)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }}>
              
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#fff", fontSize: "16px", letterSpacing: "0.5px" }}>Notifications</strong>
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#666", fontSize: "14px" }}>
                  No new activity.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.notification_id} style={{
                    padding: "16px 20px", 
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: notif.is_read ? "transparent" : "rgba(255, 255, 255, 0.03)",
                    display: "flex", gap: "14px", alignItems: "flex-start", transition: "0.2s",
                    position: "relative"
                  }}>
                    
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        background: "#2a2a35", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", color: "#fff", fontWeight: "bold"
                      }}>
                        {notif.message.startsWith('@') ? notif.message.charAt(1).toUpperCase() : 'M'}
                      </div>
                      
                      <div style={{
                        position: "absolute", bottom: "-2px", right: "-2px",
                        background: notif.type === 'like' ? '#ff4757' : notif.type === 'comment' ? '#3742fa' : '#2ed573',
                        width: "14px", height: "14px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px",
                        border: "2px solid #14141a"
                      }}>
                        {notif.type === 'like' ? '❤' : notif.type === 'comment' ? '💬' : '👤'}
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, paddingRight: "16px" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px", lineHeight: "1.4" }}>
                        {formatMessage(notif.message)}
                      </p>
                      <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>
                        {formatNotifDate(notif.created_at)}
                      </span>
                    </div>

                    <button 
                      onClick={(e) => handleDeleteNotif(e, notif.notification_id)}
                      style={{
                        position: "absolute", top: "16px", right: "16px",
                        background: "transparent", border: "none", color: "#444",
                        fontSize: "14px", cursor: "pointer", padding: "4px", transition: "0.2s"
                      }}
                      onMouseEnter={(e) => e.target.style.color = "#ff4757"}
                      onMouseLeave={(e) => e.target.style.color = "#444"}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 👤 PROFILE DROPDOWN */}
        {userId && (
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <div 
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifDropdown(false);
                setShowInbox(false); // Close Inbox 
              }}
              className="nav-item"
            >
              <div className="profile-circle">
                {username ? username.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="nav-text">Profile</span>
            </div>

            {showDropdown && (
              <div className="custom-dropdown" style={{ width: "200px" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "13px", color: "#888" }}>
                  Signed in as <strong style={{ color: "#fff" }}>@{username || "user"}</strong>
                </div>

                <Link 
                  to={`/profile/${userId}`}
                  onClick={() => setShowDropdown(false)}
                  className="dropdown-item"
                >
                  👤 My Profile
                </Link>

                <Link 
                  to={`/monthly-review`}
                  onClick={() => setShowDropdown(false)}
                  className="dropdown-item"
                >
                  📊 Monthly Analytics
                </Link>

                <div className="dropdown-divider"></div>

                <button onClick={handleLogout} className="dropdown-item logout-btn">
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}