const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { logAction } = require('../services/audit.service');
const { parsePagination } = require('../utils/pagination');

// Includes each user's club leadership as a relational lookup (never a role
// value) so the admin UI can show "Student · President, Coding Club"
// instead of a flattened role badge.
async function listUsers(req, res, next) {
  try {
    const { role, q } = req.query;
    const conditions = [];
    const params = {};
    if (role) { conditions.push('u.role = :role'); params.role = role; }
    if (q) { conditions.push('(u.full_name LIKE :q OR u.email LIKE :q)'); params.q = `%${q}%`; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { page, pageSize, offset } = parsePagination(req.query, { defaultPageSize: 20, maxPageSize: 200 });

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.department, u.year_of_study, u.is_active, u.created_at,
              (SELECT GROUP_CONCAT(name SEPARATOR ', ') FROM clubs WHERE president_id = u.id) AS presides_over,
              (SELECT GROUP_CONCAT(name SEPARATOR ', ') FROM clubs WHERE vp_id = u.id) AS vp_of
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);
    res.json({ users: rows, page, pageSize, total, hasMore: offset + rows.length < total });
  } catch (err) { next(err); }
}

// role is a base IDENTITY only — admin, teacher, or student. Club leadership
// is never assigned here; see updateClubLeadership below.
async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'teacher', 'student'];
    if (!validRoles.includes(role)) throw new ApiError(400, 'Invalid role.');
    if (Number(req.params.id) === req.user.id) throw new ApiError(400, "You can't change your own role.");

    await pool.query('UPDATE users SET role = :role WHERE id = :id', { role, id: req.params.id });
    await logAction({ actorId: req.user.id, action: 'user.role_changed', targetType: 'user', targetId: req.params.id, details: `Role changed to ${role}` });
    res.json({ message: 'Role updated.' });
  } catch (err) { next(err); }
}

async function setUserActive(req, res, next) {
  try {
    const { is_active } = req.body;
    if (Number(req.params.id) === req.user.id) throw new ApiError(400, "You can't deactivate your own account.");
    await pool.query('UPDATE users SET is_active = :active WHERE id = :id', { active: !!is_active, id: req.params.id });
    await logAction({
      actorId: req.user.id,
      action: is_active ? 'user.reactivated' : 'user.deactivated',
      targetType: 'user',
      targetId: req.params.id,
    });
    res.json({ message: is_active ? 'Account reactivated.' : 'Account deactivated.' });
  } catch (err) { next(err); }
}

