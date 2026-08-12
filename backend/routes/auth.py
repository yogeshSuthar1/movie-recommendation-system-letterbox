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

    # Get user from database
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
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "profile_image": user["profile_image"],
            "bio": user["bio"]
        }
    }), 200


@auth_bp.route("/profile", methods=["GET"])
@token_required
def profile():

    return jsonify({
        "message": "You are authenticated",
        "user_id": g.user_id,
        "email": g.user_email
    })