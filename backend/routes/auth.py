from flask import Blueprint, request, jsonify, g, current_app
from backend.database import engine
from sqlalchemy import text
import bcrypt
import jwt
import random
from datetime import datetime, timedelta
from backend.config import JWT_SECRET_KEY
from backend.middleware.auth_middleware import token_required
from flask_mail import Message


# 🔥 DHYAN RAKHNA: Tujhe apni main app file (jaise app.py ya extensions.py) se `mail` object import karna hoga.
# Example: from backend.app import mail
# (Neeche maine ek dummy import likha hai, apne folder structure ke hisaab se theek kar lena)
from backend.extensions import mail

auth_bp = Blueprint("auth", __name__)


# =====================================================================
# 📧 HELPER FUNCTION: EMAIL BHEJNE KE LIYE
# =====================================================================
def send_otp_email(user_email, otp, subject="Your MovieVerse Verification Code"):
    try:
        msg = Message(subject, 
                      sender=current_app.config['MAIL_USERNAME'], 
                      recipients=[user_email])
        msg.body = f"Welcome to MovieVerse! 🎬\n\nYour 6-digit code is: {otp}\n\nPlease don't share this code with anyone."
        mail.send(msg)
        return True
    except Exception as e:
        print("Mail Error:", e)
        return False


# =====================================================================
# 1️⃣ REGISTER (WITH OTP)
# =====================================================================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password are required"}), 400

    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": email}
        ).first()

    if result:
        return jsonify({"error": "Email already registered"}), 409

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    
    # 🔥 NAYA: 6-digit OTP generate karo
    otp = str(random.randint(100000, 999999))

    with engine.begin() as conn:
        # 🔥 NAYA: is_verified aur otp columns add kiye
        result = conn.execute(
            text("""
                INSERT INTO users (username, email, password_hash, is_verified, otp)
                VALUES (:username, :email, :password_hash, 0, :otp)
            """),
            {
                "username": username,
                "email": email,
                "password_hash": password_hash,
                "otp": otp
            }
        )
        user_id = result.lastrowid

    # 🔥 NAYA: OTP Email fire karo!
    email_sent = send_otp_email(email, otp, "Verify your MovieVerse Account")

    if email_sent:
        return jsonify({
            "message": "User registered successfully! Please check your email for the OTP.",
            "user_id": user_id,
            "email": email
        }), 201
    else:
        return jsonify({"error": "User registered, but failed to send email. Please contact support."}), 500


# =====================================================================
# 2️⃣ VERIFY OTP (NEW ROUTE)
# =====================================================================
@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    email = data.get("email")
    user_otp = data.get("otp")

    if not email or not user_otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    try:
        with engine.begin() as conn:
            user = conn.execute(
                text("SELECT user_id, otp FROM users WHERE email = :email"), 
                {"email": email}
            ).mappings().first()

            if user and user["otp"] == user_otp:
                # 🟢 OTP Match! Account activate karo aur OTP delete kar do
                conn.execute(text("""
                    UPDATE users SET is_verified = 1, otp = NULL WHERE email = :email
                """), {"email": email})

                conn.execute(text("""
                    INSERT INTO notifications (user_id, message, type) 
                    VALUES (:uid, 'Welcome to MovieVerse! 🎬 Add your first movie to the watchlist.', 'welcome')
                """), {"uid": user["user_id"]})

                return jsonify({"message": "Email verified successfully! You can now login."}), 200
            else:
                return jsonify({"error": "Invalid OTP. Please try again."}), 400
    except Exception as e:
        print("Verify OTP Error:", e)
        return jsonify({"error": "Internal server error"}), 500


