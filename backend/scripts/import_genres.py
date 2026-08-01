import pandas as pd

import os
import sys

backend_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

sys.path.insert(0, backend_path)

from database import engine

genres = pd.read_csv("../dataset/processed/genres.csv")

genres.to_sql(
    "genres",
    engine,
    if_exists="append",
    index=False,
    chunksize=1000
)

print(f"Imported {len(genres)} genres")