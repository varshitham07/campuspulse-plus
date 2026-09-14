-- Migration 004: consistent notification actions + fix an over-broad notification
--
-- 1. Adds action_location_id / action_label to notifications, so every
--    notification surface (inbox, dashboard, toast) can render one
--    consistent "[Take Action] →" button instead of each screen inventing
--    its own special case.
-- 2. No data fix needed for the club-request notification bug (it was
--    broadcasting "new club registration submitted" to the entire campus
--    instead of just admins) — that's a code fix, already applied in
--    clubs.controller.js. This migration only adds the columns the fix and
--    the new features need.
--
-- Run: mysql -u root -p campuspulse < src/db/migrations/004_notification_actions.sql

USE campuspulse;

ALTER TABLE notifications
  ADD COLUMN action_location_id INT NULL AFTER reference_id,
  ADD COLUMN action_label VARCHAR(80) NULL AFTER action_location_id;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notif_action_location FOREIGN KEY (action_location_id) REFERENCES locations(id) ON DELETE SET NULL;