# =====================================================================
# 3️⃣ LOGIN (BLOCKED IF NOT VERIFIED)
# =====================================================================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

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

        # 🔥 NAYA: OTP Verification Check
        if not user["is_verified"]:
            return jsonify({"error": "Please verify your email via OTP before logging in."}), 403

        genre_check = conn.execute(
            text("SELECT COUNT(*) as count FROM user_preference WHERE user_id = :user_id"),
            {"user_id": user["user_id"]}
        ).mappings().first()

        has_genres = genre_check["count"] > 0

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    token = jwt.encode(
        {
            "user_id": user["user_id"],
            "email": user["email"],
            "exp": datetime.utcnow() + timedelta(days=7)
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
# 4️⃣ FORGOT PASSWORD & RESET (NEW ROUTES)
# =====================================================================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        with engine.begin() as conn:
            user = conn.execute(
                text("SELECT user_id, is_verified FROM users WHERE email = :email"),
                {"email": email}
            ).mappings().first()

            if not user or not user["is_verified"]:
                # Security best practice: Don't reveal if email exists or not to prevent guessing
                return jsonify({"message": "If this email is registered and verified, you will receive an OTP."}), 200
            
            # Generate new OTP for password reset
            otp = str(random.randint(100000, 999999))
            conn.execute(
                text("UPDATE users SET otp = :otp WHERE email = :email"),
                {"otp": otp, "email": email}
            )

        send_otp_email(email, otp, "MovieVerse - Password Reset Code")
        return jsonify({"message": "If this email is registered and verified, you will receive an OTP."}), 200

    except Exception as e:
        print("Forgot Password Error:", e)
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route("/reset-password-otp", methods=["PUT"])
def reset_password_with_otp():
    data = request.get_json()
    email = data.get("email")
    user_otp = data.get("otp")
    new_password = data.get("new_password")

    if not email or not user_otp or not new_password:
        return jsonify({"error": "Email, OTP, and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        with engine.begin() as conn:
            user = conn.execute(
                text("SELECT user_id, otp FROM users WHERE email = :email"),
                {"email": email}
            ).mappings().first()

            if user and user["otp"] == user_otp:
                # 🟢 OTP Match! Hash new password and clear OTP
                new_password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                conn.execute(
                    text("UPDATE users SET password_hash = :hash, otp = NULL WHERE email = :email"),
                    {"hash": new_password_hash, "email": email}
                )

                conn.execute(text("""
                    INSERT INTO notifications (user_id, message, type) 
                    VALUES (:uid, 'Your password was updated successfully. 🔒', 'security')
                """), {"uid": user["user_id"]})

                return jsonify({"message": "Password reset successfully! You can now login."}), 200
            else:
                return jsonify({"error": "Invalid or expired OTP"}), 400

    except Exception as e:
        print("Reset Password Error:", e)
        return jsonify({"error": "Internal server error"}), 500


# =====================================================================
# 5️⃣ CHANGE PASSWORD (LOGGED IN USERS - UNCHANGED)
# =====================================================================
@auth_bp.route("/change-password", methods=["PUT"])
@token_required
def change_password():
    user_id = g.user_id
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

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

        conn.execute(text("""
            INSERT INTO notifications (user_id, message, type) 
            VALUES (:uid, 'Your password was changed successfully. 🔒', 'security')
        """), {"uid": user_id})

    return jsonify({"message": "Password changed successfully"}), 200

@auth_bp.route("/notifications", methods=["GET"])
@token_required
def get_notifications():
    user_id = g.user_id
    try:
        with engine.connect() as conn:
            # Sirf latest 10 notifications bhejenge
            query = text("""
                SELECT notification_id, sender_id, message, type, is_read, created_at 
                FROM notifications 
                WHERE user_id = :uid 
                ORDER BY created_at DESC 
                LIMIT 10
            """)
            notifs = [dict(row) for row in conn.execute(query, {"uid": user_id}).mappings().all()]
            
            # Unread notifications ka count bhi bhejenge navbar bell icon par red dot ke liye
            unread_count = sum(1 for n in notifs if n['is_read'] == 0)

            return jsonify({"notifications": notifs, "unread_count": unread_count}), 200
    except Exception as e:
        print("Notification Error:", e)
        return jsonify({"error": "Failed to fetch notifications"}), 500

# =====================================================================
# 🔔 MARK NOTIFICATIONS AS READ
# =====================================================================
@auth_bp.route("/notifications/read", methods=["PUT"])
@token_required
def mark_notifications_read():
    user_id = g.user_id
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE notifications 
                SET is_read = 1 
                WHERE user_id = :uid AND is_read = 0
            """), {"uid": user_id})
        return jsonify({"message": "Notifications marked as read"}), 200
    except Exception as e:
        print("Mark Read Error:", e)
        return jsonify({"error": "Failed to update notifications"}), 500

# =====================================================================
# 🗑️ DELETE SINGLE NOTIFICATION
# =====================================================================
@auth_bp.route("/notifications/<int:notif_id>", methods=["DELETE"])
@token_required
def delete_notification(notif_id):
    user_id = g.user_id
    try:
        with engine.begin() as conn:
            # Sirf log-in user apni hi notification delete kar sake
            conn.execute(
                text("DELETE FROM notifications WHERE notification_id = :nid AND user_id = :uid"),
                {"nid": notif_id, "uid": user_id}
            )
        return jsonify({"message": "Notification deleted"}), 200
    except Exception as e:
        print("Delete Notif Error:", e)
        return jsonify({"error": "Failed to delete notification"}), 500

    

# Note: Puraana "/reset-password" (with @token_required) nikal diya hai kyunki 
# bina login kiye reset karne ke liye ab "/reset-password-otp" ban gaya hai. 
# Aur login hone ke baad password change karne ke liye "/change-password" already hai.