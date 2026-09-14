const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { hashCode, normalizeMobile, deliverOtp } = require('../services/otp.service');

const SAFE_USER_FIELDS = 'id, full_name, email, role, department, year_of_study, student_id, mobile, class_section, approval_status, created_at';
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const REFRESH_COOKIE = 'cp_refresh';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    const key = index >= 0 ? part.slice(0, index).trim() : part.trim();
    const value = index >= 0 ? decodeURIComponent(part.slice(index + 1).trim()) : '';
    return [key, value];
  }));
}
function hashToken(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function cookieOptions(maxAgeMs) {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAMESITE || (secure ? 'none' : 'lax');
  return `Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}${secure ? '; Secure' : ''}`;
}
function setRefreshCookie(res, token) { res.setHeader('Set-Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(REFRESH_DAYS * 86400000)}`); }
function clearRefreshCookie(res) { res.setHeader('Set-Cookie', `${REFRESH_COOKIE}=; ${cookieOptions(0)}`); }
function signAccessToken(user) { return jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL }); }

async function getClubLeadership(userId) {
  const [rows] = await pool.query(
    `SELECT ca.club_id, c.name AS club_name, ca.assignment_role AS role
     FROM club_assignments ca JOIN clubs c ON c.id = ca.club_id
     WHERE ca.user_id = :userId AND c.is_active = TRUE
     ORDER BY c.name`, { userId }
  );
  return rows;
}

async function createRefreshSession(req, res, userId) {
  const raw = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400000);
  await pool.query(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (:userId, :tokenHash, :expiresAt, :userAgent, :ipAddress)`,
    { userId, tokenHash: hashToken(raw), expiresAt, userAgent: String(req.get('user-agent') || '').slice(0, 500), ipAddress: String(req.ip || '').slice(0, 64) }
  );
  setRefreshCookie(res, raw);
}

async function register(req, res, next) {
  try {
    const { full_name, email, password, department, department_id, year_of_study, student_id, mobile, class_id, class_section } = req.body;
    const missing = [];
    if (!String(full_name || '').trim()) missing.push('full name');
    if (!String(year_of_study || '').trim()) missing.push('year of study');
    if (!String(student_id || '').trim()) missing.push('student ID');
    if (!String(mobile || '').trim() && !String(email || '').trim()) missing.push('mobile number or email');
    if (!String(department_id || department || '').trim()) missing.push('department');
    if (!String(class_id || class_section || '').trim()) missing.push('class / section');
    if (missing.length) throw new ApiError(400, `Please complete the required student details: ${missing.join(', ')}.`);
    if (password && password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters if provided.');

    let classRows;
    if (class_id) {
      [classRows] = await pool.query(
        `SELECT c.id, c.name, c.year_of_study, d.id AS department_id, d.code AS department_code, d.name AS department_name
         FROM classes c JOIN departments d ON d.id = c.department_id
         WHERE c.id = :classId AND c.is_active = TRUE AND d.is_active = TRUE`, { classId: class_id }
      );
    } else if (class_section && (department_id || department)) {
      const filters = department_id ? 'd.id = :departmentId' : 'd.name = :departmentName';
      [classRows] = await pool.query(
        `SELECT c.id, c.name, c.year_of_study, d.id AS department_id, d.code AS department_code, d.name AS department_name
         FROM classes c JOIN departments d ON d.id = c.department_id
         WHERE ${filters} AND c.year_of_study = :year AND c.name = :className
           AND c.is_active = TRUE AND d.is_active = TRUE`,
        { departmentId: department_id ? Number(department_id) : undefined, departmentName: department_id ? undefined : String(department).trim(), year: Number(year_of_study), className: String(class_section).trim() }
      );
    } else {
      classRows = [];
    }
    if (!classRows[0]) throw new ApiError(400, 'Please choose a valid active class/section.');
    const classDepartmentMatches = department_id ? Number(classRows[0].department_id) === Number(department_id) : (!department || classRows[0].department_name === department);
    if (Number(classRows[0].year_of_study) !== Number(year_of_study) || !classDepartmentMatches) {
      throw new ApiError(400, 'Class, department and year do not match. Please select the class from the list.');
    }
    const canonicalDepartment = classRows[0].department_name;

    const normalizedMobile = normalizeMobile(mobile);
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const [existing] = await pool.query('SELECT id FROM users WHERE (:email IS NOT NULL AND email = :email) OR student_id = :studentId OR (:mobile IS NOT NULL AND mobile = :mobile)', { email: normalizedEmail, studentId: student_id.trim(), mobile: normalizedMobile });
    if (existing.length) throw new ApiError(409, 'An account with those details already exists.');

    const passwordHash = await bcrypt.hash(password || crypto.randomBytes(16).toString('hex'), 10);
    const registrationToken = `CP-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const className = classRows[0].name;

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, department, year_of_study, student_id, mobile, class_section, registration_token, approval_status, is_active)
       VALUES (:fullName, :email, :passwordHash, 'student', :department, :year, :studentId, :mobile, :className, :registrationToken, 'pending', FALSE)`,
      { fullName: full_name.trim(), email: normalizedEmail, passwordHash, department: canonicalDepartment, year: Number(year_of_study), studentId: student_id.trim(), mobile: normalizedMobile, className, registrationToken }
    );

    res.status(201).json({
      message: 'Registration submitted. Show this token to your college admin for verification.',
      registrationToken,
      status: 'pending',
      user: { id: result.insertId, full_name: full_name.trim(), email: normalizedEmail, department: canonicalDepartment, year_of_study: Number(year_of_study), student_id, mobile: normalizedMobile, class_section: className, approval_status: 'pending' },
    });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ApiError(400, 'Email and password are required.');
    const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email: String(email).trim().toLowerCase() });
    const user = rows[0];
    if (!user) throw new ApiError(401, 'Incorrect email or password.');
    if (user.approval_status !== 'approved' || !user.is_active) throw new ApiError(403, user.approval_status === 'pending' ? 'Your registration is still awaiting college admin approval.' : 'Your account is not currently active.');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new ApiError(401, 'Incorrect email or password.');
    const token = signAccessToken(user); delete user.password_hash;
    const clubLeadership = await getClubLeadership(user.id);
    await createRefreshSession(req, res, user.id);
    res.json({ user, token, clubLeadership, expiresIn: ACCESS_TTL });
  } catch (err) { next(err); }
}

async function requestOtp(req, res, next) {
  try {
    const identifier = String(req.body.identifier || '').trim();
    if (!identifier) throw new ApiError(400, 'Enter your registered mobile number or email.');
    const [rows] = await pool.query('SELECT * FROM users WHERE mobile = :identifier OR email = :identifier LIMIT 1', { identifier: identifier.toLowerCase() });
    const user = rows[0];
    if (!user || user.approval_status !== 'approved' || !user.is_active) throw new ApiError(403, 'Only approved and active accounts can request a login OTP.');
    const destination = normalizeMobile(user.mobile) || user.email;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await pool.query('UPDATE auth_otps SET consumed_at = NOW() WHERE user_id = :userId AND purpose = "login_recovery" AND consumed_at IS NULL', { userId: user.id });
    await pool.query(`INSERT INTO auth_otps (user_id, destination, purpose, code_hash, expires_at) VALUES (:userId, :destination, 'login_recovery', :codeHash, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`, { userId: user.id, destination, codeHash: hashCode(code) });
    const delivery = await deliverOtp(destination, code);
    if (!delivery.delivered) throw new ApiError(503, 'OTP delivery is not configured yet. Add your SMS provider credentials to the backend environment.');
    res.json({ message: 'OTP sent to your registered contact.', destinationMasked: destination.length > 5 ? `${destination.slice(0, 3)}••••${destination.slice(-2)}` : 'registered contact', devCode: delivery.mode === 'console' && process.env.NODE_ENV !== 'production' ? code : undefined });
  } catch (err) { next(err); }
}

async function verifyOtp(req, res, next) {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code) throw new ApiError(400, 'Identifier and OTP are required.');
    const [users] = await pool.query('SELECT * FROM users WHERE mobile = :identifier OR email = :identifier LIMIT 1', { identifier: String(identifier).trim().toLowerCase() });
    const user = users[0];
    if (!user || user.approval_status !== 'approved' || !user.is_active) throw new ApiError(403, 'Only approved and active accounts can use OTP login.');
    const [rows] = await pool.query(`SELECT * FROM auth_otps WHERE user_id = :userId AND purpose = 'login_recovery' AND consumed_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`, { userId: user.id });
    const otp = rows[0];
    if (!otp) throw new ApiError(401, 'That OTP has expired. Request a new one.');
    if (Number(otp.attempts) >= 5) throw new ApiError(429, 'Too many OTP attempts. Request a new code.');
    if (hashCode(code) !== otp.code_hash) {
      await pool.query('UPDATE auth_otps SET attempts = attempts + 1 WHERE id = :id', { id: otp.id });
      throw new ApiError(401, 'Incorrect OTP.');
    }
    await pool.query('UPDATE auth_otps SET consumed_at = NOW() WHERE id = :id', { id: otp.id });
    const token = signAccessToken(user); delete user.password_hash;
    const clubLeadership = await getClubLeadership(user.id);
    await createRefreshSession(req, res, user.id);
    res.json({ user, token, clubLeadership, expiresIn: ACCESS_TTL });
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const raw = parseCookies(req)[REFRESH_COOKIE];
    if (!raw) throw new ApiError(401, 'No active session.');
    const [rows] = await pool.query(`SELECT s.id AS session_id, u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = :tokenHash AND s.revoked_at IS NULL AND s.expires_at > NOW()`, { tokenHash: hashToken(raw) });
    const session = rows[0];
    if (!session || !session.is_active || session.approval_status !== 'approved') { clearRefreshCookie(res); throw new ApiError(401, 'Your session is no longer valid.'); }
    await pool.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = :id', { id: session.session_id });
    const token = signAccessToken(session); delete session.password_hash; delete session.session_id;
    const clubLeadership = await getClubLeadership(session.id);
    await createRefreshSession(req, res, session.id);
    res.json({ user: session, token, clubLeadership, expiresIn: ACCESS_TTL });
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    const raw = parseCookies(req)[REFRESH_COOKIE];
    if (raw) await pool.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = :tokenHash', { tokenHash: hashToken(raw) });
    clearRefreshCookie(res); res.json({ message: 'Signed out.' });
  } catch (err) { next(err); }
}

async function publicDepartments(req,res,next){try{const [rows]=await pool.query('SELECT id,code,name FROM departments WHERE is_active=TRUE ORDER BY name');res.json({departments:rows});}catch(err){next(err);}}
async function publicClasses(req,res,next){try{const params={};const where=['c.is_active=TRUE'];if(req.query.departmentId){where.push('c.department_id=:departmentId');params.departmentId=Number(req.query.departmentId);}if(req.query.year){where.push('c.year_of_study=:year');params.year=Number(req.query.year);}const [rows]=await pool.query(`SELECT c.id,c.name,c.year_of_study,c.section,d.code AS department_code,d.name AS department_name FROM classes c JOIN departments d ON d.id=c.department_id WHERE ${where.join(' AND ')} ORDER BY d.code,c.year_of_study,c.section`,params);res.json({classes:rows});}catch(err){next(err);}}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = :id`, { id: req.user.id });
    const user = rows[0];
    if (!user || user.approval_status !== 'approved' || !user.is_active) throw new ApiError(401, 'Account is not active.');
    const clubLeadership = await getClubLeadership(req.user.id);
    res.json({ user, clubLeadership });
  } catch (err) { next(err); }
}

module.exports = { register, login, requestOtp, verifyOtp, refresh, logout, me, publicDepartments, publicClasses };
