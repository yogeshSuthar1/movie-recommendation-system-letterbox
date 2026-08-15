from flask import Blueprint, jsonify, request, g
from sqlalchemy import text

from backend.database import engine
from backend.middleware.auth_middleware import token_required


profile_bp = Blueprint("profile", __name__)


@profile_bp.route("/profile", methods=["GET"])
@token_required
def get_profile():

    user_id = g.user_id

    with engine.connect() as conn:

        user = conn.execute(
            text("""
                SELECT
                    user_id,
                    username,
                    email,
                    profile_image,
                    bio,
                    created_at
                FROM users
                WHERE user_id = :user_id
            """),
            {
                "user_id": user_id
            }
        ).mappings().first()

    if user is None:
        return jsonify({
            "error": "User not found"
        }), 404

    return jsonify(dict(user)), 200


@profile_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile():

    user_id = g.user_id

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    username = data.get("username")
    bio = data.get("bio")
    profile_image = data.get("profile_image")

    # Check that at least one field is provided
    if username is None and bio is None and profile_image is None:
        return jsonify({
            "error": "At least one field is required"
        }), 400

    with engine.begin() as conn:

        # Build update dynamically
        updates = []
        params = {
            "user_id": user_id
        }

        if username is not None:
            username = username.strip()

            if not username:
                return jsonify({
                    "error": "Username cannot be empty"
                }), 400

            updates.append("username = :username")
            params["username"] = username

        if bio is not None:
            updates.append("bio = :bio")
            params["bio"] = bio

        if profile_image is not None:
            updates.append("profile_image = :profile_image")
            params["profile_image"] = profile_image

        query = text(f"""
            UPDATE users
            SET {", ".join(updates)}
            WHERE user_id = :user_id
        """)

        result = conn.execute(query, params)

    if result.rowcount == 0:
        return jsonify({
            "error": "User not found"
        }), 404

    return jsonify({
        "message": "Profile updated successfully"
    }), 200