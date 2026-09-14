const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { shortestPath } = require('../services/routeGraph.service');

async function listLocations(req, res, next) {
  try {
    const { q } = req.query;
    let rows;
    if (q) {
      [rows] = await pool.query('SELECT * FROM locations WHERE name LIKE :q ORDER BY name', { q: `%${q}%` });
    } else {
      [rows] = await pool.query('SELECT * FROM locations ORDER BY name');
    }
    res.json({ locations: rows });
  } catch (err) { next(err); }
}

// Admin-only view of the raw path network, deduplicated so each physical
// path shows once instead of twice (the graph itself stays bidirectional).
async function listEdges(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.from_location_id, e.to_location_id, e.distance_meters, e.walk_seconds,
              a.name AS from_name, b.name AS to_name
       FROM location_edges e
       JOIN locations a ON a.id = e.from_location_id
       JOIN locations b ON b.id = e.to_location_id
       WHERE e.from_location_id < e.to_location_id
       ORDER BY a.name`
    );
    res.json({ edges: rows });
  } catch (err) { next(err); }
}

async function getRoute(req, res, next) {
  try {
    const from = Number(req.query.from);
    const to = Number(req.query.to);
    if (!from || !to) throw new ApiError(400, 'Both from and to location ids are required.');

    const route = await shortestPath(from, to);
    if (!route) throw new ApiError(404, "We couldn't find a walking route between those two points.");

    res.json({ route });
  } catch (err) { next(err); }
}

// Starts a navigation session so the backend can push automatic reroutes
// if an official venue change affects this destination while the student
// is walking there.
async function startNavigation(req, res, next) {
  try {
    const { from_location_id, to_location_id, linked_event_id } = req.body;
    if (!from_location_id || !to_location_id) throw new ApiError(400, 'A start and destination are required.');

    // Close out any previous active sessions for this user first
    await pool.query(`UPDATE navigation_sessions SET status = 'completed' WHERE user_id = :uid AND status = 'active'`, { uid: req.user.id });

    const [result] = await pool.query(
      `INSERT INTO navigation_sessions (user_id, from_location_id, to_location_id, linked_event_id)
       VALUES (:uid, :from, :to, :eventId)`,
      { uid: req.user.id, from: from_location_id, to: to_location_id, eventId: linked_event_id || null }
    );

    const route = await shortestPath(from_location_id, to_location_id);
    if (!route) throw new ApiError(404, "We couldn't find a walking route between those two points.");

    res.status(201).json({ sessionId: result.insertId, route });
  } catch (err) { next(err); }
}

async function endNavigation(req, res, next) {
  try {
    await pool.query(
      `UPDATE navigation_sessions SET status = 'completed' WHERE id = :id AND user_id = :uid`,
      { id: req.params.id, uid: req.user.id }
    );
    res.json({ message: 'Navigation ended.' });
  } catch (err) { next(err); }
}

// ---------- Admin: manage locations & the route graph ----------

async function createLocation(req, res, next) {
  try {
    const { name, category, lat, lng, description } = req.body;
    if (!name || !category || lat === undefined || lng === undefined) {
      throw new ApiError(400, 'Name, category, and coordinates are required.');
    }
    const [result] = await pool.query(
      'INSERT INTO locations (name, category, lat, lng, description) VALUES (:name, :category, :lat, :lng, :description)',
      { name, category, lat, lng, description: description || null }
    );
    res.status(201).json({ locationId: result.insertId });
  } catch (err) { next(err); }
}

async function createEdge(req, res, next) {
  try {
    const { from_location_id, to_location_id, distance_meters } = req.body;
    if (!from_location_id || !to_location_id || !distance_meters) {
      throw new ApiError(400, 'Both locations and a distance are required.');
    }
    const walkSeconds = Math.round(distance_meters / 1.2);
    await pool.query(
      `INSERT INTO location_edges (from_location_id, to_location_id, distance_meters, walk_seconds) VALUES (:a, :b, :d, :s)
       ON DUPLICATE KEY UPDATE distance_meters = :d, walk_seconds = :s`,
      { a: from_location_id, b: to_location_id, d: distance_meters, s: walkSeconds }
    );
    await pool.query(
      `INSERT INTO location_edges (from_location_id, to_location_id, distance_meters, walk_seconds) VALUES (:a, :b, :d, :s)
       ON DUPLICATE KEY UPDATE distance_meters = :d, walk_seconds = :s`,
      { a: to_location_id, b: from_location_id, d: distance_meters, s: walkSeconds }
    );
    res.status(201).json({ message: 'Path added.' });
  } catch (err) { next(err); }
}

module.exports = { listLocations, listEdges, getRoute, startNavigation, endNavigation, createLocation, createEdge };
