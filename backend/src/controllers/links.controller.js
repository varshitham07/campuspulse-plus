const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

async function assertOwnsClub(userId, role, clubId) {
  if (role === 'admin') return;
  const [rows] = await pool.query(
    'SELECT id FROM clubs WHERE id = :clubId AND (president_id = :userId OR vp_id = :userId)',
    { clubId, userId }
  );
  if (rows.length === 0) throw new ApiError(403, 'You can only manage your own club.');
}

async function listLinksForClub(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, label, url FROM club_links WHERE club_id = :clubId ORDER BY position, id',
      { clubId: req.params.clubId }
    );
    res.json({ links: rows });
  } catch (err) { next(err); }
}

async function addLink(req, res, next) {
  try {
    const { club_id, label, url } = req.body;
    if (!club_id || !label || !url) throw new ApiError(400, 'A club, label, and URL are required.');
    if (!/^https?:\/\//i.test(url)) throw new ApiError(400, 'The URL must start with http:// or https://');

    await assertOwnsClub(req.user.id, req.user.role, club_id);

    const [[{ maxPos }]] = await pool.query('SELECT COALESCE(MAX(position), -1) AS maxPos FROM club_links WHERE club_id = :clubId', { clubId: club_id });
    const [result] = await pool.query(
      'INSERT INTO club_links (club_id, label, url, position) VALUES (:club_id, :label, :url, :position)',
      { club_id, label, url, position: maxPos + 1 }
    );
    res.status(201).json({ message: 'Link added.', linkId: result.insertId });
  } catch (err) { next(err); }
}

async function deleteLink(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT club_id FROM club_links WHERE id = :id', { id: req.params.id });
    if (!rows[0]) throw new ApiError(404, 'Link not found.');
    await assertOwnsClub(req.user.id, req.user.role, rows[0].club_id);

    await pool.query('DELETE FROM club_links WHERE id = :id', { id: req.params.id });
    res.json({ message: 'Link removed.' });
  } catch (err) { next(err); }
}

module.exports = { listLinksForClub, addLink, deleteLink };
