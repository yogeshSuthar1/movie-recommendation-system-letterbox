from flask import Blueprint, request, jsonify, g
from backend.database import engine
from sqlalchemy import text
import bcrypt
import jwt
from datetime import datetime, timedelta
from backend.config import JWT_SECRET_KEY
from backend.middleware.auth_middleware import token_required



auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    # Check required fields
    if not username or not email or not password:
        return jsonify({
            "error": "Username, email and password are required"
        }), 400

    # Check if email already exists
    with engine.connect() as conn:

        result = conn.execute(
            text("""
                SELECT user_id
                FROM users
                WHERE email = :email
            """),
            {"email": email}
        ).first()

    if result:
        return jsonify({
            "error": "Email already registered"
        }), 409

    # Hash password
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    # Insert user
    with engine.begin() as conn:

        result = conn.execute(
            text("""
                INSERT INTO users
                (username, email, password_hash)
                VALUES
                (:username, :email, :password_hash)
            """),
            {
                "username": username,
                "email": email,
                "password_hash": password_hash
            }
        )

        user_id = result.lastrowid

    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id,
        "username": username,
        "email": email
    }), 201



@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    # Check required fields
    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    # Get user from database & check if they have selected genres
    with engine.connect() as conn:

        user = conn.execute(
            text("""
                SELECT
                    user_id,
                    username,
                    email,
                    password_hash,
                    profile_image,
                    bio
                FROM users
                WHERE email = :email
            """),
            {"email": email}
        ).mappings().first()

        # User not found
        if user is None:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        # 🌟 FIXED: Checked 'user_preference' table instead of 'user_genres'
        genre_check = conn.execute(
            text("""
                SELECT COUNT(*) as count 
                FROM user_preference 
                WHERE user_id = :user_id
            """),
            {"user_id": user["user_id"]}
        ).mappings().first()

        has_genres = genre_check["count"] > 0

    # Verify password
    password_valid = bcrypt.checkpw(
        password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    )

    if not password_valid:
        return jsonify({
            "error": "Invalid email or password"
        }), 401

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
        "has_genres": has_genres,  # 🌟 Frontend ko bhej rahe hain redirect control karne ke liye
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "profile_image": user["profile_image"],
            "bio": user["bio"]
        }
    }), 200

@auth_bp.route("/change-password", methods=["PUT"])
@token_required
def change_password():

    user_id = g.user_id

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return jsonify({
            "error": "Current password and new password are required"
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "error": "New password must be at least 6 characters"
        }), 400

    # Get current password
    with engine.connect() as conn:

        user = conn.execute(
            text("""
                SELECT password_hash
                FROM users
                WHERE user_id = :user_id
            """),
            {
                "user_id": user_id
            }
        ).first()

    if user is None:
        return jsonify({
            "error": "User not found"
        }), 404

    # Verify current password
    if not bcrypt.checkpw(
        current_password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    ):
        return jsonify({
            "error": "Current password is incorrect"
        }), 401

    # Hash new password
    new_password_hash = bcrypt.hashpw(
        new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    # Update password
    with engine.begin() as conn:

        conn.execute(
            text("""
                UPDATE users
                SET password_hash = :password_hash
                WHERE user_id = :user_id
            """),
            {
                "password_hash": new_password_hash,
                "user_id": user_id
            }
        )

    return jsonify({
        "message": "Password changed successfully"
    }), 200


@auth_bp.route("/reset-password", methods=["PUT"])
@token_required
def reset_password():

    user_id = g.user_id

    data = request.get_json()

    if not data or not data.get("new_password"):
        return jsonify({
            "error": "New password is required"
        }), 400

    new_password = data["new_password"]

    if len(new_password) < 6:
        return jsonify({
            "error": "Password must be at least 6 characters"
        }), 400

    password_hash = bcrypt.hashpw(
        new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    with engine.begin() as conn:

        conn.execute(
            text("""
                UPDATE users
                SET password_hash = :password_hash
                WHERE user_id = :user_id
            """),
            {
                "password_hash": password_hash,
                "user_id": user_id
            }
        )

    return jsonify({
        "message": "Password reset successfully"
    }), 200