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

  // 🔥 NAYA: OTP ke liye states
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/register", {
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

      console.log("Registration successful:", data);
      
      // 🔥 NAYA: Redirect karne ki jagah OTP screen dikhao
      setSuccess("Account created! Please check your email for the OTP.");
      setIsOtpSent(true); 
      setLoading(false);

    } catch (error) {
      console.error("Signup error:", error);
      setError("Unable to connect to server. Make sure Flask is running.");
      setLoading(false);
    }
  };

  // 🔥 NAYA: OTP Verify karne ka function
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!otp) {
      setError("Please enter the 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/verify-otp", {
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
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error) {
      setError("Unable to connect to server.");
      setLoading(false);
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
            {isOtpSent 
              ? "We've sent a 6-digit code to your email." 
              : "Join MovieVerse and discover movies you'll love."}
          </p>

          {/* 🔥 NAYA: Agar OTP nahi bheja hai toh Signup form, warna OTP form */}
          {!isOtpSent ? (
            <form onSubmit={handleSignup}>
              {/* USERNAME */}
              <div className="signup-input-group">
                <label>Username</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">👤</span>
                  <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>

              {/* EMAIL */}
              <div className="signup-input-group">
                <label>Email</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">✉</span>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              {/* PASSWORD */}
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

              {/* CONFIRM PASSWORD */}
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
            /* 🔥 NAYA: OTP VERIFICATION FORM */
            <form onSubmit={handleVerifyOtp}>
              <div className="signup-input-group">
                <label>Enter 6-Digit OTP</label>
                <div className="signup-input-wrapper">
                  <span className="signup-input-icon">🔑</span>
                  <input 
                    type="text" 
                    placeholder="e.g. 123456" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    maxLength="6"
                  />
                </div>
              </div>

              {error && <div className="signup-error">{error}</div>}
              {success && <div className="signup-success">{success}</div>}

              <button type="submit" className="signup-button" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
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