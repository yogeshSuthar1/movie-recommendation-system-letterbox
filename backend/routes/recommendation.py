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

    limit = request.args.get("limit", default=10, type=int)

    if limit < 1:
        return jsonify({
            "error": "Limit must be at least 1"
        }), 400

    if limit > 20:
        limit = 20

    result = recommend(
        movie_name,
        limit=limit
    )

    if result is None:
        return jsonify({
            "error": "Movie not found"
        }), 404

    return jsonify(
        result.to_dict(orient="records")
    )