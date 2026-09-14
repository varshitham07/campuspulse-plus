require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs');

async function columnExists(db, table, column) {
  const [rows] = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name=? AND column_name=? LIMIT 1`, [table, column]);
  return !!rows.length;
}
async function tableExists(db, table) {
  const [rows] = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name=? LIMIT 1`, [table]);
  return !!rows.length;
}
async function ensureColumn(db, table, column, ddl) {
  if (!(await columnExists(db, table, column))) await db.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

(async () => {
  const step = process.argv[2];
  if (!['006','007'].includes(step)) throw new Error('Usage: node scripts/migrate.js 006|007');
  const db = await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'campuspulse'});
  try {
    if (step === '006') {
      await db.query(`ALTER TABLE users MODIFY COLUMN email VARCHAR(190) NULL`);
      await ensureColumn(db,'users','mobile','mobile VARCHAR(20) NULL AFTER student_id');
      await ensureColumn(db,'users','class_section','class_section VARCHAR(80) NULL AFTER mobile');
      await ensureColumn(db,'users','registration_token','registration_token VARCHAR(32) NULL UNIQUE AFTER class_section');
      await ensureColumn(db,'users','approval_status',`approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER registration_token`);
      await ensureColumn(db,'users','approved_by','approved_by INT NULL AFTER approval_status');
      await ensureColumn(db,'users','approved_at','approved_at TIMESTAMP NULL AFTER approved_by');
      await ensureColumn(db,'users','rejection_reason','rejection_reason VARCHAR(255) NULL AFTER approved_at');
      await db.query(`CREATE TABLE IF NOT EXISTS auth_sessions (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,token_hash CHAR(64) NOT NULL UNIQUE,expires_at DATETIME NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,revoked_at DATETIME NULL,user_agent VARCHAR(500),ip_address VARCHAR(64),FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,INDEX idx_auth_sessions_user (user_id, revoked_at),INDEX idx_auth_sessions_expiry (expires_at))`);
      await db.query(`CREATE TABLE IF NOT EXISTS auth_otps (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,destination VARCHAR(190) NOT NULL,purpose ENUM('login_recovery') NOT NULL DEFAULT 'login_recovery',code_hash CHAR(64) NOT NULL,expires_at DATETIME NOT NULL,consumed_at DATETIME NULL,attempts TINYINT NOT NULL DEFAULT 0,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,INDEX idx_auth_otp_lookup(user_id,destination,purpose,consumed_at,expires_at))`);
      console.log('Migration 006 ready (idempotent).');
    } else {
      await db.query(`CREATE TABLE IF NOT EXISTS departments (id INT AUTO_INCREMENT PRIMARY KEY,code VARCHAR(20) NOT NULL UNIQUE,name VARCHAR(120) NOT NULL UNIQUE,is_active BOOLEAN NOT NULL DEFAULT TRUE)`);
      await db.query(`CREATE TABLE IF NOT EXISTS classes (id INT AUTO_INCREMENT PRIMARY KEY,department_id INT NOT NULL,year_of_study TINYINT NOT NULL,section VARCHAR(20) NOT NULL,name VARCHAR(120) NOT NULL UNIQUE,is_active BOOLEAN NOT NULL DEFAULT TRUE,FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE CASCADE,UNIQUE KEY uq_class_section(department_id,year_of_study,section),INDEX idx_classes_year(year_of_study))`);
      await db.query(`CREATE TABLE IF NOT EXISTS class_teachers (id INT AUTO_INCREMENT PRIMARY KEY,class_id INT NOT NULL,teacher_id INT NOT NULL,assigned_by INT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE SET NULL,UNIQUE KEY uq_class_teacher(class_id),INDEX idx_teacher_class(teacher_id))`);
      await db.query(`CREATE TABLE IF NOT EXISTS club_assignments (id INT AUTO_INCREMENT PRIMARY KEY,club_id INT NOT NULL,user_id INT NOT NULL,assignment_role ENUM('president','vice_president','faculty_coordinator','member_manager') NOT NULL,assigned_by INT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE SET NULL,UNIQUE KEY uq_club_user_assignment(club_id,user_id,assignment_role),INDEX idx_club_assignment_user(user_id,club_id),INDEX idx_club_assignment_role(club_id,assignment_role))`);
      const departments=[['AE','Aeronautical Engineering'],['AIML','Artificial Intelligence & Machine Learning'],['AERO','Aerospace Engineering'],['CHE','Chemical Engineering'],['CSE','Computer Science & Engineering'],['CSD','Computer Science & Design'],['CSDDS','Computer Science & Engineering (Data Science)'],['CIVIL','Civil Engineering'],['ECE','Electronics & Communication Engineering'],['EEE','Electrical & Electronics Engineering'],['IIOT','Industrial IoT'],['ISE','Information Science & Engineering'],['ME','Mechanical Engineering'],['VLSI','Electronics Engineering (VLSI Design & Technology)'],['ECA','Electronics & Communication (Advanced Communication Technology)']];
      await db.query('INSERT IGNORE INTO departments (code,name) VALUES ?', [departments]);
      for (const [code] of departments) { const [[d]]=await db.query('SELECT id FROM departments WHERE code=?',[code]); for(const [y,s] of [[1,'A'],[1,'B'],[2,'A'],[3,'A'],[4,'A']]) { const ord=y===1?'st':y===2?'nd':y===3?'rd':'th'; await db.query('INSERT IGNORE INTO classes (department_id,year_of_study,section,name) VALUES (?,?,?,?)',[d.id,y,s,`${code} ${y}${ord} Year — Section ${s}`]); } }
      console.log('Migration 007 ready (idempotent) and campus academics populated.');
    }
  } finally { await db.end(); }
})().catch(err=>{console.error(`Migration failed: ${err.message}`);process.exit(1);});
