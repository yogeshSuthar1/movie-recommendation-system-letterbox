import jwt
from flask import Blueprint, request, jsonify, g, current_app
from sqlalchemy import text

from backend.services.search import search_movies
from backend.database import engine
from backend.middleware.auth_middleware import token_required


search_bp = Blueprint("search", __name__)

@search_bp.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    search_type = request.args.get("type", "movie")
    
    current_user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, current_app.config.get("SECRET_KEY", "your_secret_key"), algorithms=["HS256"])
            current_user_id = payload.get("user_id") or payload.get("id")
        except Exception:
            pass

    with engine.connect() as conn:
        if search_type == "user":
            if current_user_id:
                users_query = text("""
                    SELECT user_id, username 
                    FROM users 
                    WHERE username LIKE :q AND user_id != :current_id 
                    LIMIT 12
                """)
                results = [dict(row) for row in conn.execute(users_query, {"q": f"%{query}%", "current_id": current_user_id}).mappings().all()]
            else:
                users_query = text("""
                    SELECT user_id, username 
                    FROM users 
                    WHERE username LIKE :q 
                    LIMIT 12
                """)
                results = [dict(row) for row in conn.execute(users_query, {"q": f"%{query}%"}).mappings().all()]
            
            return jsonify(results), 200

        elif search_type == "actor":
            search_pattern = f"%{query}%"
            actors_query = text("""
                SELECT MIN(actor_id) as actor_id, actor_name 
                FROM actors 
                WHERE actor_name LIKE :q 
                GROUP BY actor_name
                LIMIT 12
            """)
            results = [dict(row) for row in conn.execute(actors_query, {"q": search_pattern}).mappings().all()]
            return jsonify(results), 200

        else:
            # Movie search logic
            movies_query = text("""
                SELECT movie_id, title, release_year, avg_rating, poster_url 
                FROM movies 
                WHERE title LIKE :q 
                LIMIT 12
            """)
            results = [dict(row) for row in conn.execute(movies_query, {"q": f"%{query}%"}).mappings().all()]
            return jsonify(results), 200

    
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