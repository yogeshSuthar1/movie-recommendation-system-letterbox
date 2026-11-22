# File Path: backend/routes/movies.py
from flask import Blueprint, jsonify, request
from sqlalchemy import text
from backend.database import engine

movies_bp = Blueprint("movies", __name__)

@movies_bp.route("/movies", methods=["GET"])
def get_movies():
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(50, max(1, int(request.args.get("limit", 20))))
    except ValueError:
        page = 1
        limit = 20

    offset = (page - 1) * limit

    query = text("""
        SELECT
            movie_id,
            title,
            release_year,
            avg_rating,
            poster_url
        FROM movies
        ORDER BY avg_rating DESC, movie_id ASC
        LIMIT :limit OFFSET :offset
    """)

    with engine.connect() as conn:
        movies = conn.execute(
            query,
            {
                "limit": limit,
                "offset": offset
            }
        ).mappings().all()

    return jsonify({
        "page": page,
        "limit": limit,
        "movies": [dict(movie) for movie in movies]
    }), 200


@movies_bp.route("/movies/trending", methods=["GET"])
def trending_movies():
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(20, max(1, int(request.args.get("limit", 20))))
    except ValueError:
        page = 1
        limit = 20

    offset = (page - 1) * limit

    with engine.connect() as conn:
        movies = conn.execute(
            text("""
                SELECT
                    movie_id,
                    title,
                    release_year,
                    avg_rating,
                    poster_url
                FROM movies
                WHERE avg_rating IS NOT NULL
                ORDER BY avg_rating DESC, movie_id ASC
                LIMIT :limit OFFSET :offset
            """),
            {
                "limit": limit,
                "offset": offset
            }
        ).mappings().all()

    return jsonify({
        "page": page,
        "limit": limit,
        "total_movies": len(movies),
        "movies": [dict(movie) for movie in movies]
    }), 200


# ⚡ LIGHTNING FAST OPTIMIZED EXPLORE API
@movies_bp.route("/explore/movies", methods=["GET"])
def explore_movies():
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(50, max(1, int(request.args.get("limit", 20))))
    except ValueError:
        page = 1
        limit = 20

    offset = (page - 1) * limit

    genre = request.args.get("genre", "All")
    sort_by = request.args.get("sort_by", "Newest")
    lang = request.args.get("lang", "All")
    duration = request.args.get("duration", "All")
    decade = request.args.get("decade", "All")

    # Fast query using subqueries instead of heavy multi-joins which caused the 33s delay
    sql = """
        SELECT m.movie_id, m.title, m.release_year, m.runtime_minutes, m.avg_rating, m.poster_url
        FROM movies m
        WHERE 1=1
    """
    params = {"limit": limit, "offset": offset}

    if genre and genre != "All":
        sql += """ AND m.movie_id IN (
            SELECT mg.movie_id FROM movie_genres mg 
            JOIN genres g ON mg.genre_id = g.genre_id 
            WHERE g.genre_name = :genre
        )"""
        params["genre"] = genre

    if lang and lang != "All":
        sql += """ AND m.movie_id IN (
            SELECT ml.movie_id FROM movie_languages ml 
            JOIN languages l ON ml.language_id = l.language_id 
            WHERE l.language_name = :lang
        )"""
        params["lang"] = lang

    if duration and duration != "All":
        if duration == "Under 90m":
            sql += " AND m.runtime_minutes < 90"
        elif duration == "90-120m":
            sql += " AND m.runtime_minutes BETWEEN 90 AND 120"
        elif duration == "120m+":
            sql += " AND m.runtime_minutes > 120"

    if decade and decade != "All":
        if decade == "2020s":
            sql += " AND m.release_year BETWEEN 2020 AND 2029"
        elif decade == "2010s":
            sql += " AND m.release_year BETWEEN 2010 AND 2019"
        elif decade == "2000s":
            sql += " AND m.release_year BETWEEN 2000 AND 2009"
        elif decade == "Classic":
            sql += " AND m.release_year < 2000"

    # Sorting logic
    if sort_by == "Top Rated":
        sql += " ORDER BY m.avg_rating DESC, m.movie_id ASC"
    elif sort_by == "A-Z":
        sql += " ORDER BY m.title ASC, m.movie_id ASC"
    else:  # Newest Releases - Future years ko skip karke current/past years dikhayein
        sql += """ 
            ORDER BY CASE WHEN m.release_year > YEAR(CURDATE()) THEN 1 ELSE 0 END ASC, 
            m.release_year DESC, 
            m.movie_id ASC
        """

    sql += " LIMIT :limit OFFSET :offset"

    with engine.connect() as conn:
        result = conn.execute(text(sql), params).mappings().all()
        movies_list = [dict(row) for row in result]
        has_more = len(movies_list) == limit

    return jsonify({
        "page": page,
        "has_more": has_more,
        "movies": movies_list
    }), 200