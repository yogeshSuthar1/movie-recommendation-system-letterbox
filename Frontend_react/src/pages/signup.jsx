import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import PosterAnimation from "../components/PosterAnimation";
import "../styles/signup.css";

export default function Signup() {

  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  const handleSignup = async (e) => {

    e.preventDefault();

    setError("");
    setSuccess("");


    // Required fields
    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }


    // Password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }


    // Password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }


    setLoading(true);


    try {

      const response = await fetch(
        "http://127.0.0.1:5000/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            username: username,
            email: email,
            password: password
          })
        }
      );


      const data = await response.json();


      if (!response.ok) {

        setError(
          data.error || "Registration failed"
        );

        return;
      }


      console.log(
        "Registration successful:",
        data
      );


      setSuccess(
        "Account created successfully! Redirecting to login..."
      );


      // Go to login after successful registration
      setTimeout(() => {
        navigate("/login");
      }, 1500);


    } catch (error) {

      console.error(
        "Signup error:",
        error
      );

      setError(
        "Unable to connect to server. Make sure Flask is running."
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="signup-page">

      {/* LEFT SIDE */}

      <div className="signup-left">
        <PosterAnimation />
      </div>


      {/* RIGHT SIDE */}

      <div className="signup-right">

        <div className="signup-card">

          <h1>Create Account</h1>

          <p className="signup-subtitle">
            Join MovieVerse and discover movies you'll love.
          </p>


          <form onSubmit={handleSignup}>


            {/* USERNAME */}

            <div className="signup-input-group">

              <label>Username</label>

              <div className="signup-input-wrapper">

                <span className="signup-input-icon">
                  👤
                </span>

                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                />

              </div>

            </div>


            {/* EMAIL */}

            <div className="signup-input-group">

              <label>Email</label>

              <div className="signup-input-wrapper">

                <span className="signup-input-icon">
                  ✉
                </span>

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="signup-input-group">

              <label>Password</label>

              <div className="signup-input-wrapper">

                <span className="signup-input-icon">
                  🔒
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

                <button
                  type="button"
                  className="signup-eye-button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "◉" : "◌"}
                </button>

              </div>

            </div>


            {/* CONFIRM PASSWORD */}

            <div className="signup-input-group">

              <label>Confirm Password</label>

              <div className="signup-input-wrapper">

                <span className="signup-input-icon">
                  🔒
                </span>

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                />

                <button
                  type="button"
                  className="signup-eye-button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  {showConfirmPassword
                    ? "◉"
                    : "◌"}
                </button>

              </div>

            </div>


            {/* ERROR */}

            {error && (
              <div className="signup-error">
                {error}
              </div>
            )}


            {/* SUCCESS */}

            {success && (
              <div className="signup-success">
                {success}
              </div>
            )}


            {/* SIGN UP BUTTON */}

            <button
              type="submit"
              className="signup-button"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>


          {/* LOGIN LINK */}

          <div className="login-text">

            <span>
              Already have an account?
            </span>

            <Link to="/login">
              Login
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}