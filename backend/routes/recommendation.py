from flask import Blueprint, request, jsonify
from backend.services.recommender import recommend

recommendation_bp = Blueprint("recommendation", __name__)

@recommendation_bp.route("/recommend", methods=["GET"])
def get_recommendations():

    movie_name = request.args.get("movie")

    if not movie_name:
        return jsonify({
            "error": "Movie name is required"
        }), 400

    result = recommend(movie_name)

    if result is None:
        return jsonify({
            "error": "Movie not found"
        }), 404

    return jsonify(result.to_dict(orient="records"))