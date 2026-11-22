# File Path: backend/routes/movie.py
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import text, bindparam
from backend.database import engine
from backend.services.recommender import recommend

movie_bp = Blueprint("movie", __name__)


def escape_like(val: str) -> str:
    return val.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


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
            movie_dict["genres"] = [
                row["genre_name"]
                for row in conn.execute(genre_query, {"movie_id": movie_id}).mappings().all()
            ]

            # 3. Fetch Cast (Including role if available)
            cast_query = text("""
                SELECT a.actor_id, a.actor_name, ma.role
                FROM actors a
                JOIN movie_actors ma ON a.actor_id = ma.actor_id
                WHERE ma.movie_id = :movie_id
                LIMIT 8
            """)
            movie_dict["cast"] = [
                {
                    "id": row["actor_id"],
                    "name": row["actor_name"],
                    "role": row["role"] or "Actor"
                }
                for row in conn.execute(cast_query, {"movie_id": movie_id}).mappings().all()
            ]

            # 4. Fetch Director
            dir_query = text("""
                SELECT d.director_name 
                FROM directors d
                JOIN movie_directors md ON d.director_id = md.director_id
                WHERE md.movie_id = :movie_id
                LIMIT 1
            """)
            director = conn.execute(dir_query, {"movie_id": movie_id}).mappings().first()
            movie_dict["director"] = director["director_name"] if director else "Unknown"

            # 🚀 FIX #36: Real star rating counts from DB (reviews + standalone ratings)
            rating_rows = conn.execute(text("""
                SELECT ROUND(rating) AS star_bucket, COUNT(*) AS cnt
                FROM (
                    SELECT user_id, rating FROM reviews WHERE movie_id = :movie_id AND rating > 0
                    UNION ALL
                    SELECT r.user_id, r.rating FROM ratings r
                    WHERE r.movie_id = :movie_id AND r.rating > 0
                      AND NOT EXISTS (
                          SELECT 1 FROM reviews rev WHERE rev.movie_id = r.movie_id AND rev.user_id = r.user_id
                      )
                ) AS combined_ratings
                GROUP BY ROUND(rating)
            """), {"movie_id": movie_id}).mappings().all()

            rating_counts = {str(star): 0 for star in range(1, 6)}
            for r_row in rating_rows:
                bucket = int(r_row["star_bucket"] or 0)
                if 1 <= bucket <= 5:
                    rating_counts[str(bucket)] = int(r_row["cnt"])
            movie_dict["rating_counts"] = rating_counts

            # 5. MORE LIKE THIS (ML by movie_id + SQL Fallback)
            similar_movies = []

            # 🚀 P3 FIX #26: Pass both title and movie_id so remakes don't collide
            ml_df = recommend(movie_dict["title"], start=0, limit=15, movie_id=movie_id)

            if ml_df is not None and not ml_df.empty:
                ml_ids = [int(x) for x in ml_df["movie_id"].tolist() if int(x) != int(movie_id)]

                if ml_ids:
                    # 🚀 P2 FIX #24: Parameterized expanding bindparam instead of f-string
                    valid_recs_query = text("""
                        SELECT movie_id, title, poster_url, avg_rating
                        FROM movies
                        WHERE movie_id IN :ml_ids
                          AND movie_id != :movie_id
                          AND release_year <= YEAR(CURDATE())
                          AND avg_rating > 0
                          AND poster_url IS NOT NULL
                          AND poster_url != ''
                    """).bindparams(bindparam("ml_ids", expanding=True))

                    valid_recs = [
                        dict(row)
                        for row in conn.execute(
                            valid_recs_query,
                            {"ml_ids": tuple(ml_ids), "movie_id": movie_id}
                        ).mappings().all()
                    ]

                    valid_recs_dict = {rec["movie_id"]: rec for rec in valid_recs}
                    similar_movies = [
                        valid_recs_dict[ml_id] for ml_id in ml_ids if ml_id in valid_recs_dict
                    ]

            # Fallback to SQL Genre Matching if ML unavailable or filtered out
            if not similar_movies and movie_dict["genres"]:
                sim_query = text("""
                    SELECT m.movie_id, m.title, m.poster_url, m.avg_rating, COUNT(mg.genre_id) as shared_genres
                    FROM movies m
                    JOIN movie_genres mg ON m.movie_id = mg.movie_id
                    WHERE mg.genre_id IN (
                        SELECT genre_id FROM movie_genres WHERE movie_id = :movie_id
                    )
                    AND m.movie_id != :movie_id
                    AND m.release_year <= YEAR(CURDATE())
                    AND m.avg_rating > 0
                    AND m.poster_url IS NOT NULL
                    AND m.poster_url != ''
                    GROUP BY m.movie_id, m.title, m.poster_url, m.avg_rating, m.release_year
                    ORDER BY shared_genres DESC, m.avg_rating DESC
                    LIMIT 8
                """)
                similar_movies = [
                    dict(row)
                    for row in conn.execute(sim_query, {"movie_id": movie_id}).mappings().all()
                ]

            movie_dict["recommendations"] = similar_movies

        return jsonify(movie_dict), 200

    except Exception as e:
        current_app.logger.error(f"MOVIE DETAIL API ERROR: {e}")
        # 🚀 P2 FIX #19: Generic error message instead of leaking str(e)
        return jsonify({"error": "Failed to fetch movie details"}), 500


@movie_bp.route("/actor/<string:actor_name>", methods=["GET"])
def get_actor_movies(actor_name):
    clean_actor_name = actor_name.split(" as ")[0].strip()

    # 🚀 P1 FIX #17: Prevent page < 1 negative offset crash
    raw_page = request.args.get("page", 1, type=int)
    page = max(1, raw_page if raw_page is not None else 1)
    sort_by = request.args.get("sort_by", "year")

    limit = 20
    offset = (page - 1) * limit

    order_clause = "ORDER BY m.release_year DESC"
    if sort_by == "rating":
        order_clause = "ORDER BY m.avg_rating DESC, m.release_year DESC"

    escaped_actor = escape_like(clean_actor_name)

    with engine.connect() as conn:
        query = text(f"""
            SELECT DISTINCT m.movie_id, m.title, m.release_year, m.avg_rating, m.poster_url 
            FROM movies m
            JOIN movie_actors ma ON m.movie_id = ma.movie_id
            JOIN actors a ON ma.actor_id = a.actor_id
            WHERE a.actor_name LIKE :actor ESCAPE '\\\\'
              AND m.poster_url IS NOT NULL 
              AND m.poster_url != ''
            {order_clause}
            LIMIT :limit OFFSET :offset
        """)

        movies = conn.execute(query, {
            "actor": f"%{escaped_actor}%",
            "limit": limit,
            "offset": offset
        }).mappings().all()

    return jsonify([dict(m) for m in movies]), 200