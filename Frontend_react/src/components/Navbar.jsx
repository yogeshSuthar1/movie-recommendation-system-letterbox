// File Path: Frontend_react/src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import "../styles/navbar.css";

export default function Navbar({ onOpenSearch }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const rawProfileImage = localStorage.getItem("profile_image");
  const profileImage =
    rawProfileImage && /^https?:\/\//i.test(rawProfileImage) ? rawProfileImage : null;

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  const formatNotifDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
    return `${day}${suffix} ${month}`;
  };

  const formatMessage = (msg) => {
    if (msg.startsWith("@")) {
      const firstSpace = msg.indexOf(" ");
      const uname = msg.substring(1, firstSpace);
      const restOfMsg = msg.substring(firstSpace);
      return (
        <span style={{ color: "#aaa" }}>
          <strong style={{ color: "#fff" }}>{uname}</strong>
          {restOfMsg}
        </span>
      );
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
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (userId && token) {
      fetchNotifications();
    }
  }, [userId, token]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  const handleNotifClick = async () => {
    setShowNotifDropdown(!showNotifDropdown);
    setShowDropdown(false);

    if (!showNotifDropdown && unreadCount > 0) {
      setUnreadCount(0);
      try {
        await fetch(`${API_BASE_URL}/notifications/read`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      } catch (e) {
        console.error("Failed to mark notifications read:", e);
      }
    }
  };

  const handleDeleteNotif = async (e, notifId) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.notification_id !== notifId));
    try {
      await fetch(`${API_BASE_URL}/notifications/${notifId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    <nav className="navbar" ref={navRef}>
      <div className="navbar-logo-container">
        <Link to="/home" className="nexus-logo">
          NEXUS
        </Link>
        <span className="nexus-tagline">| The Cinematic Connection</span>
      </div>

      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Menu"
        aria-expanded={isMobileMenuOpen}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div className={`header-actions ${isMobileMenuOpen ? "mobile-open" : ""}`}>
        {/* 1. Explore */}
        <Link
          to="/explore"
          className="nav-item"
          title="Explore Movies"
          aria-label="Explore Movies"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
          </svg>
          <span className="nav-text">Explore</span>
        </Link>

        {/* 2. Watchlist */}
        <Link
          to="/watchlist"
          className="nav-item"
          title="My Watchlist"
          aria-label="My Watchlist"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="nav-text">Watchlist</span>
        </Link>

        {/* 3. Messages */}
        <Link
          to="/messages"
          className="nav-item"
          title="Messages"
          aria-label="Messages"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="nav-text">Messages</span>
        </Link>

        {/* 4. Search */}
        <button
          type="button"
          onClick={() => {
            onOpenSearch();
            setIsMobileMenuOpen(false);
          }}
          className="nav-item"
          title="Search"
          aria-label="Search"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span className="nav-text">Search</span>
        </button>

        {/* 5. Notifications */}
        <div style={{ position: "relative" }} ref={notifDropdownRef}>
          <button
            type="button"
            onClick={handleNotifClick}
            className="nav-item"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={showNotifDropdown}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="nav-text">Alerts</span>
            {unreadCount > 0 && <span className="notif-dot"></span>}
          </button>

          {showNotifDropdown && (
            <div
              className="custom-dropdown"
              style={{
                width: "360px",
                maxHeight: "480px",
                overflowY: "auto",
                background: "rgba(18, 18, 22, 0.75)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ color: "#fff", fontSize: "16px", letterSpacing: "0.5px" }}>
                  Notifications
                </strong>
              </div>

              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  No new activity.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.notification_id}
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: notif.is_read ? "transparent" : "rgba(255, 255, 255, 0.03)",
                      display: "flex",
                      gap: "14px",
                      alignItems: "flex-start",
                      transition: "0.2s",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#2a2a35",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          color: "#fff",
                          fontWeight: "bold",
                        }}
                      >
                        {notif.message.startsWith("@")
                          ? notif.message.charAt(1).toUpperCase()
                          : "M"}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-2px",
                          right: "-2px",
                          background:
                            notif.type === "like"
                              ? "#ff4757"
                              : notif.type === "comment"
                              ? "#3742fa"
                              : "#2ed573",
                          color: "#fff",
                          width: "15px",
                          height: "15px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid #14141a",
                        }}
                      >
                        {notif.type === "like" ? (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        ) : notif.type === "comment" ? (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                        ) : (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
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
                      type="button"
                      aria-label="Delete notification"
                      onClick={(e) => handleDeleteNotif(e, notif.notification_id)}
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "transparent",
                        border: "none",
                        color: "#444",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ff4757")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
                      title="Delete"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 6. Profile Menu */}
        {userId && (
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifDropdown(false);
              }}
              className="nav-item"
              title="Profile Menu"
              aria-label="Profile Menu"
              aria-expanded={showDropdown}
            >
              <div
                className="profile-circle"
                style={{
                  background: profileImage
                    ? "transparent"
                    : "linear-gradient(135deg, var(--primary-accent), #47b8ff)",
                  overflow: "hidden",
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={username || "Profile"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : username ? (
                  username.charAt(0).toUpperCase()
                ) : (
                  "U"
                )}
              </div>
              <span className="nav-text">Profile</span>
            </button>

            {showDropdown && (
              <div className="custom-dropdown" style={{ width: "210px" }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontSize: "13px",
                    color: "#888",
                  }}
                >
                  Signed in as <strong style={{ color: "#fff" }}>@{username || "user"}</strong>
                </div>
                <Link
                  to={`/profile/${userId}`}
                  onClick={() => {
                    setShowDropdown(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="dropdown-item"
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>My Profile</span>
                </Link>
                <Link
                  to="/monthly-review"
                  onClick={() => {
                    setShowDropdown(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="dropdown-item"
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <span>Monthly Analytics</span>
                </Link>
                <div className="dropdown-divider"></div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="dropdown-item logout-btn"
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}