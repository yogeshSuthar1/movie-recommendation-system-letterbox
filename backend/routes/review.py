from flask import Blueprint, jsonify, request, g
from sqlalchemy import text

from backend.database import engine
from backend.middleware.auth_middleware import token_required


review_bp = Blueprint("review", __name__)


# Add review
@review_bp.route("/reviews/<int:movie_id>", methods=["POST"])
@token_required
def add_review(movie_id):

    user_id = g.user_id

    data = request.get_json()

    if not data or "review_text" not in data:
        return jsonify({
            "error": "Review text is required"
        }), 400

    review_text = data["review_text"].strip()

    if not review_text:
        return jsonify({
            "error": "Review cannot be empty"
        }), 400

    # Check movie exists
    with engine.connect() as conn:

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

    # Insert review
    with engine.begin() as conn:

        result = conn.execute(
            text("""
                INSERT INTO reviews
                    (user_id, movie_id, review_text)
                VALUES
                    (:user_id, :movie_id, :review_text)
            """),
            {
                "user_id": user_id,
                "movie_id": movie_id,
                "review_text": review_text
            }
        )

        review_id = result.lastrowid

    return jsonify({
        "message": "Review added successfully",
        "review_id": review_id,
        "movie_id": movie_id,
        "review_text": review_text
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
                    r.likes,
                    r.created_at
                FROM reviews r
                JOIN users u
                    ON r.user_id = u.user_id
                WHERE r.movie_id = :movie_id
                ORDER BY r.created_at DESC
            """),
            {"movie_id": movie_id}
        ).mappings().all()

    review_list = [dict(review) for review in reviews]

    return jsonify({
        "movie_id": movie.movie_id,
        "title": movie.title,
        "total_reviews": len(review_list),
        "reviews": review_list
    }), 200


# Update user's own review
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

        conn.execute(
            text("""
                UPDATE reviews
                SET review_text = :review_text
                WHERE review_id = :review_id
                AND user_id = :user_id
            """),
            {
                "review_text": review_text,
                "review_id": review_id,
                "user_id": user_id
            }
        )

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