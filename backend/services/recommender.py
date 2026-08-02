import os
import joblib


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

movies = joblib.load(os.path.join(MODELS_DIR, "movies.pkl"))

movie_index = joblib.load(os.path.join(MODELS_DIR, "movie_index.pkl"))

tfidf_matrix = joblib.load(os.path.join(MODELS_DIR, "tfidf_matrix.pkl"))

knn = joblib.load(os.path.join(MODELS_DIR, "recommendation_model.pkl"))

def recommend(movie_name, start=0, limit=20):

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
            "title",
            "release_year",
            "avg_rating",
            "genres",
            "similarity",
            "poster_url"
        ]
    ]

