const ApiError = require('../utils/ApiError');
const pool = require('../config/db');

/**
 * RBAC Middleware for CampusPulse+
 * 
 * Roles are: admin, teacher, student
 * Permissions are: additive (a student can also be president)
 * Club leadership is scoped per club
 */

// Check if user is admin
function isAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(403, 'Only administrators can do that.'));
  }
  next();
}

// Check if user is teacher
function isTeacher(req, res, next) {
  if (req.user?.role !== 'teacher') {
    return next(new ApiError(403, 'Only faculty can do that.'));
  }
  next();
}

// Check if user is student
function isStudent(req, res, next) {
  if (req.user?.role !== 'student') {
    return next(new ApiError(403, 'Only students can do that.'));
  }
  next();
}

// Check if user is admin OR has a specific club leadership role
async function isClubLeader(req, res, next) {
  try {
    const clubId = req.params.clubId ? Number(req.params.clubId) : req.body?.club_id;
    if (!clubId) {
      return next(new ApiError(400, 'Club ID is required.'));
    }

    if (req.user?.role === 'admin') {
      return next();
    }

    const [rows] = await pool.query(
      `SELECT ca.id FROM club_assignments ca
       WHERE ca.club_id = :clubId AND ca.user_id = :userId
       AND ca.assignment_role IN ('president', 'vice_president')`,
      { clubId, userId: req.user.id }
    );

    if (!rows.length) {
      return next(new ApiError(403, 'You must be a club leader to do that.'));
    }

    req.clubId = clubId;
    next();
  } catch (err) {
    next(err);
  }
}

// Check if user is club president or admin
async function isClubPresident(req, res, next) {
  try {
    const clubId = req.params.clubId ? Number(req.params.clubId) : req.body?.club_id;
    if (!clubId) {
      return next(new ApiError(400, 'Club ID is required.'));
    }

    if (req.user?.role === 'admin') {
      return next();
    }

    const [rows] = await pool.query(
      `SELECT ca.id FROM club_assignments ca
       WHERE ca.club_id = :clubId AND ca.user_id = :userId
       AND ca.assignment_role = 'president'`,
      { clubId, userId: req.user.id }
    );

    if (!rows.length) {
      return next(new ApiError(403, 'Only the club president can do that.'));
    }

    req.clubId = clubId;
    next();
  } catch (err) {
    next(err);
  }
}

// Check if user is faculty coordinator for a club or admin
async function isFacultyCoordinator(req, res, next) {
  try {
    const clubId = req.params.clubId ? Number(req.params.clubId) : req.body?.club_id;
    if (!clubId) {
      return next(new ApiError(400, 'Club ID is required.'));
    }

    if (req.user?.role === 'admin') {
      return next();
    }

    const [rows] = await pool.query(
      `SELECT ca.id FROM club_assignments ca
       WHERE ca.club_id = :clubId AND ca.user_id = :userId
       AND ca.assignment_role = 'faculty_coordinator'`,
      { clubId, userId: req.user.id }
    );

    if (!rows.length) {
      return next(new ApiError(403, 'Only the faculty coordinator can do that.'));
    }

    req.clubId = clubId;
    next();
  } catch (err) {
    next(err);
  }
}

// Check if user is assigned to teach a specific class (or admin)
async function canManageClass(req, res, next) {
  try {
    const classId = req.params.classId ? Number(req.params.classId) : req.body?.class_id;
    if (!classId) {
      return next(new ApiError(400, 'Class ID is required.'));
    }

    if (req.user?.role === 'admin') {
      return next();
    }

    if (req.user?.role !== 'teacher') {
      return next(new ApiError(403, 'Only faculty can manage classes.'));
    }

    const [rows] = await pool.query(
      `SELECT ct.id FROM class_teachers ct
       WHERE ct.class_id = :classId AND ct.teacher_id = :userId`,
      { classId, userId: req.user.id }
    );

    if (!rows.length) {
      return next(new ApiError(403, 'You are not assigned to this class.'));
    }

    req.classId = classId;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  isAdmin,
  isTeacher,
  isStudent,
  isClubLeader,
  isClubPresident,
  isFacultyCoordinator,
  canManageClass
};