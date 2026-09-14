const pool = require('../config/db');

// Records a short, human-readable line for a sensitive action. Best-effort
// by design: a logging failure should never roll back or block the action
// it's describing — the caller awaits this after the real work succeeds.
async function logAction({ actorId, action, targetType = null, targetId = null, details = null }) {
  try {
    await pool.query(
      'INSERT INTO audit_log (actor_id, action, target_type, target_id, details) VALUES (:actorId, :action, :targetType, :targetId, :details)',
      { actorId: actorId || null, action, targetType, targetId, details }
    );
  } catch (err) {
    console.warn('[audit.service] failed to record audit entry:', err.message);
  }
}

module.exports = { logAction };
