import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar({ onOpenSearch }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // User details fetch logic
  let storedUserId = localStorage.getItem("user_id");
  let storedUsername = localStorage.getItem("username");

  if (!storedUserId) {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        storedUserId = payload.user_id || payload.id || payload.sub;
        if (!storedUsername) {
          storedUsername = payload.username;
        }
      } catch (err) {
        console.error("JWT Decode error:", err);
      }
    }
  }

  const currentUserId = storedUserId;
  const currentUsername = storedUsername || "User";

  // 🌟 FIX 1: Click outside logic ko safe banaya taaki toggle ke sath conflict na ho
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    // 'mousedown' ki jagah 'click' use kiya hai
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    setIsDropdownOpen(false);
    navigate("/login");
  };

  // 🌟 FIX 2: Explicit Toggle function with stopPropagation
  const handleToggleDropdown = (e) => {
    e.stopPropagation(); // Event bubble hoke document click ko trigger na kare
    console.log("PROFILE ICON CLICKED SUCCESSFULLY!"); 
    setIsDropdownOpen((prev) => !prev);
  };

  return (
    <header className="home-header">
      
      <Link to="/home" className="logo" style={{ textDecoration: "none" }}>
        MOVIE<span>VERSE</span>
      </Link>

      <div className="header-actions">
        <Link to="/home" className="nav-action-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: "none" }}>
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
          </svg>
          Explore
        </Link>

        {/* 🔍 Search Button */}
        <button 
          className="icon-btn" 
          onClick={onOpenSearch}
          title="Search Movies & Users"
          type="button"
        >
          <svg style={{ pointerEvents: "none" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>

        {/* 🔔 Notification Icon */}
        <a href="#" className="icon-btn notification" onClick={(e) => e.preventDefault()}>
          <svg style={{ pointerEvents: "none" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="badge">88</span>
        </a>

        {/* 👤 Profile Icon & Dropdown Menu Container */}
        <div className="profile-menu-container" ref={dropdownRef}>
          <button 
            type="button"
            className={`profile-circle ${isDropdownOpen ? "active" : ""}`}
            onClick={handleToggleDropdown}
            style={{ border: "none", outline: "none", cursor: "pointer" }}
          >
            <svg style={{ pointerEvents: "none" }} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="profile-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-user-header">
                <p className="user-greeting">Signed in as</p>
                <p className="user-name">@{currentUsername}</p>
              </div>

              <div className="dropdown-divider"></div>

              <Link 
                to={currentUserId ? `/profile/${currentUserId}` : "/login"} 
                className="dropdown-item" 
                onClick={() => setIsDropdownOpen(false)}
              >
                <span className="dropdown-icon">👤</span>
                <span>My Profile</span>
              </Link>

              <Link 
                to="/monthly-review" 
                className="dropdown-item" 
                onClick={() => setIsDropdownOpen(false)}
              >
                <span className="dropdown-icon">📅</span>
                <span>Monthly Movie Review</span>
              </Link>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item logout-btn" onClick={handleLogout} type="button">
                <span className="dropdown-icon">🚪</span>
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}