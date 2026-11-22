// File Path: Frontend_react/src/pages/signup.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
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

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields"); return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match"); return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      
      setSuccess("Account created! Please check your email for the OTP.");
      setIsOtpSent(true); 
    } catch (error) {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    if (!otp) {
      setError("Please enter the 6-digit OTP"); setLoading(false); return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, otp: otp })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      setSuccess("Email verified successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setError("Unable to connect to server.");
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(""); setSuccess("Sending new OTP...");
    try {
      const res = await fetch(`${API_BASE_URL}/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("New OTP sent!");
    } catch (e) {
      setError(e.message || "Failed to resend");
      setSuccess("");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-left">
        <PosterAnimation />
      </div>

      <div className="signup-right">
        <div className="signup-card">
          <h1>{isOtpSent ? "Verify Email" : "Create Account"}</h1>
          <p className="signup-subtitle">
            {isOtpSent ? "We've sent a 6-digit code to your email." : "Join MovieVerse and discover movies you'll love."}
          </p>

          {!isOtpSent ? (
            <form onSubmit={handleSignup}>
              <div className="signup-input-group">
                <label>Username</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">👤</span>
                  <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>

              <div className="signup-input-group">
                <label>Email</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">✉</span>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="signup-input-group">
                <label>Password</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">🔒</span>
                  <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="signup-eye-button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "◉" : "◌"}
                  </button>
                </div>
              </div>

              <div className="signup-input-group">
                <label>Confirm Password</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">🔒</span>
                  <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <button type="button" className="signup-eye-button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? "◉" : "◌"}
                  </button>
                </div>
              </div>

              {error && <div className="signup-error">{error}</div>}
              {success && <div className="signup-success">{success}</div>}

              <button type="submit" className="signup-button" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="signup-input-group">
                <label>Enter 6-Digit OTP</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">🔑</span>
                  <input type="text" placeholder="e.g. 123456" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength="6" />
                </div>
              </div>

              {error && <div className="signup-error">{error}</div>}
              {success && <div className="signup-success">{success}</div>}

              <button type="submit" className="signup-button" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              
              <div style={{ textAlign: "center", marginTop: "15px" }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  style={{ background: "none", border: "none", fontSize: "12px", color: "#888", cursor: "pointer", textDecoration: "underline" }}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <div className="login-text">
            <span>Already have an account?</span>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}