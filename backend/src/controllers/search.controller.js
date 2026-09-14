const pool = require('../config/db');

// A lightweight federated search across the four content types students
// actually look for. Kept as simple LIKE queries — fine at campus scale,
// and easy to later swap for full-text indexes without changing the API shape.
async function search(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ announcements: [], events: [], clubs: [], locations: [] });

    const like = `%${q}%`;

    const [announcements] = await pool.query(
      'SELECT id, title, category FROM announcements WHERE title LIKE :q OR body LIKE :q ORDER BY created_at DESC LIMIT 5',
      { q: like }
    );
    const [events] = await pool.query(
      `SELECT id, title, category, starts_at FROM events WHERE (title LIKE :q OR description LIKE :q) AND status != 'cancelled' ORDER BY starts_at LIMIT 5`,
      { q: like }
    );
    const [clubs] = await pool.query(
      'SELECT id, name, category FROM clubs WHERE (name LIKE :q OR description LIKE :q) AND is_active = TRUE LIMIT 5',
      { q: like }
    );
    const [locations] = await pool.query(
      'SELECT id, name, category FROM locations WHERE name LIKE :q LIMIT 5',
      { q: like }
    );

    res.json({ announcements, events, clubs, locations });
  } catch (err) { next(err); }
}

module.exports = { search };
