from flask import Blueprint, jsonify
from backend.services.movie_service import get_movie

movie_bp = Blueprint("movie", __name__)

@movie_bp.route("/movies/<int:movie_id>")
def movie_details(movie_id):

    movie = get_movie(movie_id)

    if movie is None:
        return jsonify({"error":"Movie not found"}),404

    return jsonify(movie)