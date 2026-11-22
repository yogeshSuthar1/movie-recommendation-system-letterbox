import os
from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("DB_HOST", "localhost")
PORT = int(os.getenv("DB_PORT", 3306))
USER = os.getenv("DB_USER", "root")
PASSWORD = os.getenv("DB_PASSWORD", "")
DATABASE = os.getenv("DB_NAME", "movieverse_db")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set in environment variables")

# Comma-separated frontend URLs from .env (e.g. "http://localhost:5173,https://your-app.vercel.app")
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]