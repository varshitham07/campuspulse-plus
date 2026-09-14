USE campuspulse;

-- ============ SUBSCRIPTION TOPICS ============
INSERT INTO topics (name, type) VALUES
  ('1st Year', 'year'), ('2nd Year', 'year'), ('3rd Year', 'year'), ('4th Year', 'year'),
  ('CSE', 'department'), ('ECE', 'department'), ('AIML', 'department'),
  ('Mechanical', 'department'), ('Civil', 'department'), ('Electrical', 'department'),
  ('Faculty', 'role'),
  ('Hackathons', 'interest'), ('Workshops', 'interest'), ('Placements', 'interest'),
  ('Sports', 'interest'), ('Cultural Events', 'interest'), ('Entrepreneurship', 'interest');

-- ============ LOCATIONS ============
-- Coordinates are relative/fictional but consistent for a walkable campus layout
INSERT INTO locations (name, category, lat, lng, description) VALUES
('Main Gate', 'entrance', 12.98360, 77.76170, 'Primary campus entrance on Ring Road'),
('Block A', 'academic', 12.98388, 77.76190, 'First-year and second-year classrooms'),
('Block B', 'academic', 12.98415, 77.76215, 'Engineering department block'),
('Auditorium 1', 'academic', 12.98430, 77.76180, 'Main auditorium, 500 seats'),
('Auditorium 2', 'academic', 12.98445, 77.76245, 'Secondary auditorium, 250 seats'),
('Seminar Hall', 'academic', 12.98405, 77.76145, 'Used for guest lectures and workshops'),
('Library', 'academic', 12.98375, 77.76255, 'Central library, 6am-11pm'),
('Canteen', 'food', 12.98320, 77.76225, 'Main dining hall'),
('Admin Office', 'admin', 12.98378, 77.76130, 'Registrar and administration'),
('Examination Cell', 'admin', 12.98392, 77.76115, 'Exam scheduling and records'),
('Placement Cell', 'admin', 12.98465, 77.76205, 'Career services and recruiter visits'),
('Medical Room', 'medical', 12.98325, 77.76170, 'First aid and campus nurse'),
('Labs Complex', 'academic', 12.98435, 77.76275, 'Computer science and electronics labs'),
('Parking', 'parking', 12.98310, 77.76140, 'Two-wheeler and car parking');

-- ============ EDGES (bidirectional walking paths) ============
-- helper: distance in meters, walk time assumes ~1.2 m/s
INSERT INTO location_edges (from_location_id, to_location_id, distance_meters, walk_seconds)
SELECT a.id, b.id, d, ROUND(d/1.2)
FROM (
  SELECT 'Main Gate' f, 'Block A' t, 90 d UNION ALL
  SELECT 'Main Gate', 'Admin Office', 130 UNION ALL
  SELECT 'Main Gate', 'Parking', 60 UNION ALL
  SELECT 'Block A', 'Block B', 100 UNION ALL
  SELECT 'Block A', 'Seminar Hall', 80 UNION ALL
  SELECT 'Block B', 'Auditorium 2', 140 UNION ALL
  SELECT 'Block B', 'Labs Complex', 110 UNION ALL
  SELECT 'Block B', 'Library', 90 UNION ALL
  SELECT 'Seminar Hall', 'Auditorium 1', 60 UNION ALL
  SELECT 'Seminar Hall', 'Examination Cell', 50 UNION ALL
  SELECT 'Admin Office', 'Examination Cell', 40 UNION ALL
  SELECT 'Admin Office', 'Medical Room', 70 UNION ALL
  SELECT 'Library', 'Canteen', 120 UNION ALL
  SELECT 'Library', 'Placement Cell', 160 UNION ALL
  SELECT 'Auditorium 1', 'Library', 130 UNION ALL
  SELECT 'Auditorium 2', 'Labs Complex', 90 UNION ALL
  SELECT 'Auditorium 2', 'Placement Cell', 100 UNION ALL
  SELECT 'Canteen', 'Parking', 100 UNION ALL
  SELECT 'Medical Room', 'Canteen', 90
) AS pairs
JOIN locations a ON a.name = pairs.f
JOIN locations b ON b.name = pairs.t
CROSS JOIN (SELECT 1) x, (SELECT pairs.d AS d) y;

