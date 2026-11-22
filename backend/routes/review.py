# File Path: backend/routes/review.py
from flask import Blueprint, jsonify, request, g, current_app
from sqlalchemy import text, bindparam
from backend.database import engine
from backend.middleware.auth_middleware import token_required

review_bp = Blueprint("review", __name__)

DATASET_BASE_WEIGHT = 10


def init_base_ratings_table():
    """Ensures movie_base_ratings table exists once at startup (outside request transactions)."""
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS movie_base_ratings (
                    movie_id BIGINT PRIMARY KEY,
                    base_rating DECIMAL(3,2)
                )
            """))
    except Exception as e:
        print(f"Base ratings table init note: {e}")

init_base_ratings_table()


def validate_rating_value(rating_val):
    """Validates rating is a float between 0.5 and 5.0 in 0.5 increments."""
    if rating_val is None or isinstance(rating_val, bool):
        return None
    try:
        r = float(rating_val)
    except (ValueError, TypeError):
        return None
    if r < 0.5 or r > 5.0:
        return None
    if round(r * 2) != (r * 2):
        return None
    return round(r, 1)


def ensure_base_rating_saved(conn, movie_id):
    """Saves the original dataset avg_rating before any user review modifies it (No DDL inside transaction)."""
    conn.execute(text("""
        INSERT IGNORE INTO movie_base_ratings (movie_id, base_rating)
        SELECT movie_id, avg_rating FROM movies WHERE movie_id = :movie_id
    """), {"movie_id": movie_id})


def sync_movie_avg_rating(conn, movie_id):
    """Combines original dataset rating with user ratings from reviews and ratings tables."""
    ensure_base_rating_saved(conn, movie_id)

    base_row = conn.execute(
        text("SELECT base_rating FROM movie_base_ratings WHERE movie_id = :movie_id"),
        {"movie_id": movie_id}
    ).fetchone()
    base_rating = float(base_row[0]) if (base_row and base_row[0] is not None) else None

    # 🚀 P1 FIX #11: Combine ratings from reviews and standalone ratings table per user
    user_ratings_rows = conn.execute(text("""
        SELECT rating FROM reviews 
        WHERE movie_id = :movie_id AND rating IS NOT NULL AND rating > 0
        UNION ALL
        SELECT r.rating FROM ratings r
        WHERE r.movie_id = :movie_id AND r.rating IS NOT NULL AND r.rating > 0
          AND NOT EXISTS (
              SELECT 1 FROM reviews rev 
              WHERE rev.movie_id = r.movie_id AND rev.user_id = r.user_id
          )
    """), {"movie_id": movie_id}).fetchall()

    user_ratings = [float(r[0]) for r in user_ratings_rows]

    if base_rating is not None and base_rating > 0:
        if len(user_ratings) > 0:
            total_score = (base_rating * DATASET_BASE_WEIGHT) + sum(user_ratings)
            total_votes = DATASET_BASE_WEIGHT + len(user_ratings)
            new_avg = round(total_score / total_votes, 2)
        else:
            new_avg = base_rating
    else:
        new_avg = round(sum(user_ratings) / len(user_ratings), 2) if user_ratings else None

    conn.execute(
        text("UPDATE movies SET avg_rating = :new_avg WHERE movie_id = :movie_id"),
        {"new_avg": new_avg, "movie_id": movie_id}
    )


# Add or Update review (Smart Upsert with P0 #4 Validation)
@review_bp.route("/reviews/<int:movie_id>", methods=["POST"])
@token_required
def add_review(movie_id):
    user_id = g.user_id
    data = request.get_json() or {}

    raw_text = data.get("review_text")
    if not isinstance(raw_text, str) or not raw_text.strip():
        return jsonify({"error": "Review text is required"}), 400

    review_text = raw_text.strip()
    if len(review_text) > 2000:
        return jsonify({"error": "Review text cannot exceed 2000 characters"}), 400

    # 🚀 P0 FIX #4: Strict rating range (0.5 to 5.0, step 0.5) & boolean spoiler check
    rating = validate_rating_value(data.get("rating"))
    if rating is None:
        return jsonify({"error": "Rating must be between 0.5 and 5.0 in 0.5 steps"}), 400

    is_spoiler = bool(data.get("is_spoiler", False))

    with engine.begin() as conn:
        movie = conn.execute(
            text("SELECT movie_id FROM movies WHERE movie_id = :movie_id"),
            {"movie_id": movie_id}
        ).first()

        if not movie:
            return jsonify({"error": "Movie not found"}), 404

        ensure_base_rating_saved(conn, movie_id)

        existing_review = conn.execute(
            text("""
                SELECT review_id 
                FROM reviews 
                WHERE user_id = :user_id AND movie_id = :movie_id
            """),
            {"user_id": user_id, "movie_id": movie_id}
        ).first()

        if existing_review:
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

        sync_movie_avg_rating(conn, movie_id)

    return jsonify({
        "message": message,
        "review_id": review_id,
        "movie_id": movie_id,
        "review_text": review_text,
        "rating": rating,
        "is_spoiler": is_spoiler
    }), 201


# Get reviews for a movie (Fixed table name review_comments & N+1 #12)
@review_bp.route("/reviews/<int:movie_id>", methods=["GET"])
@token_required
def get_reviews(movie_id):
    with engine.connect() as conn:
        movie = conn.execute(
            text("SELECT movie_id, title FROM movies WHERE movie_id = :movie_id"),
            {"movie_id": movie_id}
        ).first()

        if movie is None:
            return jsonify({"error": "Movie not found"}), 404

        reviews = conn.execute(
            text("""
                SELECT
                    r.review_id,
                    r.user_id,
                    u.username,
                    r.review_text,
                    r.rating,
                    r.is_spoiler,
                    r.likes,
                    r.created_at,
                    CASE
                        WHEN rl.user_id IS NOT NULL THEN TRUE
                        ELSE FALSE
                    END AS is_liked
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                LEFT JOIN review_likes rl
                    ON r.review_id = rl.review_id
                    AND rl.user_id = :user_id
                WHERE r.movie_id = :movie_id
                ORDER BY r.created_at DESC
            """),
            {"movie_id": movie_id, "user_id": g.user_id}
        ).mappings().all()

        review_list = [dict(row) for row in reviews]

        if review_list:
            review_ids = tuple(r["review_id"] for r in review_list)
            comments = conn.execute(
                text("""
                    SELECT rc.comment_id, rc.review_id, rc.user_id, rc.comment_text, rc.created_at, u.username
                    FROM review_comments rc
                    JOIN users u ON rc.user_id = u.user_id
                    WHERE rc.review_id IN :rids
                    ORDER BY rc.created_at ASC
                """).bindparams(bindparam("rids", expanding=True)),
                {"rids": review_ids}
            ).mappings().all()

            comments_by_review = {}
            for c in comments:
                comments_by_review.setdefault(c["review_id"], []).append(dict(c))

            for r_dict in review_list:
                r_dict["comments"] = comments_by_review.get(r_dict["review_id"], [])

    return jsonify({
        "movie_id": movie.movie_id,
        "title": movie.title,
        "total_reviews": len(review_list),
        "reviews": review_list
    }), 200


# Update user's own review (Direct Edit with P0 #4 Validation)
@review_bp.route("/reviews/<int:review_id>", methods=["PUT"])
@token_required
def update_review(review_id):
    user_id = g.user_id
    data = request.get_json() or {}

    raw_text = data.get("review_text")
    if not isinstance(raw_text, str) or not raw_text.strip():
        return jsonify({"error": "Review text is required"}), 400

    review_text = raw_text.strip()
    if len(review_text) > 2000:
        return jsonify({"error": "Review text cannot exceed 2000 characters"}), 400

    rating = None
    if "rating" in data and data.get("rating") is not None:
        rating = validate_rating_value(data.get("rating"))
        if rating is None:
            return jsonify({"error": "Rating must be between 0.5 and 5.0 in 0.5 steps"}), 400

    is_spoiler = bool(data.get("is_spoiler")) if "is_spoiler" in data else None

    with engine.begin() as conn:
        review = conn.execute(
            text("""
                SELECT review_id, movie_id
                FROM reviews
                WHERE review_id = :review_id AND user_id = :user_id
            """),
            {"review_id": review_id, "user_id": user_id}
        ).first()

        if review is None:
            return jsonify({"error": "Review not found or you are not allowed to edit it"}), 404

        ensure_base_rating_saved(conn, review.movie_id)

        update_query = "UPDATE reviews SET review_text = :review_text"
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

        sync_movie_avg_rating(conn, review.movie_id)

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
                SELECT review_id, movie_id
                FROM reviews
                WHERE review_id = :review_id AND user_id = :user_id
            """),
            {"review_id": review_id, "user_id": user_id}
        ).first()

        if review is None:
            return jsonify({"error": "Review not found or you are not allowed to delete it"}), 404

        movie_id = review.movie_id
        ensure_base_rating_saved(conn, movie_id)

        conn.execute(
            text("DELETE FROM reviews WHERE review_id = :review_id AND user_id = :user_id"),
            {"review_id": review_id, "user_id": user_id}
        )

        sync_movie_avg_rating(conn, movie_id)

    return jsonify({
        "message": "Review deleted successfully",
        "review_id": review_id
    }), 200


