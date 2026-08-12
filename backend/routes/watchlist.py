from flask import Blueprint, jsonify, g
from sqlalchemy import text

from backend.database import engine
from backend.middleware.auth_middleware import token_required


watchlist_bp = Blueprint("watchlist", __name__)


# Add movie to watchlist
@watchlist_bp.route("/watchlist/<int:movie_id>", methods=["POST"])
@token_required
def add_to_watchlist(movie_id):

    user_id = g.user_id

    # Check movie exists
    with engine.connect() as conn:

        movie = conn.execute(
            text("""
                SELECT movie_id, title
                FROM movies
                WHERE movie_id = :movie_id
            """),
            {"movie_id": movie_id}
        ).first()

    if movie is None:
        return jsonify({
            "error": "Movie not found"
        }), 404

    # Add to watchlist
    try:

        with engine.begin() as conn:

            conn.execute(
                text("""
                    INSERT INTO watchlist (user_id, movie_id)
                    VALUES (:user_id, :movie_id)
                """),
                {
                    "user_id": user_id,
                    "movie_id": movie_id
                }
            )

    except Exception:

        return jsonify({
            "error": "Movie already exists in your watchlist"
        }), 409

    return jsonify({
        "message": "Movie added to watchlist",
        "movie_id": movie_id,
        "title": movie.title
    }), 201


# Get user's watchlist
@watchlist_bp.route("/watchlist", methods=["GET"])
@token_required
def get_watchlist():

    user_id = g.user_id

    with engine.connect() as conn:

        movies = conn.execute(
            text("""
                SELECT
                    m.movie_id,
                    m.title,
                    m.release_year,
                    m.avg_rating,
                    m.poster_url,
                    w.added_at
                FROM watchlist w
                JOIN movies m
                    ON w.movie_id = m.movie_id
                WHERE w.user_id = :user_id
                ORDER BY w.added_at DESC
            """),
            {"user_id": user_id}
        ).mappings().all()

    # Convert SQLAlchemy RowMapping to normal dictionaries
    watchlist = [dict(movie) for movie in movies]

    return jsonify({
        "watchlist": watchlist
    }), 200

# Remove movie from watchlist
@watchlist_bp.route("/watchlist/<int:movie_id>", methods=["DELETE"])
@token_required
def remove_from_watchlist(movie_id):

    user_id = g.user_id

    with engine.begin() as conn:

        result = conn.execute(
            text("""
                DELETE FROM watchlist
                WHERE user_id = :user_id
                AND movie_id = :movie_id
            """),
            {
                "user_id": user_id,
                "movie_id": movie_id
            }
        )

    if result.rowcount == 0:
        return jsonify({
            "error": "Movie not found in your watchlist"
        }), 404

    return jsonify({
        "message": "Movie removed from watchlist",
        "movie_id": movie_id
    }), 200