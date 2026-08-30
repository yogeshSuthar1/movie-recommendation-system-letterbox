import React from "react";
import Signup from "./pages/Signup";
import GenreSelection from "./pages/GenreSelection";
import Home from "./pages/home";
import MovieDetail from './pages/MovieDetail';
import Profile from './pages/profile';
import MonthlyReview from './pages/MonthlyReview';
import Watchlist from './pages/Watchlist';
import ActorProfile from "./pages/ActorProfile";


import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login";


function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route path="/signup" element={<Signup />} />

        <Route path="/genres" element={<GenreSelection />} />

        <Route
          path="/home"
          element={<Home />}
        />

        <Route path="/movie" element={<MovieDetail />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/monthly-review" element={<MonthlyReview />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/actor/:actorName" element={<ActorProfile />} />
        

      </Routes>

    </BrowserRouter>

  );

}

export default App;