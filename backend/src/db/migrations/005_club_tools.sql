-- Migration 005: club self-service tools — custom forms/responses, media gallery, links
-- Run: mysql -u root -p campuspulse < src/db/migrations/005_club_tools.sql

USE campuspulse;

CREATE TABLE IF NOT EXISTS club_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  created_by INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  label VARCHAR(180) NOT NULL,
  field_type ENUM('text','textarea','select','checkbox','number','email') NOT NULL DEFAULT 'text',
  options TEXT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  FOREIGN KEY (form_id) REFERENCES club_forms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_form_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  user_id INT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_form_user (form_id, user_id),
  FOREIGN KEY (form_id) REFERENCES club_forms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_form_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  response_id INT NOT NULL,
  field_id INT NOT NULL,
  answer_text TEXT,
  FOREIGN KEY (response_id) REFERENCES club_form_responses(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES club_form_fields(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  caption VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  label VARCHAR(80) NOT NULL,
  url VARCHAR(500) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);
