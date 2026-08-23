from flask import Blueprint, jsonify, g
from sqlalchemy import text, bindparam
from backend.database import engine
from backend.middleware.auth_middleware import token_required

home_bp = Blueprint("home", __name__)

@home_bp.route("/home", methods=["GET"])
@token_required
def home():
    user_id = g.user_id

    try:
        with engine.connect() as conn:

            # 1. Get user preferences
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

            # 2. Pre-fetch Genre IDs
            genre_query = text("""
                SELECT genre_id, genre_name 
                FROM genres 
                WHERE genre_name IN :genres
            """).bindparams(bindparam("genres", expanding=True))
            
            genre_rows = conn.execute(genre_query, {"genres": selected_genres_db}).mappings().all()
            genre_id_map = {row['genre_name']: row['genre_id'] for row in genre_rows}
            genre_ids = list(genre_id_map.values())

        
            # 3. New Releases (Personalized: Latest Movies in User's Genres)
            # -----------------------------------------
            new_releases = []
            if genre_ids:
                new_query = text("""
                    SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                    FROM movies m
                    WHERE m.avg_rating IS NOT NULL 
                      AND m.poster_url IS NOT NULL
                      AND m.release_year IS NOT NULL
                      AND EXISTS (
                          SELECT 1 FROM movie_genres mg
                          WHERE mg.movie_id = m.movie_id AND mg.genre_id IN :gids
                      )
                    ORDER BY m.release_year DESC, m.avg_rating DESC
                    LIMIT 12
                """).bindparams(bindparam("gids", expanding=True))
                new_releases = [dict(row) for row in conn.execute(new_query, {"gids": genre_ids}).mappings().all()]

            # 4. Top Rated Movies (All Time Classics)
            top_query = text("""
                SELECT movie_id, title, release_year, overview, avg_rating, poster_url
                FROM movies
                WHERE avg_rating IS NOT NULL 
                  AND poster_url IS NOT NULL
                ORDER BY avg_rating DESC
                LIMIT 12
            """)
            top_rated = [dict(row) for row in conn.execute(top_query).mappings().all()]

            # 5. Recommended For You (Modern Movies - 2010 Onwards)
            recommended = []
            if genre_ids:
                rec_query = text("""
                    SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                    FROM movies m
                    WHERE m.avg_rating IS NOT NULL
                      AND m.poster_url IS NOT NULL
                      AND m.release_year >= 2010
                      AND EXISTS (
                          SELECT 1 FROM movie_genres mg
                          WHERE mg.movie_id = m.movie_id AND mg.genre_id IN :gids
                      )
                    ORDER BY m.avg_rating DESC
                    LIMIT 12
                """).bindparams(bindparam("gids", expanding=True))
                recommended = [dict(row) for row in conn.execute(rec_query, {"gids": genre_ids}).mappings().all()]

            # 6. Genre Sections (Modern Movies)
            genre_sections = []
            for genre_name in selected_genres_db:
                gid = genre_id_map.get(genre_name)
                if not gid:
                    continue

                sec_query = text("""
                    SELECT m.movie_id, m.title, m.release_year, m.overview, m.avg_rating, m.poster_url
                    FROM movies m
                    WHERE m.avg_rating IS NOT NULL
                      AND m.poster_url IS NOT NULL
                      AND m.release_year >= 2010
                      AND EXISTS (
                          SELECT 1 FROM movie_genres mg
                          WHERE mg.movie_id = m.movie_id AND mg.genre_id = :gid
                      )
                    ORDER BY m.avg_rating DESC
                    LIMIT 12
                """)
                sec_movies = [dict(row) for row in conn.execute(sec_query, {"gid": gid}).mappings().all()]
                display_name = "Sci-Fi" if genre_name == "Science Fiction" else genre_name
                genre_sections.append({"genre": display_name, "movies": sec_movies})

            # 7. Featured Movies for Banner (Top 5 New Releases)
            featured_movies = new_releases[:5] if new_releases else []

        return jsonify({
            "user_id": user_id,
            "selected_genres": selected_genres,
            "featured_movies": featured_movies,
            "new_releases": new_releases,
            "recommended_for_you": recommended,
            "top_rated": top_rated,
            "genre_sections": genre_sections
        }), 200

    except Exception as e:
        print("HOME API ERROR:", e)
        return jsonify({"error": "Failed to load home data", "details": str(e)}), 500