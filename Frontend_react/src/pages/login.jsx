import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import PosterAnimation from "../components/PosterAnimation";
import "../styles/login.css";

export default function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);

    try {

      const response = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Save JWT token
      localStorage.setItem("token", data.token);

      // Save logged-in user
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      console.log("Login successful:", data.user);

      // Temporary redirect
     navigate("/genres");

    } catch (error) {

      console.error("Login error:", error);

      setError(
        "Unable to connect to server. Make sure Flask is running."
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="login-page">

      {/* LEFT SIDE */}
      <div className="login-left">
        <PosterAnimation />
      </div>


      {/* RIGHT SIDE */}
      <div className="login-right">

        <div className="login-card">

          <h1>Welcome Back</h1>

          <p className="login-subtitle">
            Discover movies you'll love.
          </p>


          <form onSubmit={handleLogin}>

            {/* EMAIL */}
            <div className="input-group">

              <label>Email</label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ✉
                </span>

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

              </div>

            </div>


            {/* PASSWORD */}
            <div className="input-group">

              <label>Password</label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "◉" : "◌"}
                </button>

              </div>

            </div>


            {/* ERROR */}
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}


            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>


          {/* SIGN UP */}
          <div className="signup-text">

            <span>
              Don't have an account?
            </span>

            <Link to="/signup">
              Sign Up
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}