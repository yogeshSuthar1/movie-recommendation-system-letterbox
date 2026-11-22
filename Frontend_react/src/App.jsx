// File Path: Frontend_react/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Signup from "./pages/signup";
import GenreSelection from "./pages/GenreSelection";
import Home from "./pages/Home";
import MovieDetail from "./pages/MovieDetail";
import Profile from "./pages/profile";
import MonthlyReview from "./pages/MonthlyReview";
import Watchlist from "./pages/Watchlist";
import ActorProfile from "./pages/ActorProfile";
import ExploreMovies from "./pages/ExploreMovies";
import Chat from "./components/Chat";
import Login from "./pages/login";

// 🚀 Checks both token existence AND JWT expiration timestamp
const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return false;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      return false;
    }
    return true;
  } catch (e) {
    localStorage.clear();
    return false;
  }
};

const ProtectedRoute = ({ children }) => {
  if (!isTokenValid()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* PRIVATE ROUTES */}
        <Route path="/genres" element={<ProtectedRoute><GenreSelection /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/movie/:id?" element={<ProtectedRoute><MovieDetail /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/monthly-review" element={<ProtectedRoute><MonthlyReview /></ProtectedRoute>} />
        <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
        <Route path="/actor/:actorName" element={<ProtectedRoute><ActorProfile /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><ExploreMovies /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

        {/* 🚀 404 Catch-All Route */}
        <Route path="*" element={<Navigate to={isTokenValid() ? "/home" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;