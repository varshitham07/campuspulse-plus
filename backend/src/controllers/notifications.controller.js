const pool = require('../config/db');

async function listNotifications(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT n.*, l.name AS action_location_name
       FROM notifications n
       LEFT JOIN locations l ON l.id = n.action_location_id
       WHERE n.user_id = :uid ORDER BY n.created_at DESC LIMIT 50`,
      { uid: req.user.id }
    );
    const [[{ unread }]] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = :uid AND is_read = FALSE',
      { uid: req.user.id }
    );
    res.json({ notifications: rows, unreadCount: unread });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = :id AND user_id = :uid', { id: req.params.id, uid: req.user.id });
    res.json({ message: 'Marked as read.' });
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = :uid AND is_read = FALSE', { uid: req.user.id });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
}

module.exports = { listNotifications, markRead, markAllRead };
