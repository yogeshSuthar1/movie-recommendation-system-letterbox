from sqlalchemy import text
from backend.database import engine




def get_movie(movie_id):

    query = text("""
        SELECT
            movie_id,
            title,
            release_year,
            tagline,
            overview,
            runtime_minutes,
            avg_rating,
            poster_url
        FROM movies
        WHERE movie_id = :movie_id
    """)

    with engine.connect() as conn:
        movie = conn.execute(
            query,
            {"movie_id": movie_id}
        ).mappings().first()

    if movie is None:
        return None

    movie = dict(movie)

    movie["genres"] = get_movie_genres(movie_id)
    movie["directors"] = get_movie_directors(movie_id)
    movie["cast"] = get_movie_cast(movie_id)
    movie["languages"] = get_movie_languages(movie_id)
    movie["countries"] = get_movie_countries(movie_id)
    movie["producers"] = get_movie_producers(movie_id)
    movie["themes"] = get_movie_themes(movie_id)

    return movie

def get_movie_genres(movie_id):

    query = text("""
        SELECT g.genre_name
        FROM movie_genres mg
        JOIN genres g
            ON mg.genre_id = g.genre_id
        WHERE mg.movie_id = :movie_id
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            query,
            {"movie_id": movie_id}
        ).fetchall()

    return [row[0] for row in rows]

def get_movie_directors(movie_id):

    query = text("""
        SELECT d.director_name
        FROM movie_directors md
        JOIN directors d
            ON md.director_id = d.director_id
        WHERE md.movie_id = :movie_id
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            query,
            {"movie_id": movie_id}
        ).fetchall()

    return [row[0] for row in rows]

def get_movie_cast(movie_id):

    query = text("""
        SELECT
            a.actor_name,
            ma.role
        FROM movie_actors ma
        JOIN actors a
            ON ma.actor_id = a.actor_id
        WHERE ma.movie_id = :movie_id
        LIMIT 20
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            query,
            {"movie_id": movie_id}
        ).mappings().all()

    return [dict(row) for row in rows]

def get_movie_languages(movie_id):

    query = text("""
        SELECT l.language_name
        FROM movie_languages ml
        JOIN languages l
            ON ml.language_id = l.language_id
        WHERE ml.movie_id = :movie_id
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            query,
            {"movie_id": movie_id}
        ).fetchall()

    return [row[0] for row in rows]

def get_movie_countries(movie_id):

    query = text("""
        SELECT c.country_name
        FROM movie_countries mc
        JOIN countries c
            ON mc.country_id = c.country_id
        WHERE mc.movie_id = :movie_id
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            query,
            {"movie_id": movie_id}
        ).fetchall()

    return [row[0] for row in rows]

def get_movie_producers(movie_id):

    query = text("""
        SELECT p.producer_name
        FROM movie_producers mp
        JOIN producers p
            ON mp.producer_id = p.producer_id
        WHERE mp.movie_id = :movie_id
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            query,
            {"movie_id": movie_id}
        ).fetchall()

    return [row[0] for row in rows]

def get_movie_themes(movie_id):

    query = text("""
        SELECT t.theme_name
        FROM movie_themes mt
        JOIN themes t
            ON mt.theme_id = t.theme_id
        WHERE mt.movie_id = :movie_id
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            query,
            {"movie_id": movie_id}
        ).fetchall()

    return [row[0] for row in rows]