-- CampusPulse+ structural refinement
-- Run after migrations 002-006.
USE campuspulse;

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  year_of_study TINYINT NOT NULL,
  section VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE KEY uq_class_section (department_id, year_of_study, section),
  INDEX idx_classes_year (year_of_study)
);

CREATE TABLE IF NOT EXISTS class_teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  assigned_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_class_teacher (class_id),
  INDEX idx_teacher_class (teacher_id)
);

CREATE TABLE IF NOT EXISTS club_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  user_id INT NOT NULL,
  assignment_role ENUM('president','vice_president','faculty_coordinator','member_manager') NOT NULL,
  assigned_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_club_user_assignment (club_id, user_id, assignment_role),
  INDEX idx_club_assignment_user (user_id, club_id),
  INDEX idx_club_assignment_role (club_id, assignment_role)
);

-- Fresh installs already include faculty_coordinator_id in schema.sql.
-- For legacy databases, apply the original ALTER manually only if the column is missing.

-- Fresh installs already include these announcement fields in schema.sql.
-- Legacy databases may need these ALTERs once if the fields are missing.


INSERT IGNORE INTO departments (code, name) VALUES
  ('ECE', 'Electronics & Communication Engineering'),
  ('CSE', 'Computer Science & Engineering'),
  ('ISE', 'Information Science & Engineering'),
  ('AIML', 'Artificial Intelligence & Machine Learning'),
  ('ME', 'Mechanical Engineering'),
  ('CIVIL', 'Civil Engineering');

INSERT IGNORE INTO classes (department_id, year_of_study, section, name)
SELECT d.id, 1, 'A', CONCAT(d.code, ' 1st Year — Section A') FROM departments d;
INSERT IGNORE INTO classes (department_id, year_of_study, section, name)
SELECT d.id, 1, 'B', CONCAT(d.code, ' 1st Year — Section B') FROM departments d;
INSERT IGNORE INTO classes (department_id, year_of_study, section, name)
SELECT d.id, 2, 'A', CONCAT(d.code, ' 2nd Year — Section A') FROM departments d;
INSERT IGNORE INTO classes (department_id, year_of_study, section, name)
SELECT d.id, 3, 'A', CONCAT(d.code, ' 3rd Year — Section A') FROM departments d;
INSERT IGNORE INTO classes (department_id, year_of_study, section, name)
SELECT d.id, 4, 'A', CONCAT(d.code, ' 4th Year — Section A') FROM departments d;

-- Convert the existing single President/VP relationships into the normalized
-- assignment table. Coordinators are intentionally left NULL until an admin
-- explicitly selects a real teacher account.
INSERT IGNORE INTO club_assignments (club_id, user_id, assignment_role)
SELECT id, president_id, 'president' FROM clubs WHERE president_id IS NOT NULL;
INSERT IGNORE INTO club_assignments (club_id, user_id, assignment_role)
SELECT id, vp_id, 'vice_president' FROM clubs WHERE vp_id IS NOT NULL;

-- Existing free-text coordinator values remain as legacy display data only;
-- faculty_coordinator_id is the authoritative linked account from this point.
