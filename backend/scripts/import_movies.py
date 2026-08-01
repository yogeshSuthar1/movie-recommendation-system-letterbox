import pandas as pd
import sys
import os

backend_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

sys.path.insert(0, backend_path)

from database import engine

movies = pd.read_csv(
    "../dataset/processed/movieverse_master_dataset.csv"
)

movies = movies[
    [
        "movie_id",
        "title",
        "release_year",
        "tagline",
        "overview",
        "runtime_minutes",
        "avg_rating",
        "poster_url"
    ]
]

movies.to_sql(
    "movies",
    engine,
    if_exists="append",
    index=False,
    chunksize=1000
)

print("Movies Imported Successfully")