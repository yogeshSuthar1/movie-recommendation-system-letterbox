import random
from flask import Blueprint, jsonify, g, request
from sqlalchemy import text, bindparam
from backend.database import engine
from backend.middleware.auth_middleware import token_required
from datetime import datetime
from dotenv import load_dotenv
import os
import requests

# 🌟 Load environment variables at the very top
load_dotenv()


# 🌟 Single Blueprint Declaration for all home and trailer routes
home_bp = Blueprint("home", __name__)

# =====================================================================
# 🚀 DYNAMIC HELPER FUNCTIONS (SMART SHUFFLING: TOP 50 POOL -> RAND)
# =====================================================================

def get_dynamic_new_releases(genre_ids_tuple):
    if not genre_ids_tuple:
        return []
    with engine.connect() as conn:
        new_query = text("""
            SELECT * FROM (
                SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                FROM movies m
                WHERE m.avg_rating >= 3.0 
                  AND m.poster_url IS NOT NULL
                  AND m.release_year >= 2023
                  AND EXISTS (
                      SELECT 1 FROM movie_genres mg
                      WHERE mg.movie_id = m.movie_id AND mg.genre_id IN :gids
                  )
                ORDER BY m.avg_rating DESC
                LIMIT 40
            ) AS top_recent
            ORDER BY RAND() 
            LIMIT 15
        """).bindparams(bindparam("gids", expanding=True))
        return [dict(row) for row in conn.execute(new_query, {"gids": genre_ids_tuple}).mappings().all()]

def get_dynamic_top_rated():
    with engine.connect() as conn:
        top_query = text("""
            SELECT * FROM (
                SELECT movie_id, title, release_year, overview, avg_rating, poster_url
                FROM movies
                WHERE avg_rating >= 4.0 
                  AND poster_url IS NOT NULL
                  AND release_year >= 1990
                ORDER BY avg_rating DESC
                LIMIT 50
            ) AS top_all_time
            ORDER BY RAND()
            LIMIT 15
        """)
        return [dict(row) for row in conn.execute(top_query).mappings().all()]

def get_dynamic_recommended(genre_ids_tuple):
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
        return [dict(row) for row in conn.execute(rec_query, {"gids": genre_ids_tuple}).mappings().all()]

