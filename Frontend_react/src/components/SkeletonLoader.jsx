// File Path: Frontend_react/src/components/SkeletonLoader.jsx
import React from 'react';
import '../styles/skeleton.css';

// Yeh Netflix jaisa row loader hai Home page ke liye
export const MovieRowSkeleton = ({ count = 5 }) => {
  return (
    <div className="skeleton-row-container">
      <div className="skeleton-title shimmer"></div>
      <div className="skeleton-row">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="skeleton-card shimmer"></div>
        ))}
      </div>
    </div>
  );
};

// Yeh grid loader hai Explore page ke liye
export const MovieGridSkeleton = ({ count = 10 }) => {
  return (
    <div className="skeleton-grid">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="skeleton-grid-card">
          <div className="skeleton-poster shimmer"></div>
          <div className="skeleton-text short shimmer"></div>
          <div className="skeleton-text shorter shimmer"></div>
        </div>
      ))}
    </div>
  );
};

// Yeh Hero banner ka loader hai
export const HeroSkeleton = () => {
  return (
    <div className="skeleton-hero">
      <div className="skeleton-hero-content">
        <div className="skeleton-badge shimmer"></div>
        <div className="skeleton-hero-title shimmer"></div>
        <div className="skeleton-hero-meta shimmer"></div>
        <div className="skeleton-hero-desc shimmer"></div>
        <div className="skeleton-hero-desc shorter shimmer"></div>
        <div className="skeleton-hero-actions shimmer"></div>
      </div>
      <div className="skeleton-hero-poster shimmer"></div>
    </div>
  );
};