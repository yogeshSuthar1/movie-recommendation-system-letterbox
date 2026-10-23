-- File: backend/sql/create_table.sql

CREATE DATABASE IF NOT EXISTS movieverse_db;
USE movieverse_db;

-- 1. Movies & Basic Entities
CREATE TABLE IF NOT EXISTS movies (
    movie_id BIGINT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    release_year SMALLINT,
    tagline TEXT,
    overview LONGTEXT,
    runtime_minutes SMALLINT,
    avg_rating DECIMAL(3,2),
    poster_url TEXT
);

CREATE TABLE IF NOT EXISTS genres (
    genre_id INT AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id BIGINT,
    genre_id INT,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS languages (
    language_id INT AUTO_INCREMENT PRIMARY KEY,
    language_name VARCHAR(100) UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_languages (
    movie_id BIGINT,
    language_id INT,
    PRIMARY KEY (movie_id, language_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES languages(language_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS countries (
    country_id INT AUTO_INCREMENT PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_countries (
    movie_id BIGINT,
    country_id INT,
    PRIMARY KEY (movie_id, country_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES countries(country_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS themes (
    theme_id INT AUTO_INCREMENT PRIMARY KEY,
    theme_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_themes (
    movie_id BIGINT,
    theme_id INT,
    PRIMARY KEY (movie_id, theme_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (theme_id) REFERENCES themes(theme_id) ON DELETE CASCADE
);

-- 2. Cast & Crew
CREATE TABLE IF NOT EXISTS actors (
    actor_id INT AUTO_INCREMENT PRIMARY KEY,
    actor_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_actors (
    movie_id BIGINT,
    actor_id INT,
    role VARCHAR(255),
    PRIMARY KEY (movie_id, actor_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES actors(actor_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS directors (
    director_id INT AUTO_INCREMENT PRIMARY KEY,
    director_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_directors (
    movie_id BIGINT,
    director_id INT,
    PRIMARY KEY (movie_id, director_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (director_id) REFERENCES directors(director_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS producers (
    producer_id INT AUTO_INCREMENT PRIMARY KEY,
    producer_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_producers (
    movie_id BIGINT,
    producer_id INT,
    PRIMARY KEY (movie_id, producer_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (producer_id) REFERENCES producers(producer_id) ON DELETE CASCADE
);

-- 3. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE, /* UNIQUE lagaya taaki duplicate naam na aaye */
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_image TEXT,
    bio TEXT,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    otp VARCHAR(10) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Social Features (Followers, Chat, Notifications)
CREATE TABLE IF NOT EXISTS followers (
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sender_id INT DEFAULT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 5. User Activities (Ratings, Reviews, Lists)
CREATE TABLE IF NOT EXISTS user_preference (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    favorite_genre TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ratings (
    rating_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id BIGINT NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rating (user_id, movie_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id BIGINT NOT NULL,
    review_text TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    is_spoiler TINYINT(1) NOT NULL DEFAULT 0,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_likes (
    review_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id, user_id),
    FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_comments (
    comment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    review_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlist (
    user_id INT,
    movie_id BIGINT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, movie_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
    user_id INT,
    movie_id BIGINT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, movie_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);

-- 6. Collections & Sharing
CREATE TABLE IF NOT EXISTS collections (
    collection_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collection_movies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    collection_id INT NOT NULL,
    movie_id BIGINT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_collection_movie (collection_id, movie_id),
    FOREIGN KEY (collection_id) REFERENCES collections(collection_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shared_movies (
    share_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    movie_id BIGINT NOT NULL,
    message TEXT,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    search_query VARCHAR(255),
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 7. Indexes for Performance Optimization
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_movies_year ON movies(release_year);
CREATE INDEX idx_movies_rating ON movies(avg_rating);
CREATE INDEX idx_movie_genres_movie ON movie_genres(movie_id);
CREATE INDEX idx_movie_actors_movie ON movie_actors(movie_id);
CREATE INDEX idx_movie_directors_movie ON movie_directors(movie_id);
CREATE INDEX idx_ratings_movie ON ratings(movie_id);
CREATE INDEX idx_reviews_movie ON reviews(movie_id);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_chat_participants ON chat_messages(sender_id, receiver_id);