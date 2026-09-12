from flask import Flask
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

# 🚀 Yeh ek helper function hai jo aage poore app mein OTP bhejne ke kaam aayega
def send_otp_email(user_email, otp):
    try:
        msg = Message('Your MovieVerse Verification Code', 
                      sender=app.config['MAIL_USERNAME'], 
                      recipients=[user_email])
        msg.body = f"Welcome to MovieVerse! 🎬\n\nYour 6-digit verification code is: {otp}\n\nPlease don't share this code with anyone."
        mail.send(msg)
        return True
    except Exception as e:
        print("Mail Error:", e)
        return False

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

@app.route("/")
def home():
    return {
        "message": "MovieVerse API is Running "
    }

if __name__ == "__main__":
    app.run(debug=True)