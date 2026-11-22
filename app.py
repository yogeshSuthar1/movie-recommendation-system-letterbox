# File Path: app.py
import os
from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

from backend.config import CORS_ORIGINS
from backend.extensions import mail, limiter
from backend.routes.movies import movies_bp
from backend.routes.recommendation import recommendation_bp
from backend.routes.search import search_bp
from backend.routes.movie import movie_bp
from backend.routes.auth import auth_bp
from backend.routes.watchlist import watchlist_bp
from backend.routes.rating import rating_bp
from backend.routes.review import review_bp
from backend.routes.profile import profile_bp, social_bp
from backend.routes.preferences import preferences_bp
from backend.routes.home import home_bp
from backend.routes.collections import collections_bp
from backend.chat_routes import chat_bp
from backend.chat_sockets import register_chat_sockets
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# 🚀 P2 FIX #18: Restricted CORS to allowed frontend origins
CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 465
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_USE_TLS"] = False
app.config["MAIL_USE_SSL"] = True

mail.init_app(app)
limiter.init_app(app)

# 🚀 P2 FIX #18: Restricted SocketIO CORS to allowed origins
socketio = SocketIO(app, cors_allowed_origins=CORS_ORIGINS)

app.register_blueprint(movies_bp)
app.register_blueprint(movie_bp)
app.register_blueprint(recommendation_bp)
app.register_blueprint(search_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(watchlist_bp)
app.register_blueprint(rating_bp)
app.register_blueprint(review_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(preferences_bp)
app.register_blueprint(home_bp)
app.register_blueprint(collections_bp)
app.register_blueprint(social_bp)
app.register_blueprint(chat_bp)

register_chat_sockets(socketio)

@app.route("/")
def home():
    return jsonify({"message": "NEXUS API is Running"}), 200

if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", debug=debug_mode, port=port)