// Reassigns who leads a club. Deliberately separate from a general "edit
// club" action — handing off leadership is a distinct, higher-stakes admin
// action and gets its own audit entry. Club leadership stays a relation on
// the clubs table, never a role value, so this is the only place it's set
// outside of the original approval flow.
async function updateClubLeadership(req, res, next) {
  try {
    const { presidentId, vpId, coordinatorId } = req.body;
    const clubId = Number(req.params.id);
    const [[club]] = await pool.query('SELECT id, name FROM clubs WHERE id=:id',{id:clubId});
    if(!club) throw new ApiError(404,'Club not found.');
    if(presidentId){const [[u]]=await pool.query("SELECT id FROM users WHERE id=:id AND is_active=TRUE",{id:presidentId});if(!u)throw new ApiError(400,'Invalid president account.');}
    if(vpId){const [[u]]=await pool.query("SELECT id FROM users WHERE id=:id AND is_active=TRUE",{id:vpId});if(!u)throw new ApiError(400,'Invalid vice president account.');}
    if(coordinatorId){const [[u]]=await pool.query("SELECT id FROM users WHERE id=:id AND role='teacher' AND is_active=TRUE",{id:coordinatorId});if(!u)throw new ApiError(400,'Faculty Coordinator must be an active teacher account.');}
    const updates=[];const params={id:clubId};
    if(presidentId){updates.push('president_id=:presidentId');params.presidentId=Number(presidentId);}
    if(vpId!==undefined){updates.push('vp_id=:vpId');params.vpId=vpId?Number(vpId):null;}
    if(coordinatorId!==undefined){updates.push('faculty_coordinator_id=:coordinatorId');params.coordinatorId=coordinatorId?Number(coordinatorId):null;}
    if(!updates.length)throw new ApiError(400,'No changes provided.');
    await pool.query(`UPDATE clubs SET ${updates.join(', ')} WHERE id=:id`,params);
    if(presidentId){await pool.query("DELETE FROM club_assignments WHERE club_id=:clubId AND assignment_role='president'",{clubId});await pool.query("INSERT INTO club_assignments (club_id,user_id,assignment_role,assigned_by) VALUES (:clubId,:uid,'president',:adminId)",{clubId,uid:presidentId,adminId:req.user.id});}
    if(vpId!==undefined){await pool.query("DELETE FROM club_assignments WHERE club_id=:clubId AND assignment_role='vice_president'",{clubId});if(vpId)await pool.query("INSERT INTO club_assignments (club_id,user_id,assignment_role,assigned_by) VALUES (:clubId,:uid,'vice_president',:adminId)",{clubId,uid:vpId,adminId:req.user.id});}
    if(coordinatorId!==undefined){await pool.query("DELETE FROM club_assignments WHERE club_id=:clubId AND assignment_role='faculty_coordinator'",{clubId});if(coordinatorId)await pool.query("INSERT INTO club_assignments (club_id,user_id,assignment_role,assigned_by) VALUES (:clubId,:uid,'faculty_coordinator',:adminId)",{clubId,uid:coordinatorId,adminId:req.user.id});}
    await logAction({actorId:req.user.id,action:'club.leadership_changed',targetType:'club',targetId:clubId,details:`${club.name} — leadership updated`});
    res.json({message:'Club leadership updated.'});
  } catch(err){next(err);}
}

// Real counts, not placeholder numbers — every figure here is a live query.
async function overview(req, res, next) {
  try {
    const [[userCount]] = await pool.query('SELECT COUNT(*) AS c FROM users WHERE is_active = TRUE');
    const [[clubCount]] = await pool.query('SELECT COUNT(*) AS c FROM clubs WHERE is_active = TRUE');
    const [[pendingClubs]] = await pool.query(`SELECT COUNT(*) AS c FROM club_requests WHERE status = 'pending'`);
    const [[pendingStudents]] = await pool.query(`SELECT COUNT(*) AS c FROM users WHERE approval_status = 'pending'`);
    const [[upcomingEvents]] = await pool.query(`SELECT COUNT(*) AS c FROM events WHERE starts_at > NOW() AND status = 'scheduled'`);
    const [[openIncidents]] = await pool.query(`SELECT COUNT(*) AS c FROM incidents WHERE status IN ('unverified','community_verified')`);
    const [[announcements24h]] = await pool.query(`SELECT COUNT(*) AS c FROM announcements WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`);

    res.json({
      activeUsers: userCount.c,
      activeClubs: clubCount.c,
      pendingClubRequests: pendingClubs.c,
      pendingStudentRegistrations: pendingStudents.c,
      upcomingEvents: upcomingEvents.c,
      openIncidents: openIncidents.c,
      announcementsLast24h: announcements24h.c,
    });
  } catch (err) { next(err); }
}



