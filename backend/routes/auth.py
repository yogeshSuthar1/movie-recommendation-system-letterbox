# File Path: backend/routes/auth.py
import re
import secrets
import bcrypt
import jwt
import os
import requests
import json
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g, current_app
from flask_mail import Message
from sqlalchemy import text

from backend.database import engine
from backend.config import JWT_SECRET_KEY
from backend.middleware.auth_middleware import token_required
from backend.extensions import mail, limiter

auth_bp = Blueprint("auth", __name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
OTP_MAX_ATTEMPTS = 5
OTP_EXPIRY_MINUTES = 10


def generate_secure_otp():
    """Generates a cryptographically secure 6-digit OTP and its bcrypt hash."""
    raw_otp = f"{secrets.randbelow(900000) + 100000}"
    hashed_otp = bcrypt.hashpw(raw_otp.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    return raw_otp, hashed_otp, expires_at


def send_otp_email(user_email, otp, subject="Your NEXUS Verification Code"):
    email_body = (
        f"Welcome to NEXUS!\n\n"
        f"Your 6-digit verification code is: {otp}\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes.\n\n"
        f"Please don't share this code with anyone."
    )

    # 1. Production (Google Apps Script via HTTPS)
    script_url = os.getenv("EMAIL_SCRIPT_URL")
    script_secret = os.getenv("EMAIL_SCRIPT_SECRET", "")

    if script_url:
        payload = json.dumps({
            "secret": script_secret,
            "to": user_email,
            "subject": subject,
            "body": email_body,
        }).encode("utf-8")

        try:
            # Python 3.11 + eventlet SSL recursion bug se bachne ke liye unpatched urllib use karo
            try:
                import eventlet.patcher
                urllib_req = eventlet.patcher.original("urllib.request")
            except Exception:
                import urllib.request as urllib_req

            req = urllib_req.Request(
                script_url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib_req.urlopen(req, timeout=15) as resp:
                status_code = resp.getcode()
                resp_text = resp.read().decode("utf-8")

            resp_data = json.loads(resp_text) if resp_text else {}
            if status_code == 200 and resp_data.get("ok"):
                return True
            current_app.logger.error(f"Apps Script Mail Error: {status_code} {resp_text}")
            return False
        except Exception as e:
            current_app.logger.error(f"Apps Script Request Error: {e}")
            return False

    # 2. Local Fallback (Purana Gmail SMTP)
    try:
        msg = Message(
            subject,
            sender=current_app.config["MAIL_USERNAME"],
            recipients=[user_email],
        )
        msg.body = email_body
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Mail Error: {e}")
        return False
    email_body = (
        f"Welcome to NEXUS! 🎬\n\n"
        f"Your 6-digit verification code is: {otp}\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes.\n\n"
        f"Please don't share this code with anyone."
    )

    # 1. Production (100% Free Google Apps Script via HTTPS - Render par block nahi hota)
    script_url = os.getenv("EMAIL_SCRIPT_URL")
    script_secret = os.getenv("EMAIL_SCRIPT_SECRET", "")

    if script_url:
        try:
            res = requests.post(
                script_url,
                json={
                    "secret": script_secret,
                    "to": user_email,
                    "subject": subject,
                    "body": email_body,
                },
                timeout=15,
            )
            if res.status_code == 200 and res.json().get("ok"):
                return True
            current_app.logger.error(f"Apps Script Mail Error: {res.status_code} {res.text}")
            return False
        except Exception as e:
            current_app.logger.error(f"Apps Script Request Error: {e}")
            return False

    # 2. Local Fallback (Purana Gmail SMTP)
    try:
        msg = Message(
            subject,
            sender=current_app.config["MAIL_USERNAME"],
            recipients=[user_email],
        )
        msg.body = email_body
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Mail Error: {e}")
        return False
# =====================================================================
# 1️⃣ REGISTER (FIX N2: Allow unverified users to re-register/get new OTP)
# =====================================================================
@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per 10 minutes")
def register():
    data = request.get_json() or {}

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password are required"}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Invalid email address format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    raw_otp, hashed_otp, expires_at = generate_secure_otp()

    with engine.begin() as conn:
        existing_email = conn.execute(
            text("SELECT user_id, is_verified, email FROM users WHERE email = :email"),
            {"email": email}
        ).first()

        existing_username = conn.execute(
            text("SELECT user_id FROM users WHERE username = :username"),
            {"username": username}
        ).first()

        # Agar username kisi aur account ke paas hai (verified ya pending), toh block karo
        if existing_username and (not existing_email or existing_username.user_id != existing_email.user_id):
            return jsonify({"error": "Username already taken"}), 409

        if existing_email:
            if existing_email.is_verified:
                return jsonify({"error": "Email already registered"}), 409
            else:
                # S1 FIX: Pending account ka password_hash bilkul mat badlo, sirf naya OTP bhejo
                conn.execute(
                    text("""
                        UPDATE users 
                        SET otp = :otp, otp_expires_at = :expires_at, otp_attempts = 0
                        WHERE user_id = :uid
                    """),
                    {
                        "otp": hashed_otp,
                        "expires_at": expires_at,
                        "uid": existing_email.user_id
                    }
                )
                user_id = existing_email.user_id
                target_email = existing_email.email
        else:
            password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            result = conn.execute(
                text("""
                    INSERT INTO users (username, email, password_hash, is_verified, otp, otp_expires_at, otp_attempts)
                    VALUES (:username, :email, :password_hash, 0, :otp, :expires_at, 0)
                """),
                {
                    "username": username,
                    "email": email,
                    "password_hash": password_hash,
                    "otp": hashed_otp,
                    "expires_at": expires_at
                }
            )
            user_id = result.lastrowid
            target_email = email

    email_sent = send_otp_email(target_email, raw_otp, "Verify your Nexus Account")

    if email_sent:
        return jsonify({
            "message": "Please check your email for the verification OTP.",
            "user_id": user_id,
            "email": target_email
        }), 201
    else:
        return jsonify({"error": "Failed to send verification email. Please try resending OTP."}), 500

    
# =====================================================================
# 2️⃣ VERIFY OTP 
# =====================================================================
@auth_bp.route("/verify-otp", methods=["POST"])
@limiter.limit("5 per 10 minutes")
def verify_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    user_otp = str(data.get("otp") or "").strip()

    if not email or not user_otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    try:
        with engine.begin() as conn:
            user = conn.execute(
                text("""
                    SELECT user_id, otp, otp_expires_at, otp_attempts 
                    FROM users WHERE email = :email
                """),
                {"email": email}
            ).mappings().first()

            if not user or not user["otp"]:
                return jsonify({"error": "Invalid or expired OTP."}), 400

            attempts = int(user["otp_attempts"] or 0)
            if attempts >= OTP_MAX_ATTEMPTS:
                return jsonify({"error": "Too many failed attempts. Please request a new OTP."}), 429

            if user["otp_expires_at"] and datetime.utcnow() > user["otp_expires_at"]:
                return jsonify({"error": "OTP has expired. Please request a new one."}), 400

            stored_otp = user["otp"]
            is_valid = (
                bcrypt.checkpw(user_otp.encode("utf-8"), stored_otp.encode("utf-8"))
                if stored_otp.startswith("$2")
                else (stored_otp == user_otp)
            )

            if not is_valid:
                conn.execute(
                    text("UPDATE users SET otp_attempts = otp_attempts + 1 WHERE user_id = :uid"),
                    {"uid": user["user_id"]}
                )
                return jsonify({"error": "Invalid OTP. Please try again."}), 400

            conn.execute(
                text("""
                    UPDATE users 
                    SET is_verified = 1, otp = NULL, otp_expires_at = NULL, otp_attempts = 0 
                    WHERE user_id = :uid
                """),
                {"uid": user["user_id"]}
            )

            conn.execute(
                text("""
                    INSERT INTO notifications (user_id, message, type) 
                    VALUES (:uid, 'Welcome to Nexus! 🎬 Add your first movie to the watchlist.', 'welcome')
                """),
                {"uid": user["user_id"]}
            )

            return jsonify({"message": "Email verified successfully! You can now login."}), 200
    except Exception as e:
        current_app.logger.error(f"Verify OTP Error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# =====================================================================
# 3️⃣ RESEND OTP (FIX N2: Route added)
# =====================================================================
@auth_bp.route("/resend-otp", methods=["POST"])
@limiter.limit("3 per 10 minutes")
def resend_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    generic_msg = "If this email is registered and unverified, a new OTP has been sent."

    try:
        raw_otp = None
        with engine.begin() as conn:
            user = conn.execute(
                text("SELECT user_id, is_verified FROM users WHERE email = :email"),
                {"email": email}
            ).mappings().first()

            if user and not user["is_verified"]:
                raw_otp, hashed_otp, expires_at = generate_secure_otp()
                conn.execute(
                    text("""
                        UPDATE users 
                        SET otp = :otp, otp_expires_at = :expires_at, otp_attempts = 0 
                        WHERE user_id = :uid
                    """),
                    {"otp": hashed_otp, "expires_at": expires_at, "uid": user["user_id"]}
                )

        if raw_otp:
            send_otp_email(email, raw_otp, "Nexus - Your New Verification Code")

        return jsonify({"message": generic_msg}), 200
    except Exception as e:
        current_app.logger.error(f"Resend OTP Error: {e}")
        return jsonify({"error": "Internal server error"}), 500
# =====================================================================
# 4️⃣ LOGIN (RATE LIMITED)
# =====================================================================
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    with engine.connect() as conn:
        user = conn.execute(
            text("""
                SELECT user_id, username, email, password_hash, profile_image, bio, is_verified 
                FROM users WHERE email = :email
            """),
            {"email": email}
        ).mappings().first()

        if user is None:
            return jsonify({"error": "Invalid email or password"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
            return jsonify({"error": "Invalid email or password"}), 401

        if not user["is_verified"]:
            return jsonify({"error": "Please verify your email via OTP before logging in."}), 403

        genre_check = conn.execute(
            text("SELECT COUNT(*) as count FROM user_preference WHERE user_id = :user_id"),
            {"user_id": user["user_id"]}
        ).mappings().first()

        has_genres = genre_check["count"] > 0

    token = jwt.encode(
        {
            "user_id": user["user_id"],
            "email": user["email"],
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        },
        JWT_SECRET_KEY,
        algorithm="HS256"
    )

    return jsonify({
        "message": "Login successful",
        "token": token,
        "has_genres": has_genres,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "profile_image": user["profile_image"],
            "bio": user["bio"]
        }
    }), 200


# =====================================================================
# 5️⃣ FORGOT PASSWORD & RESET 
# =====================================================================
@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5 per 10 minutes")
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        raw_otp = None
        with engine.begin() as conn:
            user = conn.execute(
                text("SELECT user_id, is_verified FROM users WHERE email = :email"),
                {"email": email}
            ).mappings().first()

            if user and user["is_verified"]:
                raw_otp, hashed_otp, expires_at = generate_secure_otp()
                conn.execute(
                    text("""
                        UPDATE users 
                        SET reset_otp = :otp, reset_otp_expires_at = :expires_at, reset_otp_attempts = 0 
                        WHERE user_id = :uid
                    """),
                    {"otp": hashed_otp, "expires_at": expires_at, "uid": user["user_id"]}
                )

        if raw_otp:
            send_otp_email(email, raw_otp, "Nexus - Password Reset Code")

        return jsonify({"message": "If this email is registered and verified, you will receive an OTP."}), 200

    except Exception as e:
        current_app.logger.error(f"Forgot Password Error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route("/reset-password-otp", methods=["PUT"])
@limiter.limit("5 per 10 minutes")
def reset_password_with_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    user_otp = str(data.get("otp") or "").strip()
    new_password = data.get("new_password") or ""

    if not email or not user_otp or not new_password:
        return jsonify({"error": "Email, OTP, and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        with engine.begin() as conn:
            user = conn.execute(
                text("""
                    SELECT user_id, reset_otp, reset_otp_expires_at, reset_otp_attempts 
                    FROM users WHERE email = :email
                """),
                {"email": email}
            ).mappings().first()

            if not user or not user["reset_otp"]:
                return jsonify({"error": "Invalid or expired OTP"}), 400

            attempts = int(user["reset_otp_attempts"] or 0)
            if attempts >= OTP_MAX_ATTEMPTS:
                return jsonify({"error": "Too many failed attempts. Please request a new reset OTP."}), 429

            if user["reset_otp_expires_at"] and datetime.utcnow() > user["reset_otp_expires_at"]:
                return jsonify({"error": "OTP has expired. Please request a new one."}), 400

            stored_otp = user["reset_otp"]
            is_valid = (
                bcrypt.checkpw(user_otp.encode("utf-8"), stored_otp.encode("utf-8"))
                if stored_otp.startswith("$2")
                else (stored_otp == user_otp)
            )

            if not is_valid:
                conn.execute(
                    text("UPDATE users SET reset_otp_attempts = reset_otp_attempts + 1 WHERE user_id = :uid"),
                    {"uid": user["user_id"]}
                )
                return jsonify({"error": "Invalid or expired OTP"}), 400

            new_password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            conn.execute(
                text("""
                    UPDATE users 
                    SET password_hash = :hash, reset_otp = NULL, reset_otp_expires_at = NULL, reset_otp_attempts = 0 
                    WHERE user_id = :uid
                """),
                {"hash": new_password_hash, "uid": user["user_id"]}
            )

            conn.execute(
                text("""
                    INSERT INTO notifications (user_id, message, type) 
                    VALUES (:uid, 'Your password was updated successfully. 🔒', 'security')
                """),
                {"uid": user["user_id"]}
            )

            return jsonify({"message": "Password reset successfully! You can now login."}), 200

    except Exception as e:
        current_app.logger.error(f"Reset Password Error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# =====================================================================
# 6️⃣ CHANGE PASSWORD
# =====================================================================
@auth_bp.route("/change-password", methods=["PUT"])
@token_required
def change_password():
    user_id = g.user_id
    data = request.get_json() or {}

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return jsonify({"error": "Current password and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT password_hash FROM users WHERE user_id = :user_id"),
            {"user_id": user_id}
        ).first()

    if user is None:
        return jsonify({"error": "User not found"}), 404

    if not bcrypt.checkpw(current_password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return jsonify({"error": "Current password is incorrect"}), 401

    new_password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id"),
            {"password_hash": new_password_hash, "user_id": user_id}
        )
        conn.execute(
            text("""
                INSERT INTO notifications (user_id, message, type) 
                VALUES (:uid, 'Your password was changed successfully. 🔒', 'security')
            """),
            {"uid": user_id}
        )

    return jsonify({"message": "Password changed successfully"}), 200


# =====================================================================
# 🔔 NOTIFICATIONS 
# =====================================================================
@auth_bp.route("/notifications", methods=["GET"])
@token_required
def get_notifications():
    user_id = g.user_id
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT notification_id, sender_id, message, type, is_read, created_at 
                FROM notifications 
                WHERE user_id = :uid 
                ORDER BY created_at DESC 
                LIMIT 15
            """)
            notifs = [dict(row) for row in conn.execute(query, {"uid": user_id}).mappings().all()]

            unread_count = conn.execute(
                text("SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND is_read = 0"),
                {"uid": user_id}
            ).scalar() or 0

            return jsonify({"notifications": notifs, "unread_count": int(unread_count)}), 200
    except Exception as e:
        current_app.logger.error(f"Notification Error: {e}")
        return jsonify({"error": "Failed to fetch notifications"}), 500


@auth_bp.route("/notifications/read", methods=["PUT"])
@token_required
def mark_notifications_read():
    user_id = g.user_id
    try:
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE notifications SET is_read = 1 WHERE user_id = :uid AND is_read = 0"),
                {"uid": user_id}
            )
        return jsonify({"message": "Notifications marked as read"}), 200
    except Exception as e:
        current_app.logger.error(f"Mark Read Error: {e}")
        return jsonify({"error": "Failed to update notifications"}), 500


@auth_bp.route("/notifications/<int:notif_id>", methods=["DELETE"])
@token_required
def delete_notification(notif_id):
    user_id = g.user_id
    try:
        with engine.begin() as conn:
            conn.execute(
                text("DELETE FROM notifications WHERE notification_id = :nid AND user_id = :uid"),
                {"nid": notif_id, "uid": user_id}
            )
        return jsonify({"message": "Notification deleted"}), 200
    except Exception as e:
        current_app.logger.error(f"Delete Notif Error: {e}")
        return jsonify({"error": "Failed to delete notification"}), 500


# =====================================================================
# 👤 UNIFIED TOGGLE FOLLOW USER 
# =====================================================================
@auth_bp.route("/users/<int:target_user_id>/follow", methods=["POST"])
@auth_bp.route("/user/<int:target_user_id>/follow", methods=["POST"])
@token_required
def toggle_follow(target_user_id):
    user_id = int(g.user_id)
    target_user_id = int(target_user_id)

    if user_id == target_user_id:
        return jsonify({"error": "You cannot follow yourself"}), 400

    try:
        with engine.begin() as conn:
            target_exists = conn.execute(
                text("SELECT user_id FROM users WHERE user_id = :tid"),
                {"tid": target_user_id}
            ).first()
            if not target_exists:
                return jsonify({"error": "Target user not found"}), 404

            existing_follow = conn.execute(
                text("SELECT 1 FROM followers WHERE follower_id = :f1 AND following_id = :f2"),
                {"f1": user_id, "f2": target_user_id}
            ).first()

            if existing_follow:
                conn.execute(
                    text("DELETE FROM followers WHERE follower_id = :f1 AND following_id = :f2"),
                    {"f1": user_id, "f2": target_user_id}
                )
                return jsonify({
                    "status": "unfollowed",
                    "is_following": False,
                    "message": "Unfollowed successfully"
                }), 200
            else:
                conn.execute(
                    text("INSERT INTO followers (follower_id, following_id) VALUES (:f1, :f2)"),
                    {"f1": user_id, "f2": target_user_id}
                )

                already_notified = conn.execute(
                    text("""
                        SELECT 1 FROM notifications 
                        WHERE user_id = :target AND sender_id = :sender AND type = 'follow' AND is_read = 0
                        LIMIT 1
                    """),
                    {"target": target_user_id, "sender": user_id}
                ).first()

                if not already_notified:
                    sender = conn.execute(
                        text("SELECT username FROM users WHERE user_id = :u"),
                        {"u": user_id}
                    ).mappings().first()
                    sender_name = sender["username"] if sender else "Someone"

                    conn.execute(
                        text("""
                            INSERT INTO notifications (user_id, sender_id, message, type) 
                            VALUES (:target, :sender, :msg, 'follow')
                        """),
                        {
                            "target": target_user_id,
                            "sender": user_id,
                            "msg": f"@{sender_name} started following you."
                        }
                    )

                return jsonify({
                    "status": "followed",
                    "is_following": True,
                    "message": "Followed successfully"
                }), 200

    except Exception as e:
        current_app.logger.error(f"FOLLOW ERROR: {e}")
        return jsonify({"error": "Failed to follow user"}), 500