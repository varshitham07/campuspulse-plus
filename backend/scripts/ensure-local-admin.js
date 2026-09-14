require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

(async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('Local admin bootstrap is disabled in production.');
      return;
    }
    const email = String(process.env.DEV_ADMIN_EMAIL || 'admin@campuspulse.dev').trim().toLowerCase();
    const password = String(process.env.DEV_ADMIN_PASSWORD || 'Password123!');
    const name = String(process.env.DEV_ADMIN_NAME || 'CampusPulse Administrator');
    const hash = await bcrypt.hash(password, 12);
    await pool.query(`
      INSERT INTO users (full_name,email,password_hash,role,department,approval_status,is_active,approved_at)
      VALUES (:name,:email,:hash,'admin','Administration','approved',TRUE,NOW())
      ON DUPLICATE KEY UPDATE
        full_name=VALUES(full_name), password_hash=VALUES(password_hash), role='admin',
        approval_status='approved', is_active=TRUE, approved_at=COALESCE(approved_at,NOW())`,
      { name, email, hash });
    console.log(`Local admin ready: ${email}`);
  } catch (err) {
    console.error('Local admin bootstrap failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
