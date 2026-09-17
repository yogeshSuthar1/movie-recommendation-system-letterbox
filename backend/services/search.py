import os
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Variables ko None set kar do
movies = None
prefix_index = None

def load_search_models():
    global movies, prefix_index
    # Agar model pehle se load nahi hai, tabhi load karo
    if movies is None or prefix_index is None:
        print("⏳ Loading Search Models...")
        movies = joblib.load(os.path.join(MODELS_DIR, "movies.pkl"))
        prefix_index = joblib.load(os.path.join(MODELS_DIR, "prefix_index.pkl"))
        print("✅ Search Models Loaded!")

def search_movies(query, limit=20):
    # Function call hote hi pehle ensure karo ki models loaded hain
    load_search_models()

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