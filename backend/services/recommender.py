# File Path: backend/services/recommender.py
import os
import joblib
import threading
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

movies = None
movie_index = None
movie_id_to_idx = None
tfidf_matrix = None
knn = None
models_available = True

model_lock = threading.Lock()


def load_recommender_models():
    global movies, movie_index, movie_id_to_idx, tfidf_matrix, knn, models_available

    if not models_available:
        return False

    if movies is None:
        with model_lock:
            if movies is None:
                try:
                    required_files = [
                        "movies.pkl",
                        "movie_index.pkl",
                        "tfidf_matrix.pkl",
                        "recommendation_model.pkl"
                    ]
                    for fname in required_files:
                        if not os.path.exists(os.path.join(MODELS_DIR, fname)):
                            print(f"⚠️ ML Model file missing: {fname}. Using SQL fallback.")
                            models_available = False
                            return False

                    print("⏳ Loading ML Recommendation Models...")
                    movies = joblib.load(os.path.join(MODELS_DIR, "movies.pkl"))
                    movie_index = joblib.load(os.path.join(MODELS_DIR, "movie_index.pkl"))
                    tfidf_matrix = joblib.load(os.path.join(MODELS_DIR, "tfidf_matrix.pkl"))
                    knn = joblib.load(os.path.join(MODELS_DIR, "recommendation_model.pkl"))

                    # 🚀 P3 FIX #26: Build exact movie_id -> row position lookup map
                    if isinstance(movies, pd.DataFrame) and "movie_id" in movies.columns:
                        movie_id_to_idx = {
                            int(mid): pos for pos, mid in enumerate(movies["movie_id"].tolist())
                        }
                    else:
                        movie_id_to_idx = {}

                    print("✅ ML Recommendation Models Loaded Exactly ONCE!")
                except Exception as e:
                    print(f"⚠️ Failed to load ML models ({e}). Using SQL fallback.")
                    models_available = False
                    return False
    return True


def recommend(movie_name, start=0, limit=20, movie_id=None):
    global movies, movie_index, movie_id_to_idx, tfidf_matrix, knn

    if not load_recommender_models():
        return None

    idx = None

    # 🚀 P3 FIX #26: Prefer exact movie_id lookup first so remakes/duplicate titles never collide
    if movie_id is not None and movie_id_to_idx:
        idx = movie_id_to_idx.get(int(movie_id))

    # Fallback to title lookup if movie_id was not provided or not found
    if idx is None:
        if not movie_name:
            return None
        clean_name = movie_name.lower().strip()
        if clean_name not in movie_index:
            return None
        idx = movie_index[clean_name]
        if isinstance(idx, pd.Series):
            idx = int(idx.iloc[0])

    distances, indices = knn.kneighbors(
        tfidf_matrix[idx],
        n_neighbors=start + limit + 1
    )

    indices = indices[0][1:]
    distances = distances[0][1:]

    recommendations = movies.iloc[indices].copy()
    recommendations["similarity"] = 1 - distances

    return recommendations.iloc[start:start + limit][
        [
            "movie_id",
            "title",
            "release_year",
            "avg_rating",
            "genres",
            "similarity",
            "poster_url"
        ]
    ].fillna(0)