-- mirror edges so the graph is undirected
INSERT INTO location_edges (from_location_id, to_location_id, distance_meters, walk_seconds)
SELECT to_location_id, from_location_id, distance_meters, walk_seconds FROM location_edges;

-- ============ DEV ACCOUNTS (password for all: Password123!) ============
-- password_hash below is a genuine bcrypt hash of "Password123!" (cost 12) —
-- verified to work against bcrypt.compare(). Use /api/auth/register for real users.
INSERT INTO users (full_name, email, password_hash, role, department, year_of_study, student_id, approval_status, approved_at) VALUES
('Ava Administrator', 'admin@campuspulse.dev', '$2b$12$2uXrz/Kz0/7XK1UibcJs4eE4aKtqpYKnvrwp11sF9kwhK2MO8ig.q', 'admin', 'Administration', NULL, NULL, 'approved', NOW()),
('Rohan Mehta', 'teacher@campuspulse.dev', '$2b$12$2uXrz/Kz0/7XK1UibcJs4eE4aKtqpYKnvrwp11sF9kwhK2MO8ig.q', 'teacher', 'CSE', NULL, NULL, 'approved', NOW()),
('Priya Nair', 'president@campuspulse.dev', '$2b$12$2uXrz/Kz0/7XK1UibcJs4eE4aKtqpYKnvrwp11sF9kwhK2MO8ig.q', 'student', 'CSE', 3, 'CS21045', 'approved', NOW()),
('Karan Shah', 'vp@campuspulse.dev', '$2b$12$2uXrz/Kz0/7XK1UibcJs4eE4aKtqpYKnvrwp11sF9kwhK2MO8ig.q', 'student', 'CSE', 3, 'CS21099', 'approved', NOW()),
('Meera Iyer', 'student@campuspulse.dev', '$2b$12$2uXrz/Kz0/7XK1UibcJs4eE4aKtqpYKnvrwp11sF9kwhK2MO8ig.q', 'student', 'CSE', 2, 'CS22118', 'approved', NOW());

INSERT INTO clubs (name, category, description, faculty_coordinator, president_id, vp_id, contact_email)
VALUES ('Coding Club', 'Technical',
  'Weekly problem-solving sessions, hackathons, and peer mentoring for students who want to get better at building things.',
  'Dr. Rohan Mehta',
  (SELECT id FROM users WHERE email='president@campuspulse.dev'),
  (SELECT id FROM users WHERE email='vp@campuspulse.dev'),
  'codingclub@campuspulse.dev');

INSERT INTO club_members (club_id, user_id)
VALUES (1, (SELECT id FROM users WHERE email='student@campuspulse.dev'));

-- Auto-subscribe the seeded student to the topics matching their own profile —
-- the same thing that happens automatically for every new registration —
-- plus one interest tag, to show a non-default subscription is possible too.
INSERT INTO user_topic_subscriptions (user_id, topic_id)
SELECT (SELECT id FROM users WHERE email='student@campuspulse.dev'), id FROM topics WHERE name IN ('2nd Year', 'CSE', 'Hackathons');

INSERT INTO events (club_id, created_by, title, category, description, location_id, starts_at, ends_at, capacity, status)
VALUES (
  1,
  (SELECT id FROM users WHERE email='president@campuspulse.dev'),
  'Autumn Hackathon',
  'competition',
  'A 24-hour build event open to all departments. Teams of up to 4, prizes for top 3 projects.',
  (SELECT id FROM locations WHERE name='Auditorium 1'),
  DATE_ADD(NOW(), INTERVAL 5 DAY),
  DATE_ADD(NOW(), INTERVAL 6 DAY),
  120,
  'scheduled'
);

INSERT INTO announcements (author_id, category, urgency, target_scope, target_department, title, body)
VALUES (
  (SELECT id FROM users WHERE email='teacher@campuspulse.dev'),
  'exam', 'important', 'department', 'CSE',
  'Mid-semester exam schedule released',
  'The mid-semester exam timetable for Computer Science has been posted on the department board and the Examination Cell. Please check your slot.'
);
