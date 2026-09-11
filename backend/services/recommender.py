import os
import joblib
import threading
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Global variables
movies = None
movie_index = None
tfidf_matrix = None
knn = None
is_loading = False  # Track karne ke liye ki model load ho raha hai ya nahi

# 🌟 1. Background loading function
def _load_models_task():
    global movies, movie_index, tfidf_matrix, knn, is_loading
    
    if movies is not None:
        return
        
    print("⏳ [Background Thread] ML Models loading started silently...")
    try:
        movies = joblib.load(os.path.join(MODELS_DIR, "movies.pkl"))
        movie_index = joblib.load(os.path.join(MODELS_DIR, "movie_index.pkl"))
        tfidf_matrix = joblib.load(os.path.join(MODELS_DIR, "tfidf_matrix.pkl"))
        knn = joblib.load(os.path.join(MODELS_DIR, "recommendation_model.pkl"))
        print("✅ [Background Thread] ML Models Loaded! First click will be instant now.")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
    finally:
        is_loading = False

# 🌟 2. Server start hote hi background thread chalu kar do (PowerShell block nahi hoga)
is_loading = True
threading.Thread(target=_load_models_task, daemon=True).start()


# 🌟 3. Main Recommend Function
def recommend(movie_name, start=0, limit=20):
    global is_loading, movies, movie_index, tfidf_matrix, knn

    # Agar user ne itni speed mein click kiya ki background thread abhi tak complete nahi hua, toh 1-2 sec wait karo
    if is_loading or movies is None:
        print("⏳ Waiting for background models to finish loading...")
        while is_loading:
            time.sleep(0.5)

    movie_name = movie_name.lower()

    if not movie_name:
        return None

    if movie_name not in movie_index:
        return None

    idx = movie_index[movie_name]

    distances, indices = knn.kneighbors(
        tfidf_matrix[idx],
        n_neighbors=start + limit + 1
    )

    indices = indices[0][1:]
    distances = distances[0][1:]

    recommendations = movies.iloc[indices].copy()
    recommendations["similarity"] = 1 - distances

    return recommendations.iloc[start:start+limit][
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