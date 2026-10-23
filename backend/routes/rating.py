# File Path: backend/routes/rating.py
from flask import Blueprint, jsonify, request, g
from sqlalchemy import text
from backend.database import engine
from backend.middleware.auth_middleware import token_required

rating_bp = Blueprint("rating", __name__)

def sync_movie_avg_rating(conn, movie_id):
    """Recalculates and updates avg_rating in the movies table if user ratings exist."""
    avg_row = conn.execute(
        text("SELECT ROUND(AVG(rating), 2) FROM ratings WHERE movie_id = :movie_id"),
        {"movie_id": movie_id}
    ).fetchone()
    
    if avg_row and avg_row[0] is not None:
        conn.execute(
            text("UPDATE movies SET avg_rating = :new_avg WHERE movie_id = :movie_id"),
            {"new_avg": float(avg_row[0]), "movie_id": movie_id}
        )

# Add / Update rating
@rating_bp.route("/ratings/<int:movie_id>", methods=["POST"])
@token_required
def rate_movie(movie_id):
    user_id = g.user_id
    data = request.get_json()

    if not data or "rating" not in data:
        return jsonify({"error": "Rating is required"}), 400

    try:
        rating = float(data["rating"])
    except (TypeError, ValueError):
        return jsonify({"error": "Rating must be a number"}), 400

    if rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5"}), 400

    if rating * 2 != int(rating * 2):
        return jsonify({"error": "Rating must be in 0.5 increments"}), 400

    with engine.begin() as conn:
        movie = conn.execute(
            text("SELECT movie_id, title FROM movies WHERE movie_id = :movie_id"),
            {"movie_id": movie_id}
        ).first()

        if movie is None:
            return jsonify({"error": "Movie not found"}), 404

        existing = conn.execute(
            text("""
                SELECT rating_id FROM ratings
                WHERE user_id = :user_id AND movie_id = :movie_id
            """),
            {"user_id": user_id, "movie_id": movie_id}
        ).first()

        if existing:
            conn.execute(
                text("""
                    UPDATE ratings
                    SET rating = :rating, rated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id AND movie_id = :movie_id
                """),
                {"rating": rating, "user_id": user_id, "movie_id": movie_id}
            )
            sync_movie_avg_rating(conn, movie_id)
            return jsonify({
                "message": "Rating updated successfully",
                "movie_id": movie_id,
                "rating": rating
            }), 200

        conn.execute(
            text("""
                INSERT INTO ratings (user_id, movie_id, rating)
                VALUES (:user_id, :movie_id, :rating)
            """),
            {"user_id": user_id, "movie_id": movie_id, "rating": rating}
        )
        sync_movie_avg_rating(conn, movie_id)

    return jsonify({
        "message": "Rating added successfully",
        "movie_id": movie_id,
        "rating": rating
    }), 201


@rating_bp.route("/ratings/<int:movie_id>", methods=["GET"])
@token_required
def get_movie_ratings(movie_id):
    with engine.connect() as conn:
        movie = conn.execute(
            text("SELECT movie_id, title, avg_rating FROM movies WHERE movie_id = :movie_id"),
            {"movie_id": movie_id}
        ).first()

        if movie is None:
            return jsonify({"error": "Movie not found"}), 404

        ratings = conn.execute(
            text("""
                SELECT r.rating, r.rated_at
                FROM ratings r
                WHERE r.movie_id = :movie_id
                ORDER BY r.rated_at DESC
            """),
            {"movie_id": movie_id}
        ).mappings().all()

    rating_list = [dict(r) for r in ratings]

    return jsonify({
        "movie_id": movie.movie_id,
        "title": movie.title,
        "average_rating": movie.avg_rating,
        "total_ratings": len(rating_list),
        "ratings": rating_list
    }), 200


# Delete user's rating
@rating_bp.route("/ratings/<int:movie_id>", methods=["DELETE"])
@token_required
def delete_rating(movie_id):
    user_id = g.user_id

    with engine.begin() as conn:
        result = conn.execute(
            text("DELETE FROM ratings WHERE user_id = :user_id AND movie_id = :movie_id"),
            {"user_id": user_id, "movie_id": movie_id}
        )
        if result.rowcount == 0:
            return jsonify({"error": "Rating not found"}), 404

        sync_movie_avg_rating(conn, movie_id)

    return jsonify({
        "message": "Rating deleted successfully",
        "movie_id": movie_id
    }), 200