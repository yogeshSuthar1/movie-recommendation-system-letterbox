from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from backend.services.search import search_movies
from backend.database import engine
from backend.middleware.auth_middleware import token_required


search_bp = Blueprint("search", __name__)

@search_bp.route("/search", methods=["GET"])
@token_required
def search():
    query = request.args.get("q", "").strip()
    search_type = request.args.get("type", "movie").lower() # NAYA PARAMETER
    save_history = request.args.get("save", "false").lower() == "true"

    if not query:
        return jsonify([])

    # History save karne wala tera existing code yahin rahega...

    if search_type == "movie":
        # Teri existing movie search service call
        result = search_movies(query)
    elif search_type == "user":
        # NAYA: User ko DB mein dhoondhne ki query (apne DB variables ke hisaab se)
        with engine.connect() as conn:
            users_query = conn.execute(
                text("SELECT id as user_id, username, profile_pic FROM users WHERE username ILIKE :q LIMIT 12"),
                {"q": f"%{query}%"}
            ).mappings().all()
            result = [dict(u) for u in users_query]
    
    return jsonify(result)

@search_bp.route("/search/history", methods=["GET"])
@token_required
def search_history():

    user_id = g.user_id

    with engine.connect() as conn:

        history = conn.execute(
            text("""
                SELECT
                    history_id,
                    search_query,
                    searched_at
                FROM search_history
                WHERE user_id = :user_id
                ORDER BY searched_at DESC
            """),
            {
                "user_id": user_id
            }
        ).mappings().all()

    history_list = [dict(item) for item in history]

    return jsonify({
        "total_searches": len(history_list),
        "history": history_list
    }), 200

@search_bp.route("/search/history/<int:history_id>", methods=["DELETE"])
@token_required
def delete_search_history(history_id):

    user_id = g.user_id

    with engine.begin() as conn:

        result = conn.execute(
            text("""
                DELETE FROM search_history
                WHERE history_id = :history_id
                AND user_id = :user_id
            """),
            {
                "history_id": history_id,
                "user_id": user_id
            }
        )

    if result.rowcount == 0:
        return jsonify({
            "error": "Search history not found"
        }), 404

    return jsonify({
        "message": "Search history deleted successfully",
        "history_id": history_id
    }), 200


@search_bp.route("/search/history", methods=["DELETE"])
@token_required
def clear_search_history():

    user_id = g.user_id

    with engine.begin() as conn:

        result = conn.execute(
            text("""
                DELETE FROM search_history
                WHERE user_id = :user_id
            """),
            {
                "user_id": user_id
            }
        )

    return jsonify({
        "message": "Search history cleared successfully",
        "deleted_count": result.rowcount
    }), 200