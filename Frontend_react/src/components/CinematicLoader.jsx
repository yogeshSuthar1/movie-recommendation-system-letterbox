import React from "react";
import "../styles/loader.css"; // Loader ki CSS yahan link karenge

export default function CinematicLoader() {
  return (
    <div className="cinematic-loader-container">
      <div className="cinematic-spinner"></div>
      <p className="loader-text">Loading Cinematic Experience...</p>
    </div>
  );
}