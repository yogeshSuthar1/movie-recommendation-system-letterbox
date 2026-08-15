from flask import Blueprint, jsonify, request
from sqlalchemy import text
from backend.database import engine

movies_bp = Blueprint("movies", __name__)

@movies_bp.route("/movies", methods=["GET"])
def get_movies():

    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)

    if page < 1:
        return jsonify({
            "error": "Page must be at least 1"
        }), 400

    if limit < 1:
        return jsonify({
            "error": "Limit must be at least 1"
        }), 400

    if limit > 50:
        limit = 50

    offset = (page - 1) * limit

    query = text("""
        SELECT
            movie_id,
            title,
            release_year,
            avg_rating,
            poster_url
        FROM movies
        ORDER BY avg_rating DESC
        LIMIT :limit OFFSET :offset
    """)

    with engine.connect() as conn:
        movies = conn.execute(
            query,
            {
                "limit": limit,
                "offset": offset
            }
        ).mappings().all()

    return jsonify({
        "page": page,
        "limit": limit,
        "movies": [dict(movie) for movie in movies]
    }), 200
@movies_bp.route("/movies/trending", methods=["GET"])
def trending_movies():

    limit = request.args.get("limit", default=10, type=int)

    if limit < 1:
        return jsonify({
            "error": "Limit must be at least 1"
        }), 400

    if limit > 20:
        limit = 20

    with engine.connect() as conn:

        movies = conn.execute(
            text("""
                SELECT
                    movie_id,
                    title,
                    release_year,
                    avg_rating,
                    poster_url
                FROM movies
                WHERE avg_rating IS NOT NULL
                ORDER BY avg_rating DESC
                LIMIT :limit
            """),
            {
                "limit": limit
            }
        ).mappings().all()

    return jsonify({
        "total_movies": len(movies),
        "movies": [dict(movie) for movie in movies]
    }), 200