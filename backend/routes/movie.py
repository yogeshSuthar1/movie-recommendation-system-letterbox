from flask import Blueprint, jsonify
from sqlalchemy import text
from backend.database import engine
from backend.services.recommender import recommend


movie_bp = Blueprint("movie", __name__)

@movie_bp.route("/movie/<int:movie_id>", methods=["GET"])
def get_movie_detail(movie_id):
    try:
        with engine.connect() as conn:
            # 1. Fetch Basic Movie Info
            movie_query = text("""
                SELECT movie_id, title, release_year, runtime_minutes, overview, avg_rating, poster_url 
                FROM movies 
                WHERE movie_id = :movie_id
            """)
            movie = conn.execute(movie_query, {"movie_id": movie_id}).mappings().first()
            
            if not movie:
                return jsonify({"error": "Movie not found"}), 404
                
            movie_dict = dict(movie)

            # 2. Fetch Genres
            genre_query = text("""
                SELECT g.genre_name 
                FROM genres g
                JOIN movie_genres mg ON g.genre_id = mg.genre_id
                WHERE mg.movie_id = :movie_id
            """)
            movie_dict['genres'] = [row['genre_name'] for row in conn.execute(genre_query, {"movie_id": movie_id}).mappings().all()]

            # 3. Fetch Cast
            cast_query = text("""
                SELECT a.actor_id, a.actor_name
                FROM actors a
                JOIN movie_actors ma ON a.actor_id = ma.actor_id
                WHERE ma.movie_id = :movie_id
                LIMIT 8
            """)
            movie_dict['cast'] = [{"id": row['actor_id'], "name": row['actor_name'], "role": "Actor"} for row in conn.execute(cast_query, {"movie_id": movie_id}).mappings().all()]

            # 4. Fetch Director
            dir_query = text("""
                SELECT d.director_name 
                FROM directors d
                JOIN movie_directors md ON d.director_id = md.director_id
                WHERE md.movie_id = :movie_id
                LIMIT 1
            """)
            director = conn.execute(dir_query, {"movie_id": movie_id}).mappings().first()
            movie_dict['director'] = director['director_name'] if director else "Unknown"

            # ----------------------------------------------------
            # 5. MORE LIKE THIS (ML + SQL FALLBACK)
            # ----------------------------------------------------
            similar_movies = []
            
            # A. Try fetching recommendations from YOUR ML Model using Movie Title
            ml_df = recommend(movie_dict['title'], start=0, limit=12)
            
            if ml_df is not None and not ml_df.empty:
                print(f"🎯 ML Recommendations triggered for {movie_dict['title']}")
                # Convert Pandas DataFrame directly to list of dictionaries for JSON
                similar_movies = ml_df.to_dict(orient="records")
                
            # B. If ML returns nothing (Cold Start/Title Mismatch), Fallback to SQL
            elif movie_dict['genres']:
                print(f"⚠️ ML failed, falling back to SQL for {movie_dict['title']}")
                sim_query = text("""
                    SELECT m.movie_id, m.title, m.poster_url, m.avg_rating, COUNT(mg.genre_id) as shared_genres
                    FROM movies m
                    JOIN movie_genres mg ON m.movie_id = mg.movie_id
                    WHERE mg.genre_id IN (
                        SELECT genre_id FROM movie_genres WHERE movie_id = :movie_id
                    )
                    AND m.movie_id != :movie_id
                    AND m.poster_url IS NOT NULL
                    GROUP BY m.movie_id, m.title, m.poster_url, m.avg_rating, m.release_year
                    ORDER BY shared_genres DESC, m.release_year DESC
                    LIMIT 4
                """)
                similar_movies = [dict(row) for row in conn.execute(sim_query, {"movie_id": movie_id}).mappings().all()]
            
            movie_dict['recommendations'] = similar_movies

        return jsonify(movie_dict), 200

    except Exception as e:
        print("MOVIE DETAIL API ERROR:", e)
        return jsonify({"error": str(e)}), 500


@movie_bp.route("/actor/<string:actor_name>", methods=["GET"])
def get_actor_movies(actor_name):
    # 'as Barbie' ya extra text hataane ke liye sirf main naam le lo
    clean_actor_name = actor_name.split(" as ")[0].strip()

    with engine.connect() as conn:
        movies = conn.execute(
            text("""
                SELECT DISTINCT m.movie_id, m.title, m.release_year, m.avg_rating, m.poster_url 
                FROM movies m
                JOIN movie_actors ma ON m.movie_id = ma.movie_id
                JOIN actors a ON ma.actor_id = a.actor_id
                WHERE a.actor_name LIKE :actor
                LIMIT 20
            """),
            {"actor": f"%{clean_actor_name}%"}
        ).mappings().all()

    return jsonify([dict(m) for m in movies]), 200