# Toggle Like (With Notification Deduplication #14)
@review_bp.route("/reviews/<int:review_id>/like", methods=["POST"])
@token_required
def toggle_like_review(review_id):
    user_id = g.user_id

    try:
        with engine.begin() as conn:
            review = conn.execute(
                text("""
                    SELECT r.review_id, r.user_id as owner_id, r.likes, m.title 
                    FROM reviews r
                    JOIN movies m ON r.movie_id = m.movie_id 
                    WHERE r.review_id = :r
                """),
                {"r": review_id}
            ).mappings().first()

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
                new_likes = max(0, (review["likes"] or 0) - 1)
            else:
                conn.execute(
                    text("INSERT INTO review_likes (review_id, user_id) VALUES (:r, :u)"),
                    {"r": review_id, "u": user_id}
                )
                conn.execute(
                    text("UPDATE reviews SET likes = COALESCE(likes, 0) + 1 WHERE review_id = :r"),
                    {"r": review_id}
                )

                if review["owner_id"] != user_id:
                    sender = conn.execute(
                        text("SELECT username FROM users WHERE user_id = :u"),
                        {"u": user_id}
                    ).mappings().first()
                    sender_name = sender["username"] if sender else "Someone"
                    notif_msg = f"@{sender_name} liked your review on {review['title']}."

                    # 🚀 P1 FIX #14: Deduplicate like notification
                    already_notified = conn.execute(
                        text("""
                            SELECT 1 FROM notifications 
                            WHERE user_id = :owner AND sender_id = :sender AND message = :msg AND is_read = 0
                            LIMIT 1
                        """),
                        {"owner": review["owner_id"], "sender": user_id, "msg": notif_msg}
                    ).first()

                    if not already_notified:
                        conn.execute(text("""
                            INSERT INTO notifications (user_id, sender_id, message, type) 
                            VALUES (:owner, :sender, :msg, 'like')
                        """), {
                            "owner": review["owner_id"],
                            "sender": user_id,
                            "msg": notif_msg
                        })

                action = "liked"
                new_likes = (review["likes"] or 0) + 1

        return jsonify({
            "message": f"Review {action} successfully",
            "liked": action == "liked",
            "likes_count": new_likes
        }), 200

    except Exception as e:
        current_app.logger.error(f"LIKE TOGGLE ERROR: {e}")
        return jsonify({"error": "Failed to toggle like"}), 500


# Get User Profile Details (🚀 FIXED: Added profile_image and bio to SELECT)
@review_bp.route("/profile/<int:target_user_id>", methods=["GET"])
@token_required
def get_user_profile(target_user_id):
    with engine.connect() as conn:
        user_info = conn.execute(
            text("SELECT user_id, username, profile_image, bio, created_at FROM users WHERE user_id = :u"),
            {"u": target_user_id}
        ).mappings().first()

        if not user_info:
            return jsonify({"error": "User not found"}), 404

        user_reviews = conn.execute(
            text("""
                SELECT 
                    r.review_id, r.movie_id, r.review_text, r.rating, r.likes, r.created_at, r.is_spoiler,
                    m.title, m.poster_url, m.release_year
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