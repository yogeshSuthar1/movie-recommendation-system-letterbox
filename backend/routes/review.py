from flask import Blueprint, jsonify, request, g
from sqlalchemy import text

from backend.database import engine
from backend.middleware.auth_middleware import token_required

review_bp = Blueprint("review", __name__)


# Add or Update review (Smart Upsert)
@review_bp.route("/reviews/<int:movie_id>", methods=["POST"])
@token_required
def add_review(movie_id):
    user_id = g.user_id
    data = request.get_json()

    if not data or "review_text" not in data:
        return jsonify({"error": "Review text is required"}), 400

    review_text = data["review_text"].strip()
    rating = data.get("rating", 0) 
    is_spoiler = data.get("is_spoiler", False) # 🌟 NAYA: Spoiler flag receive kiya

    if not review_text:
        return jsonify({"error": "Review cannot be empty"}), 400

    with engine.begin() as conn:
        # 1. Check if movie exists
        movie = conn.execute(
            text("SELECT movie_id FROM movies WHERE movie_id = :movie_id"),
            {"movie_id": movie_id}
        ).first()

        if not movie:
            return jsonify({"error": "Movie not found"}), 404

        # 2. Check if user already reviewed this movie
        existing_review = conn.execute(
            text("""
                SELECT review_id 
                FROM reviews 
                WHERE user_id = :user_id AND movie_id = :movie_id
            """),
            {"user_id": user_id, "movie_id": movie_id}
        ).first()

        if existing_review:
            # 🔄 UPDATE EXISTING REVIEW (User kitni baar bhi post kare, yahi edit hoga)
            review_id = existing_review.review_id
            conn.execute(
                text("""
                    UPDATE reviews
                    SET review_text = :review_text, rating = :rating, is_spoiler = :is_spoiler
                    WHERE review_id = :review_id
                """),
                {
                    "review_text": review_text,
                    "rating": rating,
                    "is_spoiler": is_spoiler,
                    "review_id": review_id
                }
            )
            message = "Review updated successfully"
        else:
            # 🆕 INSERT NEW REVIEW
            result = conn.execute(
                text("""
                    INSERT INTO reviews (user_id, movie_id, review_text, rating, is_spoiler) 
                    VALUES (:user_id, :movie_id, :review_text, :rating, :is_spoiler)
                """),
                {
                    "user_id": user_id,
                    "movie_id": movie_id,
                    "review_text": review_text,
                    "rating": rating,
                    "is_spoiler": is_spoiler
                }
            )
            review_id = result.lastrowid
            message = "Review added successfully"

    return jsonify({
        "message": message,
        "review_id": review_id,
        "movie_id": movie_id,
        "review_text": review_text,
        "rating": rating,
        "is_spoiler": is_spoiler # 🌟 NAYA: React ko wapas bhej rahe hain
    }), 201


# Get reviews for a movie
@review_bp.route("/reviews/<int:movie_id>", methods=["GET"])
@token_required
def get_reviews(movie_id):
    with engine.connect() as conn:
        # Check movie exists
        movie = conn.execute(
            text("""
                SELECT movie_id, title
                FROM movies
                WHERE movie_id = :movie_id
            """),
            {"movie_id": movie_id}
        ).first()

        if movie is None:
            return jsonify({
                "error": "Movie not found"
            }), 404

        # Get reviews
        reviews = conn.execute(
            text("""
                SELECT
                r.review_id,
                r.user_id,
                u.username,
                r.review_text,
                r.rating,
                r.is_spoiler, -- 🌟 NAYA: Spoiler flag select kiya
                r.likes,
                r.created_at,

                CASE
                    WHEN rl.user_id IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS is_liked

                FROM reviews r

                JOIN users u
                    ON r.user_id = u.user_id

                LEFT JOIN review_likes rl
                    ON r.review_id = rl.review_id
                    AND rl.user_id = :user_id

                WHERE r.movie_id = :movie_id

                ORDER BY r.created_at DESC
            """),
            {
                "movie_id": movie_id,
                "user_id": g.user_id
            }
        ).mappings().all()

    review_list = [dict(review) for review in reviews]

    return jsonify({
        "movie_id": movie.movie_id,
        "title": movie.title,
        "total_reviews": len(review_list),
        "reviews": review_list
    }), 200


# Update user's own review (Direct Edit)
@review_bp.route("/reviews/<int:review_id>", methods=["PUT"])
@token_required
def update_review(review_id):
    user_id = g.user_id
    data = request.get_json()

    if not data or "review_text" not in data:
        return jsonify({
            "error": "Review text is required"
        }), 400

    review_text = data["review_text"].strip()
    rating = data.get("rating") 
    is_spoiler = data.get("is_spoiler") # 🌟 NAYA

    if not review_text:
        return jsonify({
            "error": "Review cannot be empty"
        }), 400

    with engine.begin() as conn:
        # Check that this review belongs to logged-in user
        review = conn.execute(
            text("""
                SELECT review_id
                FROM reviews
                WHERE review_id = :review_id
                AND user_id = :user_id
            """),
            {
                "review_id": review_id,
                "user_id": user_id
            }
        ).first()

        if review is None:
            return jsonify({
                "error": "Review not found or you are not allowed to edit it"
            }), 404

        # Update Query
        update_query = """
            UPDATE reviews
            SET review_text = :review_text
        """
        params = {
            "review_text": review_text,
            "review_id": review_id,
            "user_id": user_id
        }

        if rating is not None:
            update_query += ", rating = :rating"
            params["rating"] = rating
            
        if is_spoiler is not None:
            update_query += ", is_spoiler = :is_spoiler"
            params["is_spoiler"] = is_spoiler

        update_query += " WHERE review_id = :review_id AND user_id = :user_id"

        conn.execute(text(update_query), params)

    return jsonify({
        "message": "Review updated successfully",
        "review_id": review_id,
        "review_text": review_text
    }), 200


