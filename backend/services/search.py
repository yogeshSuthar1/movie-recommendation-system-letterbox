import os
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

movies = joblib.load(os.path.join(MODELS_DIR, "movies.pkl"))
prefix_index = joblib.load(os.path.join(MODELS_DIR, "prefix_index.pkl"))


def search_movies(query, limit=10):

    query = query.lower().strip()

    if query == "":
        return []

    indices = prefix_index.get(query, [])[:limit]

    result = movies.iloc[indices][
        [
            "movie_id",
            "title",
            "release_year",
            "poster_url"
        ]
    ]

    return result.to_dict(orient="records")