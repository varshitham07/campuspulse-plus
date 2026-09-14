-- Migration 006: student self-registration approval tokens + secure sessions + OTP support
USE campuspulse;

ALTER TABLE users
  MODIFY COLUMN email VARCHAR(190) NULL,
  ADD COLUMN mobile VARCHAR(20) NULL AFTER student_id,
  ADD COLUMN class_section VARCHAR(80) NULL AFTER mobile,
  ADD COLUMN registration_token VARCHAR(32) NULL UNIQUE AFTER class_section,
  ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER registration_token,
  ADD COLUMN approved_by INT NULL AFTER approval_status,
  ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by,
  ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER approved_at,
  ADD CONSTRAINT fk_users_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  user_agent VARCHAR(500),
  ip_address VARCHAR(64),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_auth_sessions_user (user_id, revoked_at),
  INDEX idx_auth_sessions_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS auth_otps (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  destination VARCHAR(190) NOT NULL,
  purpose ENUM('login_recovery') NOT NULL DEFAULT 'login_recovery',
  code_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  attempts TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_auth_otp_lookup (user_id, destination, purpose, consumed_at, expires_at)
);
