-- Migration 002: subscription topics, expanded alert categories, emergency safe-route guidance
-- Safe to run against an existing CampusPulse+ database created from schema.sql + seed.sql.
-- This is written to run ONCE against a database that hasn't had it applied yet —
-- re-running it will error on the duplicate ALTER TABLE changes, which is a safe failure.
-- Run: mysql -u root -p campuspulse < src/db/migrations/002_enhancements.sql

USE campuspulse;

-- ============ SUBSCRIPTION TOPICS ============
-- Students opt into the groups relevant to them (year, department, interest,
-- or role) instead of only ever receiving campus-wide or profile-matched alerts.
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  type ENUM('year','department','interest','role') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_topic_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_topic (user_id, topic_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

INSERT IGNORE INTO topics (name, type) VALUES
  ('1st Year', 'year'), ('2nd Year', 'year'), ('3rd Year', 'year'), ('4th Year', 'year'),
  ('CSE', 'department'), ('ECE', 'department'), ('AIML', 'department'),
  ('Mechanical', 'department'), ('Civil', 'department'), ('Electrical', 'department'),
  ('Faculty', 'role'),
  ('Hackathons', 'interest'), ('Workshops', 'interest'), ('Placements', 'interest'),
  ('Sports', 'interest'), ('Cultural Events', 'interest'), ('Entrepreneurship', 'interest');

-- ============ EXPANDED ALERT CATEGORIES ============
ALTER TABLE announcements
  MODIFY COLUMN category ENUM('exam','academic','emergency','club','workshop','competition','transportation','facilities','general') NOT NULL;

-- 'topic' lets an announcement target a specific subscription group instead
-- of only campus/department/year/club/event.
ALTER TABLE announcements
  MODIFY COLUMN target_scope ENUM('campus','department','year','group','topic','club','event') NOT NULL DEFAULT 'campus';

ALTER TABLE announcements
  ADD COLUMN target_topic_id INT NULL AFTER target_event_id,
  ADD COLUMN safe_location_id INT NULL AFTER target_topic_id,
  ADD COLUMN instructions TEXT NULL AFTER safe_location_id;

ALTER TABLE announcements
  ADD CONSTRAINT fk_ann_target_topic FOREIGN KEY (target_topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ann_safe_location FOREIGN KEY (safe_location_id) REFERENCES locations(id) ON DELETE SET NULL;
