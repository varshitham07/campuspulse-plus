const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

async function requireOwnClub(req, res, next) {
  try {
    if (req.user.role === 'admin') return next();
    const clubId = Number(req.params.clubId || req.params.id || req.body.club_id);
    if (!clubId) return next(new ApiError(400, 'A club is required for this action.'));
    const [rows] = await pool.query(`SELECT c.id FROM clubs c WHERE c.id = :clubId AND c.is_active = TRUE AND EXISTS (
      SELECT 1 FROM club_assignments ca WHERE ca.club_id = c.id AND ca.user_id = :uid AND ca.assignment_role IN ('president','vice_president','faculty_coordinator','member_manager')
    )`, { clubId, uid: req.user.id });
    if (!rows.length) return next(new ApiError(403, 'You can only manage your own club.'));
    next();
  } catch (err) { next(err); }
}

function requireClubLeaderOr(...identityRoles) {
  return async (req, res, next) => {
    try {
      if (identityRoles.includes(req.user.role)) return next();
      const [rows] = await pool.query(`SELECT id FROM club_assignments WHERE user_id = :uid AND assignment_role IN ('president','vice_president','faculty_coordinator','member_manager') LIMIT 1`, { uid: req.user.id });
      if (!rows.length) return next(new ApiError(403, 'You do not have permission to do that.'));
      next();
    } catch (err) { next(err); }
  };
}


module.exports = { requireOwnClub, requireClubLeaderOr };
