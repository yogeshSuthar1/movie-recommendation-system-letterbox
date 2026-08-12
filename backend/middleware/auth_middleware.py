from functools import wraps

from flask import request, jsonify, g
import jwt

from backend.config import JWT_SECRET_KEY


def token_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({
                "error": "Authorization token is required"
            }), 401

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "error": "Invalid authorization format"
            }), 401

        token = auth_header.split(" ")[1]

        try:

            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=["HS256"]
            )

            g.user_id = payload["user_id"]
            g.user_email = payload["email"]

        except jwt.ExpiredSignatureError:

            return jsonify({
                "error": "Token has expired"
            }), 401

        except jwt.InvalidTokenError:

            return jsonify({
                "error": "Invalid token"
            }), 401

        return f(*args, **kwargs)

    return decorated