async function listPendingRegistrations(req, res, next) {
  try {
    const { q } = req.query;
    const conditions = [`u.approval_status = 'pending'`];
    const params = {};
    if (q) {
      conditions.push('(u.registration_token = :q OR u.student_id LIKE :likeQ OR u.full_name LIKE :likeQ OR u.email LIKE :likeQ)');
      params.q = q;
      params.likeQ = `%${q}%`;
    }
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.mobile, u.student_id, u.department, u.year_of_study, u.class_section,
              u.registration_token, u.approval_status, u.created_at
       FROM users u WHERE ${conditions.join(' AND ')} ORDER BY u.created_at ASC`,
      params
    );
    res.json({ registrations: rows });
  } catch (err) { next(err); }
}

async function reviewRegistration(req, res, next) {
  try {
    const { decision, note } = req.body;
    if (!['approved', 'rejected'].includes(decision)) throw new ApiError(400, 'Decision must be approved or rejected.');

    const [rows] = await pool.query('SELECT id, registration_token, full_name, approval_status FROM users WHERE registration_token = :token FOR UPDATE', { token: req.params.token });
    const student = rows[0];
    if (!student) throw new ApiError(404, 'Registration token not found.');
    if (student.approval_status !== 'pending') throw new ApiError(409, 'This registration has already been reviewed.');

    await pool.query(
      `UPDATE users SET approval_status = :decision, is_active = :active,
         approved_by = CASE WHEN :decision = 'approved' THEN :adminId ELSE NULL END,
         approved_at = CASE WHEN :decision = 'approved' THEN NOW() ELSE NULL END,
         rejection_reason = CASE WHEN :decision = 'rejected' THEN :note ELSE NULL END
       WHERE id = :id`,
      { decision, active: decision === 'approved', adminId: req.user.id, note: note || null, id: student.id }
    );

    await logAction({
      actorId: req.user.id,
      action: `registration.${decision}`,
      targetType: 'user',
      targetId: student.id,
      details: `${student.full_name} (${student.registration_token})${note ? ` — ${note}` : ''}`,
    });

    res.json({ message: decision === 'approved' ? 'Student account approved.' : 'Registration rejected.' });
  } catch (err) { next(err); }
}

async function listAuditLog(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at, u.full_name AS actor_name
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 100`
    );
    res.json({ entries: rows });
  } catch (err) { next(err); }
}

// A real delivery log — each row is an actual batch of notifications that
// went out, grouped by what triggered them, with a genuine recipient count
// (COUNT(*) over the notifications table) rather than an invented number.
async function listNotificationsSummary(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT type, reference_type, reference_id, title, urgency,
              COUNT(*) AS recipients, MAX(created_at) AS sent_at
       FROM notifications
       GROUP BY type, reference_type, reference_id, title, urgency
       ORDER BY sent_at DESC
       LIMIT 50`
    );
    res.json({ batches: rows });
  } catch (err) { next(err); }
}


async function listPendingRegistrations(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const params = {};
    const where = [`u.approval_status = 'pending'`];
    if (q) { where.push('(u.registration_token LIKE :q OR u.student_id LIKE :q OR u.full_name LIKE :q OR u.mobile LIKE :q OR u.email LIKE :q)'); params.q = `%${q}%`; }
    const [rows] = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.mobile, u.student_id, u.department, u.year_of_study, u.class_section,
             u.registration_token, u.approval_status, u.created_at, c.name AS class_name
      FROM users u
      LEFT JOIN classes c ON c.name = u.class_section
      WHERE ${where.join(' AND ')}
      ORDER BY u.created_at ASC`, params);
    res.json({ registrations: rows });
  } catch (err) { next(err); }
}

async function reviewStudentRegistration(req, res, next) {
  try {
    const { decision, reason } = req.body;
    if (!['approved','rejected'].includes(decision)) throw new ApiError(400, 'Decision must be approved or rejected.');
    const [rows] = await pool.query('SELECT * FROM users WHERE registration_token = :token FOR UPDATE', { token: req.params.token });
    const user = rows[0];
    if (!user) throw new ApiError(404, 'Registration token not found.');
    if (user.approval_status !== 'pending') throw new ApiError(409, 'This registration has already been reviewed.');

    if (decision === 'approved') {
      await pool.query(`UPDATE users SET approval_status='approved', is_active=TRUE, approved_by=:adminId, approved_at=NOW(), rejection_reason=NULL WHERE id=:id`, { adminId: req.user.id, id: user.id });
    } else {
      await pool.query(`UPDATE users SET approval_status='rejected', is_active=FALSE, approved_by=:adminId, approved_at=NOW(), rejection_reason=:reason WHERE id=:id`, { adminId: req.user.id, id: user.id, reason: String(reason || 'Registration was not approved.').slice(0,255) });
    }
    await logAction({ actorId: req.user.id, action: `student_registration.${decision}`, targetType:'user', targetId:user.id, details:`${user.registration_token} — ${decision}${reason ? `: ${reason}` : ''}` });
    res.json({ message: decision === 'approved' ? 'Student account approved.' : 'Registration rejected.' });
  } catch (err) { next(err); }
}

