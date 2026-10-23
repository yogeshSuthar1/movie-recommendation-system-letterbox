
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room, emit
from flask_cors import CORS
from backend.routes.movies import movies_bp
from backend.routes.recommendation import recommendation_bp
from backend.routes.search import search_bp
from backend.routes.movie import movie_bp
from backend.routes.auth import auth_bp
from backend.routes.watchlist import watchlist_bp
from backend.routes.rating import rating_bp
from backend.routes.review import review_bp
from backend.routes.profile import profile_bp,social_bp
from backend.routes.preferences import preferences_bp
from backend.routes.home import home_bp
from backend.routes.collections import collections_bp
from backend.extensions import mail
from backend.chat_routes import chat_bp
from backend.chat_sockets import register_chat_sockets

import os
import random



app = Flask(__name__)
CORS(app)

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True

mail.init_app(app)

socketio = SocketIO(app, cors_allowed_origins="*")


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
    return {
        "message": "NEXUS API is Running "
    }

if __name__ == "__main__":
    socketio.run(app,debug=True,port=5000)