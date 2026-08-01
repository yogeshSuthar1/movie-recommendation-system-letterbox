CREATE DATABASE movieverse_db;
SHOW DATABASES;
USE movieverse_db;

CREATE TABLE movies (
    movie_id BIGINT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    release_year SMALLINT,
    tagline TEXT,
    overview LONGTEXT,
    runtime_minutes SMALLINT,
    avg_rating DECIMAL(3,2),
    poster_url TEXT
);


CREATE TABLE genres (
    genre_id INT AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE movie_genres (
    movie_id BIGINT,
    genre_id INT,

    PRIMARY KEY (movie_id, genre_id),

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    FOREIGN KEY (genre_id)
        REFERENCES genres(genre_id)
        ON DELETE CASCADE
);

CREATE TABLE languages (
    language_id INT AUTO_INCREMENT PRIMARY KEY,
    language_name VARCHAR(100) UNIQUE
);

CREATE TABLE movie_languages (
    movie_id BIGINT,
    language_id INT,

    PRIMARY KEY (movie_id, language_id),

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    FOREIGN KEY (language_id)
        REFERENCES languages(language_id)
        ON DELETE CASCADE
);


SHOW TABLES;

CREATE TABLE countries (
    country_id INT AUTO_INCREMENT PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE movie_countries (
    movie_id BIGINT,
    country_id INT,

    PRIMARY KEY (movie_id, country_id),

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    FOREIGN KEY (country_id)
        REFERENCES countries(country_id)
        ON DELETE CASCADE
);

CREATE TABLE themes (
    theme_id INT AUTO_INCREMENT PRIMARY KEY,
    theme_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE movie_themes (
    movie_id BIGINT,
    theme_id INT,

    PRIMARY KEY (movie_id, theme_id),

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    FOREIGN KEY (theme_id)
        REFERENCES themes(theme_id)
        ON DELETE CASCADE
);

CREATE TABLE actors (
    actor_id INT AUTO_INCREMENT PRIMARY KEY,
    actor_name VARCHAR(255) NOT NULL UNIQUE
);


CREATE TABLE movie_actors (
    movie_id BIGINT,
    actor_id INT,
    role VARCHAR(255),

    PRIMARY KEY (movie_id, actor_id),

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    FOREIGN KEY (actor_id)
        REFERENCES actors(actor_id)
        ON DELETE CASCADE
);

CREATE TABLE directors (
    director_id INT AUTO_INCREMENT PRIMARY KEY,
    director_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE movie_directors (
    movie_id BIGINT,
    director_id INT,

    PRIMARY KEY (movie_id, director_id),

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    FOREIGN KEY (director_id)
        REFERENCES directors(director_id)
        ON DELETE CASCADE
);

CREATE TABLE producers (
    producer_id INT AUTO_INCREMENT PRIMARY KEY,
    producer_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE movie_producers (
    movie_id BIGINT,
    producer_id INT,

    PRIMARY KEY (movie_id, producer_id),

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    FOREIGN KEY (producer_id)
        REFERENCES producers(producer_id)
        ON DELETE CASCADE
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_image TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
    rating_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id BIGINT NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_rating (user_id, movie_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE
);

CREATE TABLE reviews (
    review_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id BIGINT NOT NULL,
    review_text TEXT,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE
);

CREATE TABLE watchlist (
    user_id INT,
    movie_id BIGINT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, movie_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE
);

CREATE TABLE favorites (
    user_id INT,
    movie_id BIGINT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, movie_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE
);

CREATE TABLE search_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    search_query VARCHAR(255),
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_movies_title ON movies(title);

CREATE INDEX idx_movies_year ON movies(release_year);

CREATE INDEX idx_movies_rating ON movies(avg_rating);

CREATE INDEX idx_movie_genres_movie ON movie_genres(movie_id);

CREATE INDEX idx_movie_actors_movie ON movie_actors(movie_id);

CREATE INDEX idx_movie_directors_movie ON movie_directors(movie_id);

CREATE INDEX idx_ratings_movie ON ratings(movie_id);

CREATE INDEX idx_reviews_movie ON reviews(movie_id);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);


SHOW TABLES;

