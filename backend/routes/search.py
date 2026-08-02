from flask import Blueprint, request, jsonify
from backend.services.search import search_movies

search_bp = Blueprint("search", __name__)

@search_bp.route("/search", methods=["GET"])
def search():

    query = request.args.get("q", "")

    return jsonify(search_movies(query))