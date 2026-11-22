# File Path: backend/routes/search.py
import jwt
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from backend.database import engine
from backend.middleware.auth_middleware import token_required
from backend.config import JWT_SECRET_KEY

search_bp = Blueprint("search", __name__)


def escape_like(val: str) -> str:
    """Escapes % and _ wildcards for safe SQL LIKE queries (Fix #24)."""
    return val.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def save_user_search_query(conn, user_id: int, query: str):
    """Deduplicates and saves a search query (max 255 chars) for a user (Fix #15)."""
    clean_q = query.strip()[:255]
    if len(clean_q) < 2:
        return
    # Remove older identical or prefix partial queries from this user to prevent clutter
    conn.execute(
        text("""
            DELETE FROM search_history 
            WHERE user_id = :uid 
              AND (LOWER(search_query) = LOWER(:q) OR LOWER(:q) LIKE CONCAT(LOWER(search_query), '%'))
        """),
        {"uid": user_id, "q": clean_q}
    )
    conn.execute(
        text("INSERT INTO search_history (user_id, search_query) VALUES (:uid, :q)"),
        {"uid": user_id, "q": clean_q}
    )


@search_bp.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    search_type = request.args.get("type", "movie")
    should_save = request.args.get("save", "0") == "1"

    if not query:
        return jsonify([]), 200

    current_user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            current_user_id = payload.get("user_id") or payload.get("id")
        except Exception:
            pass

    escaped_q = escape_like(query)
    search_pattern = f"%{escaped_q}%"

    with engine.begin() as conn:
        # 🚀 P1 FIX #15: Only save to history when explicitly requested (Enter / Result Click)
        if should_save and current_user_id:
            try:
                save_user_search_query(conn, int(current_user_id), query)
            except Exception:
                pass

        if search_type == "user":
            if current_user_id:
                users_query = text("""
                    SELECT user_id, username, profile_image 
                    FROM users 
                    WHERE username LIKE :q ESCAPE '\\\\' AND user_id != :current_id 
                    LIMIT 12
                """)
                results = [
                    dict(row) for row in conn.execute(
                        users_query,
                        {"q": search_pattern, "current_id": current_user_id}
                    ).mappings().all()
                ]
            else:
                users_query = text("""
                    SELECT user_id, username, profile_image 
                    FROM users 
                    WHERE username LIKE :q ESCAPE '\\\\'
                    LIMIT 12
                """)
                results = [
                    dict(row) for row in conn.execute(
                        users_query,
                        {"q": search_pattern}
                    ).mappings().all()
                ]

            return jsonify(results), 200

        elif search_type == "actor":
            actors_query = text("""
                SELECT MIN(actor_id) as actor_id, actor_name 
                FROM actors 
                WHERE actor_name LIKE :q ESCAPE '\\\\'
                GROUP BY actor_name
                LIMIT 12
            """)
            results = [
                dict(row) for row in conn.execute(
                    actors_query,
                    {"q": search_pattern}
                ).mappings().all()
            ]
            return jsonify(results), 200

        else:
            movies_query = text("""
                SELECT movie_id, title, release_year, avg_rating, poster_url 
                FROM movies 
                WHERE title LIKE :q ESCAPE '\\\\'
                LIMIT 12
            """)
            results = [
                dict(row) for row in conn.execute(
                    movies_query,
                    {"q": search_pattern}
                ).mappings().all()
            ]
            return jsonify(results), 200


@search_bp.route("/search/history", methods=["POST"])
@token_required
def add_search_history():
    """Explicit endpoint to save a completed search query on Enter or result click."""
    user_id = int(g.user_id)
    data = request.get_json() or {}
    query = str(data.get("query") or "").strip()

    if len(query) < 2:
        return jsonify({"message": "Query too short"}), 200

    with engine.begin() as conn:
        save_user_search_query(conn, user_id, query)

    return jsonify({"message": "Search query saved"}), 201


@search_bp.route("/search/history", methods=["GET"])
@token_required
def search_history():
    user_id = g.user_id

    with engine.connect() as conn:
        # 🚀 P1 FIX #15: Deduplicated history limited to latest 20 items
        history = conn.execute(
            text("""
                SELECT
                    MAX(history_id) AS history_id,
                    search_query,
                    MAX(searched_at) AS searched_at
                FROM search_history
                WHERE user_id = :user_id
                GROUP BY search_query
                ORDER BY searched_at DESC
                LIMIT 20
            """),
            {"user_id": user_id}
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
            {"history_id": history_id, "user_id": user_id}
        )

    if result.rowcount == 0:
        return jsonify({"error": "Search history not found"}), 404

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
            text("DELETE FROM search_history WHERE user_id = :user_id"),
            {"user_id": user_id}
        )

    return jsonify({
        "message": "Search history cleared successfully",
        "deleted_count": result.rowcount
    }), 200