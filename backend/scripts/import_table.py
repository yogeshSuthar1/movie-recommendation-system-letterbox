import os
import sys
import pandas as pd

# Backend path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_path)

from database import engine

if len(sys.argv) != 2:
    print("Usage: python scripts/import_table.py <table_name>")
    sys.exit()

table_name = sys.argv[1]

csv_path = os.path.abspath(
    os.path.join(
        backend_path,
        "..",
        "dataset",
        "processed",
        f"{table_name}.csv"
    )
)

if not os.path.exists(csv_path):
    print(f"CSV not found: {csv_path}")
    sys.exit()

print("=" * 60)
print(f"Importing : {table_name}")
print(f"Reading   : {csv_path}")

df = pd.read_csv(csv_path)

print(f"Rows      : {len(df):,}")

df.to_sql(
    table_name,
    engine,
    if_exists="append",
    index=False,
    chunksize=1000,
    method="multi"
)

print("✅ Import Completed")