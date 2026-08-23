import React from "react";
import Signup from "./pages/Signup";
import GenreSelection from "./pages/GenreSelection";
import Home from "./pages/Home";

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

      </Routes>

    </BrowserRouter>

  );

}

export default App;