import os
from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("DB_HOST", "localhost")
USER = os.getenv("DB_USER", "root")
PASSWORD = os.getenv("DB_PASSWORD", "")
DATABASE = os.getenv("DB_NAME", "movieverse_db")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_dev_key_123")

CORS_ORIGINS = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173"
]