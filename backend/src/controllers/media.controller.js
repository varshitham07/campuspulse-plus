const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { UPLOAD_DIR } = require('../middleware/upload');

async function assertOwnsClub(userId, role, clubId) {
  if (role === 'admin') return;
  const [rows] = await pool.query(
    'SELECT id FROM clubs WHERE id = :clubId AND (president_id = :userId OR vp_id = :userId)',
    { clubId, userId }
  );
  if (rows.length === 0) throw new ApiError(403, 'You can only manage your own club.');
}

async function listMediaForClub(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT m.id, m.file_path, m.caption, m.created_at, u.full_name AS uploaded_by_name
       FROM club_media m JOIN users u ON u.id = m.uploaded_by
       WHERE m.club_id = :clubId ORDER BY m.created_at DESC`,
      { clubId: req.params.clubId }
    );
    res.json({ media: rows.map((r) => ({ ...r, url: `/uploads/${r.file_path}` })) });
  } catch (err) { next(err); }
}

async function uploadMedia(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'No file was uploaded.');
    const { club_id, caption } = req.body;
    if (!club_id) throw new ApiError(400, 'A club is required.');

    await assertOwnsClub(req.user.id, req.user.role, club_id);

    const relativePath = `club-media/${req.file.filename}`;
    const [result] = await pool.query(
      'INSERT INTO club_media (club_id, uploaded_by, file_path, original_name, caption) VALUES (:clubId, :uid, :filePath, :originalName, :caption)',
      { clubId: club_id, uid: req.user.id, filePath: relativePath, originalName: req.file.originalname, caption: caption || null }
    );

    res.status(201).json({ message: 'Uploaded.', mediaId: result.insertId, url: `/uploads/${relativePath}` });
  } catch (err) { next(err); }
}

async function deleteMedia(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM club_media WHERE id = :id', { id: req.params.id });
    if (!rows[0]) throw new ApiError(404, 'File not found.');
    await assertOwnsClub(req.user.id, req.user.role, rows[0].club_id);

    await pool.query('DELETE FROM club_media WHERE id = :id', { id: req.params.id });

    // Best-effort disk cleanup — a failure here shouldn't block the delete
    // the user asked for, since the database record (the source of truth
    // for what's shown) is already gone.
    const fullPath = path.join(UPLOAD_DIR, path.basename(rows[0].file_path));
    fs.unlink(fullPath, () => {});

    res.json({ message: 'Removed.' });
  } catch (err) { next(err); }
}

module.exports = { listMediaForClub, uploadMedia, deleteMedia };
