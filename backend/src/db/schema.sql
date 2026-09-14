-- CampusPulse+ schema
-- MySQL 8+

CREATE DATABASE IF NOT EXISTS campuspulse CHARACTER SET utf8mb4;
USE campuspulse;

-- ============ USERS ============
-- role is a base IDENTITY only — admin, teacher, or student. Club leadership
-- is never a role value: it's a scoped RESPONSIBILITY, expressed relationally
-- via clubs.president_id / clubs.vp_id. A student who becomes a club
-- president stays a student — they keep every student capability, and their
-- extra permissions are scoped to exactly the club they lead (see
-- requireClubLeader + requireOwnClub in middleware).
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','teacher','student') NOT NULL DEFAULT 'student',
  department VARCHAR(100),
  year_of_study TINYINT,           -- 1-5, null for staff
  student_id VARCHAR(40),
  mobile VARCHAR(20),
  class_section VARCHAR(80),
  registration_token VARCHAR(32) UNIQUE,
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  rejection_reason VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_department (department)
);

-- ============ CLUBS ============
CREATE TABLE club_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  faculty_coordinator VARCHAR(150) NOT NULL,
  proposed_president_id INT NOT NULL,
  proposed_vp_id INT,
  contact_email VARCHAR(190) NOT NULL,
  supporting_info TEXT,
  status ENUM('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT,
  review_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  FOREIGN KEY (proposed_president_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (proposed_vp_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE clubs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT,
  name VARCHAR(150) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  faculty_coordinator VARCHAR(150) NOT NULL,
  faculty_coordinator_id INT NULL,
  president_id INT NOT NULL,
  vp_id INT,
  contact_email VARCHAR(190) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES club_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (president_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vp_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (faculty_coordinator_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_club_coordinator (faculty_coordinator_id)
);

CREATE TABLE club_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_club_member (club_id, user_id),
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============ CLUB FORMS, MEDIA & LINKS ============
-- A club's self-service tools: custom sign-up/RSVP forms with responses,
-- a media gallery, and a curated links list (Discord, GitHub, Instagram...).
CREATE TABLE club_forms (
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

CREATE TABLE club_form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  label VARCHAR(180) NOT NULL,
  field_type ENUM('text','textarea','select','checkbox','number','email') NOT NULL DEFAULT 'text',
  options TEXT NULL,          -- JSON array of strings, used when field_type = 'select'
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  FOREIGN KEY (form_id) REFERENCES club_forms(id) ON DELETE CASCADE
);

CREATE TABLE club_form_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  user_id INT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_form_user (form_id, user_id),
  FOREIGN KEY (form_id) REFERENCES club_forms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE club_form_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  response_id INT NOT NULL,
  field_id INT NOT NULL,
  answer_text TEXT,
  FOREIGN KEY (response_id) REFERENCES club_form_responses(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES club_form_fields(id) ON DELETE CASCADE
);

CREATE TABLE club_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,   -- relative path under /uploads, server-generated
  original_name VARCHAR(255),
  caption VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE club_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  label VARCHAR(80) NOT NULL,
  url VARCHAR(500) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- ============ LOCATIONS & ROUTE GRAPH ============
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  category VARCHAR(60) NOT NULL, -- academic, admin, hostel, medical, food, parking...
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE location_edges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_location_id INT NOT NULL,
  to_location_id INT NOT NULL,
  distance_meters INT NOT NULL,
  walk_seconds INT NOT NULL,
  FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_edge (from_location_id, to_location_id)
);

-- ============ EVENTS ============
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  created_by INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  category ENUM('technical','cultural','workshop','competition','seminar','meeting','networking') NOT NULL,
  description TEXT NOT NULL,
  location_id INT,
  custom_location VARCHAR(180),
  starts_at DATETIME NOT NULL,
  ends_at DATETIME,
  capacity INT,
  status ENUM('scheduled','postponed','cancelled','completed') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  INDEX idx_events_starts (starts_at),
  INDEX idx_events_category (category)
);

CREATE TABLE event_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('registered','waitlisted','cancelled') NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_user (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============ SUBSCRIPTION TOPICS ============
-- Lets students opt into specific groups (year, department, interest, or
-- role) so notifications can be genuinely targeted rather than only ever
-- campus-wide or matched off their static profile fields.
CREATE TABLE topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  type ENUM('year','department','interest','role') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_topic_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_topic (user_id, topic_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- ============ ANNOUNCEMENTS ============
CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  club_id INT NULL, -- set if this is a club announcement
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  category ENUM('exam','academic','emergency','club','workshop','competition','transportation','facilities','general') NOT NULL,
  urgency ENUM('critical','important','normal') NOT NULL DEFAULT 'normal',
  target_scope ENUM('campus','department','year','class','group','topic','club','event') NOT NULL DEFAULT 'campus',
  target_department VARCHAR(100),
  target_year TINYINT,
  target_club_id INT,
  target_event_id INT,
  target_topic_id INT,
  target_class_id INT NULL,
  deleted_at DATETIME NULL,
  deleted_by INT NULL,
  safe_location_id INT NULL,   -- for emergency alerts: where to direct affected students
  instructions TEXT NULL,       -- for emergency alerts: what to do, in plain language
  ai_suggested_category VARCHAR(40),
  ai_suggested_urgency VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL,
  FOREIGN KEY (target_club_id) REFERENCES clubs(id) ON DELETE SET NULL,
  FOREIGN KEY (target_event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (target_topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (safe_location_id) REFERENCES locations(id) ON DELETE SET NULL,
  INDEX idx_ann_created (created_at),
  INDEX idx_ann_target_class (target_class_id),
  INDEX idx_ann_deleted (deleted_at)
);

-- ============ INCIDENTS / VERIFICATION ============
CREATE TABLE incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reported_by INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'venue_change',
  -- structured "change" payload used for venue-change auto-routing
  affects_event_id INT NULL,
  old_location_id INT NULL,
  new_location_id INT NULL,
  status ENUM('unverified','community_verified','officially_verified','rejected') NOT NULL DEFAULT 'unverified',
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  verified_by INT NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (affects_event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (old_location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (new_location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_incidents_status (status)
);

CREATE TABLE incident_confirmations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  user_id INT NOT NULL,
  vote ENUM('confirm','reject') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_incident_user (incident_id, user_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============ NOTIFICATIONS ============
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- announcement, incident_update, event_update, verification, route_update
  title VARCHAR(180) NOT NULL,
  body VARCHAR(500) NOT NULL,
  urgency ENUM('critical','important','normal') NOT NULL DEFAULT 'normal',
  reference_type VARCHAR(40),  -- announcement, incident, event
  reference_id INT,
  action_location_id INT NULL, -- when set, the UI shows one "[Take Action] →" button routed here
  action_label VARCHAR(80) NULL, -- e.g. "Get directions to safety", "Continue to Auditorium 2"
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (action_location_id) REFERENCES locations(id) ON DELETE SET NULL,
  INDEX idx_notif_user_read (user_id, is_read)
);

-- ============ AUTH SESSIONS / OTP ============
CREATE TABLE auth_sessions (
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

CREATE TABLE auth_otps (
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

-- ============ AUDIT LOG ============
-- A lightweight trail for sensitive actions (role changes, club approvals,
-- official verifications, deactivations) — who did what, to what, when.
-- Deliberately a short human-readable line per event, not a full diff store.
CREATE TABLE audit_log (
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

-- ============ ACTIVE NAVIGATION SESSIONS (for dynamic re-routing demo) ============
CREATE TABLE navigation_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  from_location_id INT NOT NULL,
  to_location_id INT NOT NULL,
  linked_event_id INT NULL,   -- if navigating to an event venue, link it so we can auto-reroute
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- ============ CAMPUS STRUCTURE / SCOPED RESPONSIBILITIES (fresh-install support) ============
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
  UNIQUE KEY uq_class_section (department_id, year_of_study, section)
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
  UNIQUE KEY uq_class_teacher (class_id)
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
  UNIQUE KEY uq_club_user_assignment (club_id, user_id, assignment_role)
);


-- ===== CAMPUSPULSE+ DEFAULT MVJCE CAMPUS STRUCTURE =====
INSERT IGNORE INTO departments (code,name) VALUES
('AE','Aeronautical Engineering'),
('AIML','Artificial Intelligence & Machine Learning'),
('AERO','Aerospace Engineering'),
('CHE','Chemical Engineering'),
('CSE','Computer Science & Engineering'),
('CSD','Computer Science & Design'),
('CSDDS','Computer Science & Engineering (Data Science)'),
('CIVIL','Civil Engineering'),
('ECE','Electronics & Communication Engineering'),
('EEE','Electrical & Electronics Engineering'),
('IIOT','Industrial IoT'),
('ISE','Information Science & Engineering'),
('ME','Mechanical Engineering'),
('VLSI','Electronics Engineering (VLSI Design & Technology)'),
('ECA','Electronics & Communication (Advanced Communication Technology)');
INSERT IGNORE INTO classes (department_id,year_of_study,section,name)
SELECT d.id, y.year_of_study, y.section, CONCAT(d.code,' ',y.label,' — Section ',y.section)
FROM departments d CROSS JOIN (
SELECT 1 year_of_study,'A' section,'1st Year' label UNION ALL SELECT 1,'B','1st Year' UNION ALL SELECT 2,'A','2nd Year' UNION ALL SELECT 3,'A','3rd Year' UNION ALL SELECT 4,'A','4th Year'
) y;
