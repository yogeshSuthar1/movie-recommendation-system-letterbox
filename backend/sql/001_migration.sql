USE movieverse_db;

-- 1. Purane duplicate reviews hatao taaki UNIQUE KEY fail na ho
DELETE r1 FROM reviews r1
INNER JOIN reviews r2
  ON r1.user_id = r2.user_id
 AND r1.movie_id = r2.movie_id
 AND r1.review_id > r2.review_id;

-- 2. Reviews par UNIQUE constraint lagao (MySQL 8 syntax)
ALTER TABLE reviews ADD UNIQUE KEY uq_user_movie_review (user_id, movie_id);

-- 3. Users table mein OTP columns update/add karo (MySQL 8 syntax)
ALTER TABLE users MODIFY COLUMN otp VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL;
ALTER TABLE users ADD COLUMN otp_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN reset_otp VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN reset_otp_expires_at DATETIME NULL;
ALTER TABLE users ADD COLUMN reset_otp_attempts INT DEFAULT 0;