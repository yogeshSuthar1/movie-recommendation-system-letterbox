import os
import joblib
import threading # 🚀 Yeh naya import hai

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Global variables
movies = None
movie_index = None
tfidf_matrix = None
knn = None

# 🚀 Yeh taala (lock) hai jo multiple loading rokega
model_lock = threading.Lock() 

def load_recommender_models():
    global movies, movie_index, tfidf_matrix, knn
    
    # Pehle normal check (Fast response ke liye)
    if movies is None:
        # 🚀 Taala laga do! Ab ek baar mein ek hi request andar jayegi
        with model_lock:
            # Taale ke andar dubara check karo (Double-checked locking)
            if movies is None:
                print("⏳ Loading ML Recommendation Models... (First user will wait 30s)")
                movies = joblib.load(os.path.join(MODELS_DIR, "movies.pkl"))
                movie_index = joblib.load(os.path.join(MODELS_DIR, "movie_index.pkl"))
                tfidf_matrix = joblib.load(os.path.join(MODELS_DIR, "tfidf_matrix.pkl"))
                knn = joblib.load(os.path.join(MODELS_DIR, "recommendation_model.pkl"))
                print("✅ ML Recommendation Models Loaded Exactly ONCE!")

def recommend(movie_name, start=0, limit=20):
    global movies, movie_index, tfidf_matrix, knn

    # Function call hote hi pehle ensure karo ki models loaded hain
    load_recommender_models()

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