# Delete user's own review
@review_bp.route("/reviews/<int:review_id>", methods=["DELETE"])
@token_required
def delete_review(review_id):
    user_id = g.user_id

    with engine.begin() as conn:
        review = conn.execute(
            text("""
                SELECT review_id
                FROM reviews
                WHERE review_id = :review_id
                AND user_id = :user_id
            """),
            {
                "review_id": review_id,
                "user_id": user_id
            }
        ).first()

        if review is None:
            return jsonify({
                "error": "Review not found or you are not allowed to delete it"
            }), 404

        conn.execute(
            text("""
                DELETE FROM reviews
                WHERE review_id = :review_id
                AND user_id = :user_id
            """),
            {
                "review_id": review_id,
                "user_id": user_id
            }
        )

    return jsonify({
        "message": "Review deleted successfully",
        "review_id": review_id
    }), 200


# Toggle Like
@review_bp.route("/reviews/<int:review_id>/like", methods=["POST"])
@token_required
def toggle_like_review(review_id):
    user_id = g.user_id

    try:
        with engine.begin() as conn:
            review = conn.execute(
                text("SELECT review_id, likes FROM reviews WHERE review_id = :r"),
                {"r": review_id}
            ).first()

            if not review:
                return jsonify({"error": "Review not found"}), 404

            existing_like = conn.execute(
                text("SELECT review_id FROM review_likes WHERE review_id = :r AND user_id = :u"),
                {"r": review_id, "u": user_id}
            ).first()

            if existing_like:
                conn.execute(
                    text("DELETE FROM review_likes WHERE review_id = :r AND user_id = :u"),
                    {"r": review_id, "u": user_id}
                )
                conn.execute(
                    text("UPDATE reviews SET likes = GREATEST(likes - 1, 0) WHERE review_id = :r"),
                    {"r": review_id}
                )
                action = "unliked"
                new_likes = max(0, review.likes - 1)
            else:
                conn.execute(
                    text("INSERT INTO review_likes (review_id, user_id) VALUES (:r, :u)"),
                    {"r": review_id, "u": user_id}
                )
                conn.execute(
                    text("UPDATE reviews SET likes = likes + 1 WHERE review_id = :r"),
                    {"r": review_id}
                )
                action = "liked"
                new_likes = review.likes + 1

        return jsonify({
            "message": f"Review {action} successfully",
            "liked": action == "liked",
            "likes_count": new_likes
        }), 200

    except Exception as e:
        print(f"LIKE TOGGLE ERROR: {e}")
        return jsonify({"error": "Failed to toggle like"}), 500


# Get Single Review
@review_bp.route("/review/<int:review_id>", methods=["GET"])
@token_required
def get_single_review(review_id):
    with engine.connect() as conn:
        review = conn.execute(
            text("""
                SELECT
                    r.review_id,
                    r.user_id,
                    u.username,
                    r.movie_id,
                    m.title,
                    r.review_text,
                    r.rating,
                    r.is_spoiler, -- 🌟 NAYA
                    r.likes,
                    r.created_at
                FROM reviews r
                JOIN users u
                    ON r.user_id = u.user_id
                JOIN movies m
                    ON r.movie_id = m.movie_id
                WHERE r.review_id = :review_id
            """),
            {
                "review_id": review_id
            }
        ).mappings().first()

    if review is None:
        return jsonify({
            "error": "Review not found"
        }), 404

    return jsonify(dict(review)), 200


# Get User Profile Details
@review_bp.route("/profile/<int:target_user_id>", methods=["GET"])
@token_required
def get_user_profile(target_user_id):
    with engine.connect() as conn:
        user_info = conn.execute(
            text("""
                SELECT user_id, username 
                FROM users 
                WHERE user_id = :u
            """),
            {"u": target_user_id}
        ).mappings().first()

        if not user_info:
            return jsonify({"error": "User not found"}), 404

        user_reviews = conn.execute(
            text("""
                SELECT 
                    r.review_id, r.movie_id, r.review_text, r.rating, r.likes, r.created_at, r.is_spoiler, -- 🌟 NAYA
                    m.title, m.poster_url
                FROM reviews r
                JOIN movies m ON r.movie_id = m.movie_id
                WHERE r.user_id = :u
                ORDER BY r.created_at DESC
            """),
            {"u": target_user_id}
        ).mappings().all()

    return jsonify({
        "user": dict(user_info),
        "total_reviews": len(user_reviews),
        "reviews": [dict(row) for row in user_reviews]
    }), 200