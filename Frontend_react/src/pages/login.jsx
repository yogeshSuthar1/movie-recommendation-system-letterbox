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
  const [successMsg, setSuccessMsg] = useState(""); // 🌟 NAYA: Login success msg ke liye

  // 🔥 NAYA: Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Email, 2 = OTP + New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        // 🔥 Agar is_verified false hai toh backend 403 bhejega jo yahan error mein aayega
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user_id", data.user.user_id);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.has_genres) {
        navigate("/home"); 
      } else {
        navigate("/genres"); 
      }

    } catch (error) {
      setError("Unable to connect to server. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NAYA: Step 1 - Send OTP for Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError(""); setForgotSuccess(""); setForgotLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Failed to send OTP");
        return;
      }
      setForgotSuccess("OTP sent to your email!");
      setForgotStep(2); // Move to Step 2 (Enter OTP)
    } catch (err) {
      setForgotError("Server connection error.");
    } finally {
      setForgotLoading(false);
    }
  };

  // 🔥 NAYA: Step 2 - Verify OTP and Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError(""); setForgotSuccess(""); setForgotLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/reset-password-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Invalid OTP or request.");
        return;
      }
      // Reset successful! Close modal and show success on login screen
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail(""); setForgotOtp(""); setNewPassword("");
      setSuccessMsg("Password reset successfully! Please log in with your new password.");
    } catch (err) {
      setForgotError("Server connection error.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <PosterAnimation />
      </div>

      <div className="login-right">
        <div className="login-card">
          <h1>Welcome Back</h1>
          <p className="login-subtitle">Discover movies you'll love.</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Email</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label>Password</label>
                {/* 🔥 NAYA: Forgot Password Link */}
                <span 
                  style={{ fontSize: "12px", color: "#9b5cff", cursor: "pointer", fontWeight: "600" }} 
                  onClick={() => setShowForgotModal(true)}
                >
                  Forgot password?
                </span>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="eye-button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "◉" : "◌"}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}
            {successMsg && <div className="login-success" style={{ color: "#00e676", fontSize: "14px", marginBottom: "15px", textAlign: "center" }}>{successMsg}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="signup-text">
            <span>Don't have an account?</span>
            <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </div>

      {/* 🔥 NAYA: FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content" style={{ background: "#0f0f13", padding: "30px", borderRadius: "12px", width: "90%", maxWidth: "400px", border: "1px solid rgba(155,92,255,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", margin: 0 }}>Reset Password</h2>
              <button onClick={() => { setShowForgotModal(false); setForgotStep(1); }} style={{ background: "none", border: "none", color: "#888", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotPassword}>
                <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "20px" }}>Enter your registered email address and we'll send you a 6-digit OTP to reset your password.</p>
                <div className="input-group">
                  <div className="input-wrapper">
                    <span className="input-icon">✉</span>
                    <input type="email" placeholder="Enter your email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                  </div>
                </div>
                {forgotError && <div className="login-error">{forgotError}</div>}
                {forgotSuccess && <div className="login-success" style={{ color: "#00e676", fontSize: "14px", marginTop: "10px" }}>{forgotSuccess}</div>}
                <button type="submit" className="login-button" style={{ marginTop: "15px" }} disabled={forgotLoading}>
                  {forgotLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "20px" }}>Enter the OTP sent to <b>{forgotEmail}</b> and create a new password.</p>
                <div className="input-group">
                  <div className="input-wrapper">
                    <span className="input-icon">🔑</span>
                    <input type="text" placeholder="6-digit OTP" required maxLength="6" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} />
                  </div>
                </div>
                <div className="input-group" style={{ marginTop: "15px" }}>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input type="password" placeholder="New Password" required minLength="6" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                </div>
                {forgotError && <div className="login-error">{forgotError}</div>}
                <button type="submit" className="login-button" style={{ marginTop: "15px" }} disabled={forgotLoading}>
                  {forgotLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}