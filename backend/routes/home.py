# File Path: backend/routes/home.py
import os
import random
import requests
from flask import Blueprint, jsonify, g, request, current_app
from sqlalchemy import text, bindparam
from dotenv import load_dotenv

from cachetools import TTLCache # 🚀 FIX N8: Import Cache
from backend.database import engine
from backend.middleware.auth_middleware import token_required
from backend.extensions import limiter # 🚀 FIX N8: Import Limiter

load_dotenv()

home_bp = Blueprint("home", __name__)

# 🚀 FIX N8: Bounded cache (Max 1000 searches, items expire after 24 hours/86400 seconds)
_trailer_cache = TTLCache(maxsize=1000, ttl=86400)


def get_dynamic_new_releases(genre_ids_tuple, user_id):
    if not genre_ids_tuple:
        return []

    with engine.connect() as conn:
        new_query = text("""
            SELECT * FROM (
                SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                FROM movies m
                WHERE (m.avg_rating >= 3.0 OR m.avg_rating = 0 OR m.avg_rating IS NULL)
                  AND m.poster_url IS NOT NULL
                  AND m.release_year BETWEEN (YEAR(CURDATE()) - 2) AND YEAR(CURDATE())
                  AND m.movie_id NOT IN (SELECT movie_id FROM reviews WHERE user_id = :uid)
                  AND EXISTS (
                      SELECT 1 FROM movie_genres mg
                      WHERE mg.movie_id = m.movie_id AND mg.genre_id IN :gids
                  )
                ORDER BY m.release_year DESC, m.avg_rating DESC
                LIMIT 40
            ) AS top_recent
            ORDER BY RAND() 
            LIMIT 15
        """).bindparams(bindparam("gids", expanding=True))

        return [dict(row) for row in conn.execute(new_query, {
            "gids": genre_ids_tuple,
            "uid": user_id
        }).mappings().all()]


def get_dynamic_top_rated(user_id):
    with engine.connect() as conn:
        top_query = text("""
            SELECT * FROM (
                SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                FROM movies m
                WHERE m.avg_rating >= 4.0 
                  AND m.poster_url IS NOT NULL
                  AND m.release_year >= 1990
                  AND m.movie_id NOT IN (SELECT movie_id FROM reviews WHERE user_id = :uid)
                ORDER BY m.avg_rating DESC
                LIMIT 50
            ) AS top_all_time
            ORDER BY RAND()
            LIMIT 15
        """)
        return [dict(row) for row in conn.execute(top_query, {"uid": user_id}).mappings().all()]


def get_dynamic_recommended(genre_ids_tuple, user_id):
    if not genre_ids_tuple:
        return []
    with engine.connect() as conn:
        rec_query = text("""
            SELECT * FROM (
                SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                FROM movies m
                WHERE m.avg_rating >= 3.5 
                  AND m.poster_url IS NOT NULL
                  AND m.release_year >= 1990
                  AND m.movie_id NOT IN (SELECT movie_id FROM reviews WHERE user_id = :uid)
                  AND EXISTS (
                      SELECT 1 FROM movie_genres mg
                      WHERE mg.movie_id = m.movie_id AND mg.genre_id IN :gids
                  )
                ORDER BY m.avg_rating DESC
                LIMIT 50
            ) AS top_recs
            ORDER BY RAND() 
            LIMIT 15
        """).bindparams(bindparam("gids", expanding=True))
        return [dict(row) for row in conn.execute(rec_query, {"gids": genre_ids_tuple, "uid": user_id}).mappings().all()]


