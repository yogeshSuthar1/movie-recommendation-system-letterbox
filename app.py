from flask import Flask
from backend.routes.movies import movies_bp
from backend.routes.recommendation import recommendation_bp
from backend.routes.search import search_bp
from backend.routes.movie import movie_bp
from backend.routes.auth import auth_bp
from backend.routes.watchlist import watchlist_bp
from backend.routes.rating import rating_bp
from backend.routes.review import review_bp

app = Flask(__name__)

app.register_blueprint(movies_bp)
app.register_blueprint(movie_bp)
app.register_blueprint(recommendation_bp)
app.register_blueprint(search_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(watchlist_bp)
app.register_blueprint(rating_bp)
app.register_blueprint(review_bp)

@app.route("/")
def home():
    return {
        "message": "MovieVerse API is Running "
    }

if __name__ == "__main__":
    app.run(debug=True)