async function listDepartments(req, res, next) {
  try { const [rows] = await pool.query('SELECT id, code, name FROM departments WHERE is_active=TRUE ORDER BY name'); res.json({ departments: rows }); }
  catch (err) { next(err); }
}

async function listClasses(req, res, next) {
  try {
    const params = {};
    const where = ['c.is_active=TRUE'];
    if (req.query.departmentId) { where.push('c.department_id=:departmentId'); params.departmentId=Number(req.query.departmentId); }
    if (req.query.teacherOnly && req.user.role === 'admin') { /* retained for API compatibility */ }
    const [rows] = await pool.query(`SELECT c.id,c.name,c.year_of_study,c.section,d.id AS department_id,d.code AS department_code,d.name AS department_name,t.id AS teacher_id,t.full_name AS teacher_name FROM classes c JOIN departments d ON d.id=c.department_id LEFT JOIN class_teachers ct ON ct.class_id=c.id LEFT JOIN users t ON t.id=ct.teacher_id WHERE ${where.join(' AND ')} ORDER BY d.code,c.year_of_study,c.section`, params);
    res.json({ classes: rows });
  } catch (err) { next(err); }
}

async function createClass(req, res, next) {
  try {
    const { department_id, year_of_study, section } = req.body;
    if (!department_id || !year_of_study || !section) throw new ApiError(400,'Department, year and section are required.');
    const [dept] = await pool.query('SELECT code FROM departments WHERE id=:id AND is_active=TRUE',{id:department_id});
    if (!dept[0]) throw new ApiError(400,'Invalid department.');
    const name = `${dept[0].code} ${year_of_study}${Number(year_of_study)===1?'st':Number(year_of_study)===2?'nd':Number(year_of_study)===3?'rd':'th'} Year — Section ${String(section).trim().toUpperCase()}`;
    const [result] = await pool.query('INSERT INTO classes (department_id,year_of_study,section,name) VALUES (:departmentId,:year,:section,:name)',{departmentId:department_id,year:Number(year_of_study),section:String(section).trim().toUpperCase(),name});
    res.status(201).json({ classId: result.insertId, message:'Class created.' });
  } catch (err) { next(err); }
}

async function assignClassTeacher(req, res, next) {
  try {
    const { teacher_id } = req.body;
    if (!teacher_id) throw new ApiError(400,'Choose a teacher.');
    const [[teacher]] = await pool.query("SELECT id FROM users WHERE id=:id AND role='teacher' AND is_active=TRUE",{id:teacher_id});
    if (!teacher) throw new ApiError(400,'That account is not an active teacher.');
    await pool.query(`INSERT INTO class_teachers (class_id,teacher_id,assigned_by) VALUES (:classId,:teacherId,:adminId)
      ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id), assigned_by=VALUES(assigned_by)`,{classId:req.params.classId,teacherId:teacher_id,adminId:req.user.id});
    await logAction({actorId:req.user.id,action:'class.teacher_assigned',targetType:'class',targetId:req.params.classId,details:`Teacher ${teacher_id} assigned as class teacher`});
    res.json({message:'Class teacher assigned.'});
  } catch(err){next(err);}
}

async function listActiveTeachers(req,res,next){
  try { const [rows]=await pool.query("SELECT id,full_name,email,department FROM users WHERE role='teacher' AND is_active=TRUE ORDER BY full_name"); res.json({teachers:rows}); }
  catch(err){next(err);}
}

module.exports = {
  listUsers, updateUserRole, setUserActive, updateClubLeadership, overview,
  listAuditLog, listNotificationsSummary, listPendingRegistrations,
  reviewRegistration: reviewStudentRegistration, reviewStudentRegistration,
  listDepartments, listClasses, createClass, assignClassTeacher, listActiveTeachers,
};
