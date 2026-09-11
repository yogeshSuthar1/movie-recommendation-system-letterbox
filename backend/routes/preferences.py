from flask import Blueprint, request, jsonify, g
from backend.database import engine
from sqlalchemy import text
from backend.middleware.auth_middleware import token_required

preferences_bp = Blueprint("preferences", __name__)

@preferences_bp.route("/preferences", methods=["POST"])
@token_required
def save_preferences():
    user_id = g.user_id
    data = request.get_json()
    genres = data.get("genres", [])

    print(f"👉 SAVING PREFERENCES -> User ID: {user_id}, Genres: {genres}") # 👈 Yeh add karo

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    # genres = data.get("genres")

    if not genres or not isinstance(genres, list):
        return jsonify({
            "error": "Genres must be provided as a list"
        }), 400

    if len(genres) < 3:
        return jsonify({
            "error": "Please select at least 3 genres"
        }), 400

    # Clean, strip, and remove duplicate genres
    cleaned_genres = list(dict.fromkeys(
        genre.strip()
        for genre in genres
        if isinstance(genre, str) and genre.strip()
    ))

    if len(cleaned_genres) < 3:
        return jsonify({
            "error": "Please select at least 3 valid genres"
        }), 400

    favorite_genre = ", ".join(cleaned_genres)

    try:
        # Check if preferences already exist for this user
        with engine.connect() as conn:
            existing = conn.execute(
                text("""
                    SELECT id
                    FROM user_preference
                    WHERE user_id = :user_id
                """),
                {"user_id": user_id}
            ).first()

        # Update or Insert preferences inside a transaction block
        with engine.begin() as conn:
            if existing:
                conn.execute(
                    text("""
                        UPDATE user_preference
                        SET favorite_genre = :favorite_genre
                        WHERE user_id = :user_id
                    """),
                    {
                        "favorite_genre": favorite_genre,
                        "user_id": user_id
                    }
                )
            else:
                conn.execute(
                    text("""
                        INSERT INTO user_preference (user_id, favorite_genre)
                        VALUES (:user_id, :favorite_genre)
                    """),
                    {
                        "user_id": user_id,
                        "favorite_genre": favorite_genre
                    }
                )

        return jsonify({
            "message": "Preferences saved successfully",
            "user_id": user_id,
            "favorite_genre": favorite_genre
        }), 200

    except Exception as e:
        print("SAVE PREFERENCES ERROR:", e)
        return jsonify({
            "error": "An internal error occurred while saving preferences"
        }), 500