def get_dynamic_genre_movies(gid):
    with engine.connect() as conn:
        sec_query = text("""
            SELECT * FROM (
                SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                FROM movies m
                WHERE m.avg_rating >= 3.5 
                  AND m.poster_url IS NOT NULL
                  AND m.release_year >= 1990
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
        return [dict(row) for row in conn.execute(sec_query, {"gid": gid}).mappings().all()]

# =====================================================================
# 🏠 MAIN HOME ROUTE
# =====================================================================

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
            genre_id_map = {row['genre_name']: row['genre_id'] for row in genre_rows}
            genre_ids = list(genre_id_map.values())
            genre_ids_tuple = tuple(sorted(genre_ids))
            
            new_releases = get_dynamic_new_releases(genre_ids_tuple)
            top_rated = get_dynamic_top_rated()
            recommended = get_dynamic_recommended(genre_ids_tuple)

            genre_sections = []
            for genre_name in selected_genres_db:
                gid = genre_id_map.get(genre_name)
                if not gid:
                    continue
                sec_movies = get_dynamic_genre_movies(gid)
                display_name = "Sci-Fi" if genre_name == "Science Fiction" else genre_name
                genre_sections.append({"genre": display_name, "movies": sec_movies})

            featured_movies = new_releases[:5] if new_releases else []

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
                    because_you_love = [dict(row) for row in conn.execute(dyn_query, {"gid": dyn_gid}).mappings().all()]

            hidden_gems_query = text("""
                SELECT * FROM (
                    SELECT movie_id, title, release_year, overview, avg_rating, poster_url
                    FROM movies
                    WHERE poster_url IS NOT NULL
                    ORDER BY avg_rating DESC
                    LIMIT 40
                ) AS top_gems
                ORDER BY RAND()
                LIMIT 15
            """)
            hidden_gems = [dict(row) for row in conn.execute(hidden_gems_query).mappings().all()]
            
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
        print("HOME API ERROR:", e)
        return jsonify({"error": "Failed to load home data", "details": str(e)}), 500


# =====================================================================
# 🎬 YOUTUBE TRAILER ROUTE (FINAL FIX - BINA .ENV KE)
# =====================================================================

@home_bp.route("/movie/trailer", methods=["GET"])
def get_movie_trailer():
    movie_title = request.args.get("title")
    release_year = request.args.get("year", "")
    print(f"🎬 Trailer requested for: {movie_title} ({release_year})") 

    # 🔥 Yahan "AIzaSy..." ki jagah APNI ASLI YOUTUBE API KEY daal de!
    API_KEY = os.getenv("YOUTUBE_API_KEY")

    if not movie_title:
        return jsonify({"error": "Movie title is required"}), 400

    search_query = f"{movie_title} {release_year} official trailer"
    youtube_url = "https://www.googleapis.com/youtube/v3/search"
    
    params = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "maxResults": 1,
        "key": API_KEY
    }

    try:
        # YouTube ko request ja rahi hai
        response = requests.get(youtube_url, params=params)
        data = response.json()

        # Ab terminal mein real status code print hoga (200, 403, ya 400)
        print("YouTube API Status:", response.status_code)

        if "items" in data and len(data["items"]) > 0:
            video_id = data["items"][0]["id"]["videoId"]
            return jsonify({"videoId": video_id}), 200
        else:
            # Agar key galat hui ya API enable nahi hui, toh yahan reason print hoga
            print("YouTube API Error Details:", data)
            return jsonify({"error": "Trailer not found"}), 404

    except Exception as e:
        print("System Error:", e)
        return jsonify({"error": "Failed to fetch trailer"}), 500

# =====================================================================
# 🧭 EXPLORE PAGE API
# =====================================================================
@home_bp.route("/explore/movies", methods=["GET"])
def explore_movies():
    genre = request.args.get("genre", "All")
    sort_by = request.args.get("sort_by", "Newest")
    lang = request.args.get("lang", "All")
    duration = request.args.get("duration", "All")
    decade = request.args.get("decade", "All")
    
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    current_year = datetime.now().year

    try:
        with engine.connect() as conn:
            query_str = """
                SELECT m.movie_id, m.title, m.release_year, m.avg_rating, m.poster_url
                FROM movies m
            """
            params = {"limit": limit, "offset": offset, "current_year": current_year}
            
            if genre and genre != "All":
                query_str += """
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                JOIN genres g ON mg.genre_id = g.genre_id
                """

            query_str += " WHERE m.poster_url IS NOT NULL AND m.release_year <= :current_year "

            if genre and genre != "All":
                query_str += " AND g.genre_name = :genre "
                params["genre"] = genre

            if lang != "All":
                query_str += """
                AND EXISTS (
                    SELECT 1 FROM movie_languages ml
                    JOIN languages l ON ml.language_id = l.language_id
                    WHERE ml.movie_id = m.movie_id AND l.language_name = :lang
                )
                """
                params["lang"] = lang

            if duration != "All":
                if duration == "Under 90m":
                    query_str += " AND m.runtime_minutes < 90 "
                elif duration == "90-120m":
                    query_str += " AND m.runtime_minutes BETWEEN 90 AND 120 "
                elif duration == "120m+":
                    query_str += " AND m.runtime_minutes > 120 "

            if decade != "All":
                if decade == "2020s":
                    query_str += " AND m.release_year >= 2020 "
                elif decade == "2010s":
                    query_str += " AND m.release_year BETWEEN 2010 AND 2019 "
                elif decade == "2000s":
                    query_str += " AND m.release_year BETWEEN 2000 AND 2009 "
                elif decade == "Classic":
                    query_str += " AND m.release_year < 2000 "

            if sort_by == "Newest":
                query_str += " ORDER BY m.release_year DESC "
            elif sort_by == "Top Rated":
                query_str += " ORDER BY m.avg_rating DESC "
            elif sort_by == "A-Z":
                query_str += " ORDER BY m.title ASC "

            query_str += " LIMIT :limit OFFSET :offset"

            movies = conn.execute(text(query_str), params).mappings().all()

        return jsonify({
            "page": page,
            "movies": [dict(m) for m in movies],
            "has_more": len(movies) == limit
        }), 200

    except Exception as e:
        print("Explore API Error:", e)
        return jsonify({"error": str(e)}), 500


# =====================================================================
# 💬 REVIEW COMMENTS & REVIEWS API
# =====================================================================
@home_bp.route("/reviews/<int:review_id>/comments", methods=["GET", "POST"])
def review_comments(review_id):
    if request.method == "GET":
        with engine.connect() as conn:
            comments = conn.execute(text("""
                SELECT rc.comment_id, rc.comment_text, rc.created_at, u.username 
                FROM review_comments rc
                JOIN users u ON rc.user_id = u.user_id
                WHERE rc.review_id = :rid
                ORDER BY rc.created_at DESC
            """), {"rid": review_id}).mappings().all()
        return jsonify([dict(c) for c in comments]), 200

    elif request.method == "POST":
        data = request.get_json()
        user_id = data.get("user_id")
        comment_text = data.get("comment_text")

        if not user_id or not comment_text:
            return jsonify({"error": "Missing user_id or comment_text"}), 400

        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO review_comments (review_id, user_id, comment_text) 
                VALUES (:rid, :uid, :txt)
            """), {"rid": review_id, "uid": user_id, "txt": comment_text})
        
        return jsonify({"message": "Comment added successfully!"}), 201

@home_bp.route("/movie/<int:movie_id>/reviews", methods=["GET"])
def get_reviews(movie_id):
    with engine.connect() as conn:
        reviews_query = text("""
            SELECT r.review_id, r.user_id, r.review_text, r.rating, r.likes, r.created_at, r.is_spoiler, u.username 
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.movie_id = :mid
            ORDER BY r.created_at DESC
        """)
        reviews = [dict(row) for row in conn.execute(reviews_query, {"mid": movie_id}).mappings().all()]

        for review in reviews:
            comments_query = text("""
                SELECT rc.comment_id, rc.comment_text, rc.created_at, u.username 
                FROM review_comments rc
                JOIN users u ON rc.user_id = u.user_id
                WHERE rc.review_id = :rid
                ORDER BY rc.created_at ASC
            """)
            comments = [dict(c) for c in conn.execute(comments_query, {"rid": review["review_id"]}).mappings().all()]
            review["comments"] = comments  

    return jsonify({"reviews": reviews}), 200

@home_bp.route("/comments/<int:comment_id>", methods=["DELETE"])
def delete_review_comment(comment_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")

    with engine.begin() as conn:
        conn.execute(text("""
            DELETE FROM review_comments WHERE comment_id = :cid
        """), {"cid": comment_id})
    
    return jsonify({"message": "Comment deleted successfully!"}), 200


# =====================================================================
# 🎲 SURPRISE ME ROUTE (BULLETPROOF FIX)
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

            # Agar user ki preference hai
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

            # Agar preference nahi hai, YA FIR preference wali query se koi movie nahi mili (Fallback)
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

            # Final Return
            if movie:
                return jsonify(dict(movie)), 200
            else:
                return jsonify({"error": "No movie found"}), 404

    except Exception as e:
        print("Surprise Error:", e)
        return jsonify({"error": "Failed to fetch surprise movie"}), 500