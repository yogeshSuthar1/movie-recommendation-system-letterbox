import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ onOpenSearch }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");
  const username = localStorage.getItem("username");
  
  const [hoveredTab, setHoveredTab] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login"); // Ya jo bhi tera login route ho
  };

  const getNavItemStyle = (tabName) => ({
    display: "flex",
    alignItems: "center",
    gap: hoveredTab === tabName ? "8px" : "0px",
    background: hoveredTab === tabName ? "rgba(155, 92, 255, 0.15)" : "transparent",
    padding: "8px 14px",
    borderRadius: "10px",
    color: hoveredTab === tabName ? "#fff" : "#aaa",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    border: hoveredTab === tabName ? "1px solid rgba(155, 92, 255, 0.3)" : "1px solid transparent",
    transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
  });

  const getTextStyle = (tabName) => ({
    maxWidth: hoveredTab === tabName ? "100px" : "0px",
    opacity: hoveredTab === tabName ? 1 : 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
  });

  return (
    <nav className="navbar" style={{ 
      display: "flex", justifyContent: "space-between", alignItems: "center", 
      padding: "16px 50px", background: "#0a0a0f", borderBottom: "1px solid rgba(255,255,255,0.06)",
      position: "sticky", top: 0, zIndex: 1000 
    }}>
      {/* Logo */}
      <Link to="/home" style={{ fontSize: "24px", fontWeight: "800", color: "#fff", textDecoration: "none", letterSpacing: "1px" }}>
        MOVIE<span style={{ color: "#9b5cff" }}>VERSE</span>
      </Link>

      {/* Right Navigation Icons */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        
        {/* Explore */}
        <Link 
          to="/home" 
          style={getNavItemStyle("explore")}
          onMouseEnter={() => setHoveredTab("explore")}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          <span style={getTextStyle("explore")}>Explore</span>
        </Link>

        {/* Watchlist */}
        <Link 
          to="/watchlist" 
          style={getNavItemStyle("watchlist")}
          onMouseEnter={() => setHoveredTab("watchlist")}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          <span style={getTextStyle("watchlist")}>Watchlist</span>
        </Link>

        {/* Search */}
        <button 
          onClick={onOpenSearch} 
          style={{ ...getNavItemStyle("search"), background: hoveredTab === "search" ? "rgba(155, 92, 255, 0.15)" : "transparent", border: hoveredTab === "search" ? "1px solid rgba(155, 92, 255, 0.3)" : "1px solid transparent" }}
          onMouseEnter={() => setHoveredTab("search")}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span style={getTextStyle("search")}>Search</span>
        </button>

        {/* Notifications */}
        <div 
          style={{ ...getNavItemStyle("notifications"), position: "relative" }}
          onMouseEnter={() => setHoveredTab("notifications")}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span style={getTextStyle("notifications")}>Alerts</span>
          <span style={{ position: "absolute", top: "6px", right: "6px", width: "7px", height: "7px", background: "#ff4757", borderRadius: "50%" }}></span>
        </div>

        {/* Profile Dropdown Container */}
        {userId && (
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <div 
              onClick={() => setShowDropdown(!showDropdown)}
              style={getNavItemStyle("profile")}
              onMouseEnter={() => setHoveredTab("profile")}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <div style={{ 
                width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, #9b5cff, #47b8ff)",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "12px", flexShrink: 0
              }}>
                {username ? username.charAt(0).toUpperCase() : "U"}
              </div>
              <span style={getTextStyle("profile")}>Profile</span>
            </div>

            {/* 🌟 DROPDOWN MENU */}
            {showDropdown && (
              <div style={{
                position: "absolute",
                right: 0,
                top: "45px",
                width: "200px",
                background: "#14141a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                overflow: "hidden",
                zIndex: 1100,
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "13px", color: "#888" }}>
                  Signed in as <strong style={{ color: "#fff" }}>@{username || "user"}</strong>
                </div>

                <Link 
                  to={`/profile/${userId}`}
                  onClick={() => setShowDropdown(false)}
                  style={{ padding: "12px 16px", color: "#ccc", textDecoration: "none", fontSize: "14px", transition: "0.2s", display: "flex", alignItems: "center", gap: "10px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(155, 92, 255, 0.1)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ccc"; }}
                >
                  👤 My Profile
                </Link>

                <Link 
                  to={`/monthly-review`}
                  onClick={() => {
                    setShowDropdown(false);
                    // Agar analytics tab par direct jaana ho toh state pass kar sakte ho ya profile khol ke analytics click karwa sakte ho
                  }}
                  style={{ padding: "12px 16px", color: "#ccc", textDecoration: "none", fontSize: "14px", transition: "0.2s", display: "flex", alignItems: "center", gap: "10px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(155, 92, 255, 0.1)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ccc"; }}
                >
                  📊 Monthly Analytics
                </Link>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }}></div>

                <button 
                  onClick={handleLogout}
                  style={{ padding: "12px 16px", background: "transparent", border: "none", color: "#ff4757", textAlign: "left", fontSize: "14px", cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", gap: "10px", width: "100%" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 71, 87, 0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
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