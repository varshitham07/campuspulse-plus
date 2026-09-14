-- Migration 003: role architecture — Identity + Responsibility + Scope
--
-- Collapses users.role from 5 flattened values down to 3 real identities
-- (admin, teacher, student). Club leadership stops being a role value
-- entirely and becomes what it always should have been: a relation on the
-- clubs table (president_id / vp_id), checked live on every request via
-- requireOwnClub / requireClubLeaderOr — never trusted from a stored flag
-- or a JWT claim.
--
-- Run this AFTER migration 002 if you haven't already:
--   mysql -u root -p campuspulse < src/db/migrations/003_role_architecture.sql

USE campuspulse;

-- Anyone currently holding a club_president/club_vp role keeps their
-- club leadership (already recorded on clubs.president_id / vp_id — this
-- migration touches nothing there) and simply reverts to their real base
-- identity, 'student'.
UPDATE users SET role = 'student' WHERE role IN ('club_president', 'club_vp');

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','teacher','student') NOT NULL DEFAULT 'student';

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(40) NULL,
  target_id INT NULL,
  details TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_target (target_type, target_id),
  INDEX idx_audit_created (created_at)
);
