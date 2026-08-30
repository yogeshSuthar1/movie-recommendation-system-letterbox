from flask import Blueprint, jsonify, request, g
from sqlalchemy import text
from datetime import datetime
from collections import Counter

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
            {"user_id": user_id}
        ).mappings().first()

    if user is None:
        return jsonify({"error": "User not found"}), 404

    return jsonify(dict(user)), 200

@profile_bp.route("/user/edit", methods=["POST"])
def edit_profile():
    data = request.get_json()
    user_id = data.get("user_id")
    new_username = data.get("username")
    new_bio = data.get("bio")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    try:
        with engine.begin() as conn:
            if new_username:
                new_username = new_username.strip()
                existing = conn.execute(
                    text("SELECT user_id FROM users WHERE username = :uname AND user_id != :uid"),
                    {"uname": new_username, "uid": user_id}
                ).fetchone()

                if existing:
                    return jsonify({"error": "Username already taken"}), 400

                conn.execute(
                    text("UPDATE users SET username = :uname WHERE user_id = :uid"),
                    {"uname": new_username, "uid": user_id}
                )

            if new_bio is not None:
                conn.execute(
                    text("UPDATE users SET bio = :bio WHERE user_id = :uid"),
                    {"bio": new_bio.strip(), "uid": user_id}
                )

        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        print("EDIT PROFILE ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@profile_bp.route("/profile/<int:user_id>/analytics", methods=["GET"])
def get_user_analytics(user_id):
    with engine.connect() as conn:
        try:
            result = conn.execute(
                text("""
                    SELECT 
                        r.rating, 
                        r.created_at, 
                        m.runtime_minutes,
                        (
                            SELECT GROUP_CONCAT(g.genre_name SEPARATOR ', ')
                            FROM movie_genres mg
                            JOIN genres g ON mg.genre_id = g.genre_id
                            WHERE mg.movie_id = m.movie_id
                        ) AS genres
                    FROM reviews r
                    JOIN movies m ON r.movie_id = m.movie_id
                    WHERE r.user_id = :uid
                """),
                {"uid": user_id}
            ).mappings().all()
        except Exception as e:
            print("Database Error in Analytics:", e)
            return jsonify({
                "total_hours": 0, "movies_this_year": 0, "avg_rating": 0,
                "top_genres": [], "monthly_activity": []
            }), 200

    if not result:
        return jsonify({
            "total_hours": 0, "movies_this_year": 0, "avg_rating": 0,
            "top_genres": [], "monthly_activity": []
        }), 200

    total_minutes = sum([row['runtime_minutes'] or 0 for row in result])
    total_hours = total_minutes // 60
    avg_rating = round(sum([row['rating'] for row in result]) / len(result), 1) if result else 0

    current_year = datetime.now().year
    movies_this_year = len([row for row in result if row['created_at'].year == current_year])

    all_genres = []
    for row in result:
        if row.get('genres'):
            genres_list = [g.strip() for g in str(row['genres']).split(',')]
            all_genres.extend(genres_list)
    
    top_genres_count = Counter(all_genres).most_common(4)
    top_genres = [{"name": g[0], "value": g[1]} for g in top_genres_count]

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_counts = Counter([row['created_at'].month for row in result])
    
    monthly_activity = []
    for month_num in range(1, 13): 
        if monthly_counts[month_num] > 0:
            monthly_activity.append({
                "name": month_names[month_num - 1],
                "movies": monthly_counts[month_num]
            })

    return jsonify({
        "total_hours": total_hours,
        "movies_this_year": movies_this_year,
        "avg_rating": avg_rating,
        "top_genres": top_genres,
        "monthly_activity": monthly_activity[-6:] 
    }), 200

social_bp = Blueprint("social", __name__)

@social_bp.route("/users/search", methods=["GET"])
def search_users():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([]), 200

    with engine.connect() as conn:
        users = conn.execute(
            text("""
                SELECT user_id, username 
                FROM users 
                WHERE username LIKE :q
                LIMIT 10
            """),
            {"q": f"%{query}%"}
        ).mappings().all()

    return jsonify([dict(u) for u in users]), 200

@social_bp.route("/user/<int:target_user_id>/follow", methods=["POST"])
@token_required
def follow_user(target_user_id):
    data = request.get_json()
    current_user_id = data.get("current_user_id")

    if not current_user_id:
        return jsonify({"error": "User ID missing"}), 400

    if int(current_user_id) == int(target_user_id):
        return jsonify({"error": "You cannot follow yourself"}), 400

    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT * FROM followers WHERE follower_id = :cid AND following_id = :tid"),
            {"cid": int(current_user_id), "tid": target_user_id}
        ).fetchone()

        if existing:
            conn.execute(
                text("DELETE FROM followers WHERE follower_id = :cid AND following_id = :tid"),
                {"cid": int(current_user_id), "tid": target_user_id}
            )
            return jsonify({"status": "unfollowed", "message": "Successfully unfollowed user"}), 200
        else:
            conn.execute(
                text("INSERT INTO followers (follower_id, following_id) VALUES (:cid, :tid)"),
                {"cid": int(current_user_id), "tid": target_user_id}
            )
            return jsonify({"status": "followed", "message": "Successfully followed user"}), 200

@social_bp.route("/user/<int:user_id>/stats", methods=["GET"])
def get_user_follow_stats(user_id):
    with engine.connect() as conn:
        followers = conn.execute(
            text("SELECT COUNT(*) FROM followers WHERE following_id = :uid"),
            {"uid": user_id}
        ).scalar() or 0

        following = conn.execute(
            text("SELECT COUNT(*) FROM followers WHERE follower_id = :uid"),
            {"uid": user_id}
        ).scalar() or 0

    return jsonify({
        "followers_count": followers,
        "following_count": following
    }), 200

@social_bp.route("/user/<int:user_id>/followers", methods=["GET"])
def get_followers_list(user_id):
    with engine.connect() as conn:
        query = text("""
            SELECT u.user_id, u.username 
            FROM followers f
            JOIN users u ON f.follower_id = u.user_id
            WHERE f.following_id = :uid
        """)
        results = [dict(row) for row in conn.execute(query, {"uid": user_id}).mappings().all()]
    return jsonify(results), 200

@social_bp.route("/user/<int:user_id>/following", methods=["GET"])
def get_following_list(user_id):
    with engine.connect() as conn:
        query = text("""
            SELECT u.user_id, u.username 
            FROM followers f
            JOIN users u ON f.following_id = u.user_id
            WHERE f.follower_id = :uid
        """)
        results = [dict(row) for row in conn.execute(query, {"uid": user_id}).mappings().all()]
    return jsonify(results), 200