def get_dynamic_genre_movies(gid, user_id):
    with engine.connect() as conn:
        sec_query = text("""
            SELECT * FROM (
                SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                FROM movies m
                WHERE m.avg_rating >= 3.5 
                  AND m.poster_url IS NOT NULL
                  AND m.release_year >= 1990
                  AND m.movie_id NOT IN (SELECT movie_id FROM reviews WHERE user_id = :uid)
                  AND EXISTS (
                      SELECT 1 FROM movie_genres mg
                      WHERE mg.movie_id = m.movie_id AND mg.genre_id = :gid
                  )
                ORDER BY m.avg_rating DESC
                LIMIT 50
            ) AS top_genre
            ORDER BY RAND()
            LIMIT 15
        """)
        return [dict(row) for row in conn.execute(sec_query, {"gid": gid, "uid": user_id}).mappings().all()]


@home_bp.route("/home", methods=["GET"])
@token_required
def home():
    user_id = g.user_id

    try:
        with engine.connect() as conn:
            preference = conn.execute(
                text("""
                    SELECT favorite_genre
                    FROM user_preference
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {"user_id": user_id}
            ).mappings().first()

            if not preference or not preference["favorite_genre"]:
                return jsonify({"error": "User preferences not found"}), 404

            selected_genres = [genre.strip() for genre in preference["favorite_genre"].split(",") if genre.strip()]
            genre_mapping = {"Sci-Fi": "Science Fiction"}
            selected_genres_db = [genre_mapping.get(g, g) for g in selected_genres]

            genre_query = text("""
                SELECT genre_id, genre_name 
                FROM genres 
                WHERE genre_name IN :genres
            """).bindparams(bindparam("genres", expanding=True))

            genre_rows = conn.execute(genre_query, {"genres": selected_genres_db}).mappings().all()
            genre_id_map = {row["genre_name"]: row["genre_id"] for row in genre_rows}
            genre_ids = list(genre_id_map.values())
            genre_ids_tuple = tuple(sorted(genre_ids))

            new_releases = get_dynamic_new_releases(genre_ids_tuple, user_id)
            top_rated = get_dynamic_top_rated(user_id)
            recommended = get_dynamic_recommended(genre_ids_tuple, user_id)

            genre_sections = []
            for genre_name in selected_genres_db:
                gid = genre_id_map.get(genre_name)
                if not gid:
                    continue
                sec_movies = get_dynamic_genre_movies(gid, user_id)
                display_name = "Sci-Fi" if genre_name == "Science Fiction" else genre_name
                genre_sections.append({"genre": display_name, "movies": sec_movies})

            featured_movies = new_releases[:5] if new_releases else top_rated[:5]

            dynamic_genre_name = random.choice(selected_genres_db) if selected_genres_db else None
            because_you_love = []

            if dynamic_genre_name:
                dyn_gid = genre_id_map.get(dynamic_genre_name)
                if dyn_gid:
                    dyn_query = text("""
                        SELECT * FROM (
                            SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                            FROM movies m
                            WHERE m.avg_rating >= 3.5
                              AND m.poster_url IS NOT NULL
                              AND m.release_year >= 1990
                              AND m.movie_id NOT IN (SELECT movie_id FROM reviews WHERE user_id = :uid)
                              AND EXISTS (
                                  SELECT 1 FROM movie_genres mg
                                  WHERE mg.movie_id = m.movie_id AND mg.genre_id = :gid
                              )
                            ORDER BY m.avg_rating DESC
                            LIMIT 40
                        ) AS top_because
                        ORDER BY RAND()
                        LIMIT 15
                    """)
                    because_you_love = [dict(row) for row in conn.execute(dyn_query, {"gid": dyn_gid, "uid": user_id}).mappings().all()]

            hidden_gems_query = text("""
                SELECT * FROM (
                    SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                    FROM movies m
                    WHERE m.poster_url IS NOT NULL
                      AND m.avg_rating BETWEEN 3.75 AND 4.25
                      AND m.release_year BETWEEN 1980 AND (YEAR(CURDATE()) - 1)
                      AND m.movie_id NOT IN (SELECT movie_id FROM reviews WHERE user_id = :uid)
                    ORDER BY m.avg_rating DESC
                    LIMIT 60
                ) AS top_gems
                ORDER BY RAND()
                LIMIT 15
            """)
            hidden_gems = [dict(row) for row in conn.execute(hidden_gems_query, {"uid": user_id}).mappings().all()]

        return jsonify({
            "user_id": user_id,
            "selected_genres": selected_genres,
            "featured_movies": featured_movies,
            "new_releases": new_releases,
            "recommended_for_you": recommended,
            "top_rated": top_rated,
            "genre_sections": genre_sections,
            "dynamic_genre_name": "Sci-Fi" if dynamic_genre_name == "Science Fiction" else dynamic_genre_name,
            "because_you_love": because_you_love,
            "hidden_gems": hidden_gems
        }), 200

    except Exception as e:
        current_app.logger.error(f"HOME API ERROR: {e}")
        return jsonify({"error": "Failed to load home data"}), 500


# =====================================================================
# 🎬 YOUTUBE TRAILER ROUTE (FIX N8: Bounded cache + Auth + Limiter)
# =====================================================================
@home_bp.route("/movie/trailer", methods=["GET"])
@token_required
@limiter.limit("20 per minute")
def get_movie_trailer():
    movie_title = (request.args.get("title") or "").strip()
    release_year = (request.args.get("year") or "").strip()

    if not movie_title:
        return jsonify({"error": "Movie title is required"}), 400

    cache_key = (movie_title.lower(), release_year)
    if cache_key in _trailer_cache:
        return jsonify({"videoId": _trailer_cache[cache_key]}), 200

    API_KEY = os.getenv("YOUTUBE_API_KEY")
    if not API_KEY:
        return jsonify({"error": "YouTube API key not configured"}), 503

    search_query = f"{movie_title} {release_year} official trailer".strip()
    youtube_url = "https://www.googleapis.com/youtube/v3/search"

    params = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "maxResults": 1,
        "key": API_KEY
    }

    try:
        response = requests.get(youtube_url, params=params, timeout=5)
        data = response.json()

        if "items" in data and len(data["items"]) > 0:
            video_id = data["items"][0]["id"]["videoId"]
            _trailer_cache[cache_key] = video_id
            return jsonify({"videoId": video_id}), 200
        else:
            return jsonify({"error": "Trailer not found"}), 404

    except Exception as e:
        current_app.logger.error(f"Trailer Error: {e}")
        return jsonify({"error": "Failed to fetch trailer"}), 500


# =====================================================================
# 💬 REVIEW COMMENTS & REVIEWS API
# =====================================================================
@home_bp.route("/reviews/<int:review_id>/comments", methods=["GET"])
def get_review_comments(review_id):
    with engine.connect() as conn:
        comments = conn.execute(text("""
            SELECT rc.comment_id, rc.user_id, rc.comment_text, rc.created_at, u.username 
            FROM review_comments rc
            JOIN users u ON rc.user_id = u.user_id
            WHERE rc.review_id = :rid
            ORDER BY rc.created_at ASC
        """), {"rid": review_id}).mappings().all()
    return jsonify([dict(c) for c in comments]), 200


@home_bp.route("/reviews/<int:review_id>/comments", methods=["POST"])
@token_required
def add_review_comment(review_id):
    user_id = int(g.user_id)
    data = request.get_json() or {}
    comment_text = str(data.get("comment_text") or "").strip()

    if not comment_text:
        return jsonify({"error": "Comment text is required"}), 400

    if len(comment_text) > 500:
        return jsonify({"error": "Comment cannot exceed 500 characters"}), 400

    with engine.begin() as conn:
        review_exists = conn.execute(
            text("SELECT review_id FROM reviews WHERE review_id = :rid"),
            {"rid": review_id}
        ).first()
        if not review_exists:
            return jsonify({"error": "Review not found"}), 404

        conn.execute(text("""
            INSERT INTO review_comments (review_id, user_id, comment_text) 
            VALUES (:rid, :uid, :txt)
        """), {"rid": review_id, "uid": user_id, "txt": comment_text})

    return jsonify({"message": "Comment added successfully!"}), 201


@home_bp.route("/movie/<int:movie_id>/reviews", methods=["GET"])
def get_reviews_for_movie(movie_id):
    with engine.connect() as conn:
        reviews_query = text("""
            SELECT r.review_id, r.user_id, r.review_text, r.rating, r.likes, r.created_at, r.is_spoiler, u.username 
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.movie_id = :mid
            ORDER BY r.created_at DESC
        """)
        reviews = [dict(row) for row in conn.execute(reviews_query, {"mid": movie_id}).mappings().all()]

        if reviews:
            review_ids = tuple(r["review_id"] for r in reviews)
            comments_query = text("""
                SELECT rc.comment_id, rc.review_id, rc.user_id, rc.comment_text, rc.created_at, u.username 
                FROM review_comments rc
                JOIN users u ON rc.user_id = u.user_id
                WHERE rc.review_id IN :rids
                ORDER BY rc.created_at ASC
            """).bindparams(bindparam("rids", expanding=True))

            all_comments = conn.execute(comments_query, {"rids": review_ids}).mappings().all()
            comments_by_review = {}
            for c in all_comments:
                comments_by_review.setdefault(c["review_id"], []).append(dict(c))

            for r in reviews:
                r["comments"] = comments_by_review.get(r["review_id"], [])

    return jsonify({"reviews": reviews}), 200


@home_bp.route("/comments/<int:comment_id>", methods=["DELETE"])
@token_required
def delete_review_comment(comment_id):
    user_id = int(g.user_id)

    with engine.begin() as conn:
        result = conn.execute(text("""
            DELETE FROM review_comments 
            WHERE comment_id = :cid AND user_id = :uid
        """), {"cid": comment_id, "uid": user_id})

        if result.rowcount == 0:
            return jsonify({"error": "Comment not found or unauthorized"}), 403

    return jsonify({"message": "Comment deleted successfully!"}), 200


# =====================================================================
# 🎲 SURPRISE ME ROUTE
# =====================================================================
@home_bp.route("/movie/surprise", methods=["GET"])
@token_required
def get_surprise_movie():
    user_id = g.user_id
    try:
        with engine.connect() as conn:
            preference = conn.execute(
                text("SELECT favorite_genre FROM user_preference WHERE user_id = :uid LIMIT 1"),
                {"uid": user_id}
            ).mappings().first()

            movie = None

            if preference and preference["favorite_genre"]:
                selected_genres = [g.strip() for g in preference["favorite_genre"].split(",") if g.strip()]
                genre_mapping = {"Sci-Fi": "Science Fiction"}
                selected_genres_db = [genre_mapping.get(g, g) for g in selected_genres]

                query = text("""
                    SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.avg_rating 
                    FROM movies m
                    WHERE m.avg_rating >= 3.5 
                      AND m.poster_url IS NOT NULL
                      AND m.release_year >= 2000
                      AND EXISTS (
                          SELECT 1 FROM movie_genres mg
                          JOIN genres g ON mg.genre_id = g.genre_id
                          WHERE mg.movie_id = m.movie_id AND g.genre_name IN :genres
                      )
                    ORDER BY RAND() LIMIT 1
                """).bindparams(bindparam("genres", expanding=True))

                movie = conn.execute(query, {"genres": selected_genres_db}).mappings().first()

            if not movie:
                fallback_query = text("""
                    SELECT movie_id, title, poster_url, release_year, avg_rating 
                    FROM movies 
                    WHERE avg_rating >= 3.5 
                      AND poster_url IS NOT NULL 
                      AND release_year >= 2000 
                    ORDER BY RAND() LIMIT 1
                """)
                movie = conn.execute(fallback_query).mappings().first()

            if movie:
                return jsonify(dict(movie)), 200
            else:
                return jsonify({"error": "No movie found"}), 404

    except Exception as e:
        current_app.logger.error(f"Surprise Error: {e}")
        return jsonify({"error": "Failed to fetch surprise movie"}), 500