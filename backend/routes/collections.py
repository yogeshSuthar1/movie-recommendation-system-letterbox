# File Path: backend/routes/collections.py
from flask import Blueprint, jsonify, request, g
from sqlalchemy import text
from backend.database import engine
from backend.middleware.auth_middleware import token_required

collections_bp = Blueprint("collections", __name__)

# 1. Create a new collection
@collections_bp.route("/collections", methods=["POST"])
@token_required
def create_collection():
    user_id = g.user_id
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()

    if not title:
        return jsonify({"error": "Collection title is required"}), 400

    with engine.begin() as conn:
        result = conn.execute(
            text("""
                INSERT INTO collections (user_id, title, description)
                VALUES (:user_id, :title, :description)
            """),
            {"user_id": user_id, "title": title, "description": description}
        )
        collection_id = result.lastrowid

    return jsonify({"message": "Collection created successfully", "collection_id": collection_id}), 201


# 2. Get user's collections
@collections_bp.route("/user/<int:user_id>/collections", methods=["GET"])
def get_user_collections(user_id):
    with engine.connect() as conn:
        collections = conn.execute(
            text("""
                SELECT c.collection_id, c.title, c.description, c.created_at,
                       (SELECT COUNT(*) FROM collection_movies cm WHERE cm.collection_id = c.collection_id) AS movie_count
                FROM collections c
                WHERE c.user_id = :user_id
                ORDER BY c.created_at DESC
            """),
            {"user_id": user_id}
        ).mappings().all()

    return jsonify([dict(c) for c in collections]), 200


# 3. Add movie to collection (With Ownership Security Check)
@collections_bp.route("/collections/<int:collection_id>/movies", methods=["POST"])
@token_required
def add_movie_to_collection(collection_id):
    user_id = g.user_id
    data = request.get_json() or {}
    movie_id = data.get("movie_id")

    if not movie_id:
        return jsonify({"error": "Movie ID is required"}), 400

    with engine.begin() as conn:
        # 🚀 SECURITY FIX: Check ki yeh collection logged-in user ki hi hai
        col_owner = conn.execute(
            text("SELECT user_id FROM collections WHERE collection_id = :cid"),
            {"cid": collection_id}
        ).fetchone()

        if not col_owner:
            return jsonify({"error": "Collection not found"}), 404

        if int(col_owner[0]) != int(user_id):
            return jsonify({"error": "Unauthorized: You can only edit your own collections"}), 403

        # Check agar movie pehle se us collection mein hai
        exists = conn.execute(
            text("SELECT id FROM collection_movies WHERE collection_id = :cid AND movie_id = :mid"),
            {"cid": collection_id, "mid": movie_id}
        ).fetchone()

        if exists:
            return jsonify({"message": "Movie is already in this collection"}), 400

        conn.execute(
            text("INSERT INTO collection_movies (collection_id, movie_id) VALUES (:cid, :mid)"),
            {"cid": collection_id, "mid": movie_id}
        )

    return jsonify({"message": "Movie added to collection successfully"}), 200


# 4. Get collection details
@collections_bp.route("/collections/<int:collection_id>", methods=["GET"])
def get_collection_details(collection_id):
    with engine.connect() as conn:
        col = conn.execute(
            text("SELECT collection_id, title, description, created_at FROM collections WHERE collection_id = :cid"),
            {"cid": collection_id}
        ).mappings().first()

        if not col:
            return jsonify({"error": "Collection not found"}), 404

        movies = conn.execute(
            text("""
                SELECT m.movie_id, m.title, m.release_year, m.runtime_minutes, m.poster_url, m.avg_rating
                FROM collection_movies cm
                JOIN movies m ON cm.movie_id = m.movie_id
                WHERE cm.collection_id = :cid
            """),
            {"cid": collection_id}
        ).mappings().all()

    return jsonify({
        "collection": dict(col),
        "movies": [dict(m) for m in movies]
    }), 200