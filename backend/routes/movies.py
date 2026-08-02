from flask import Blueprint, jsonify
from sqlalchemy import text
from backend.database import engine

movies_bp = Blueprint("movies", __name__)

@movies_bp.route("/movies", methods=["GET"])
def get_movies():

    query = text("""
        SELECT
            movie_id,
            title,
            release_year,
            avg_rating,
            poster_url
        FROM movies
        ORDER BY avg_rating DESC
        LIMIT 20
    """)

    with engine.connect() as conn:
        movies = conn.execute(query).mappings().all()

    return jsonify([dict(movie) for movie in movies])