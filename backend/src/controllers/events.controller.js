const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { notify } = require('../services/notification.service');
const { parsePagination } = require('../utils/pagination');

async function listEvents(req, res, next) {
  try {
    const { category, clubId, upcoming } = req.query;
    const conditions = [];
    const params = {};

    if (category && category !== 'all') { conditions.push('e.category = :category'); params.category = category; }
    if (clubId) { conditions.push('e.club_id = :clubId'); params.clubId = clubId; }
    if (upcoming !== 'false') { conditions.push("e.starts_at >= NOW() AND e.status != 'cancelled'"); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { page, pageSize, offset } = parsePagination(req.query);

    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.category, e.description, e.starts_at, e.ends_at, e.capacity, e.status,
              c.id AS club_id, c.name AS club_name,
              l.name AS location_name, e.custom_location,
              (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered_count
       FROM events e
       JOIN clubs c ON c.id = e.club_id
       LEFT JOIN locations l ON l.id = e.location_id
       ${where}
       ORDER BY e.starts_at ASC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM events e ${where}`, params);
    res.json({ events: rows, page, pageSize, total, hasMore: offset + rows.length < total });
  } catch (err) { next(err); }
}

async function getEvent(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, c.name AS club_name, l.name AS location_name, l.id AS location_id
       FROM events e JOIN clubs c ON c.id = e.club_id
       LEFT JOIN locations l ON l.id = e.location_id
       WHERE e.id = :id`,
      { id: req.params.id }
    );
    if (!rows[0]) throw new ApiError(404, 'Event not found.');

    let myRegistration = null;
    if (req.user) {
      const [reg] = await pool.query(
        'SELECT status FROM event_registrations WHERE event_id = :id AND user_id = :uid',
        { id: req.params.id, uid: req.user.id }
      );
      myRegistration = reg[0]?.status || null;
    }

    res.json({ event: rows[0], myRegistration });
  } catch (err) { next(err); }
}

async function createEvent(req, res, next) {
  try {
    const { club_id, title, category, description, location_id, custom_location, starts_at, ends_at, capacity } = req.body;
    if (!club_id || !title || !category || !description || !starts_at) {
      throw new ApiError(400, 'Title, category, description, club and start time are required.');
    }

    const [result] = await pool.query(
      `INSERT INTO events (club_id, created_by, title, category, description, location_id, custom_location, starts_at, ends_at, capacity)
       VALUES (:club_id, :created_by, :title, :category, :description, :location_id, :custom_location, :starts_at, :ends_at, :capacity)`,
      {
        club_id, created_by: req.user.id, title, category, description,
        location_id: location_id || null, custom_location: custom_location || null,
        starts_at, ends_at: ends_at || null, capacity: capacity || null,
      }
    );

    await notify({
      target: { scope: 'club', clubId: club_id },
      type: 'event_new',
      title: `New event: ${title}`,
      body: description.slice(0, 140),
      referenceType: 'event',
      referenceId: result.insertId,
    }).catch(() => {});

    res.status(201).json({ message: 'Event created.', eventId: result.insertId });
  } catch (err) { next(err); }
}

async function updateEvent(req, res, next) {
  try {
    const eventId = req.params.id;
    const [existing] = await pool.query('SELECT * FROM events WHERE id = :id', { id: eventId });
    if (!existing[0]) throw new ApiError(404, 'Event not found.');

    // Club leadership may only edit events that belong to the club they
    // actually lead — the route-level role check alone isn't enough here,
    // since :id is an event id, not a club id.
    if (req.user.role !== 'admin') {
      const [ownership] = await pool.query(
        'SELECT id FROM clubs WHERE id = :clubId AND (president_id = :uid OR vp_id = :uid)',
        { clubId: existing[0].club_id, uid: req.user.id }
      );
      if (ownership.length === 0) throw new ApiError(403, 'You can only manage events for your own club.');
    }

    const fields = ['title', 'category', 'description', 'location_id', 'custom_location', 'starts_at', 'ends_at', 'capacity', 'status'];
    const updates = [];
    const params = { id: eventId };
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = :${f}`);
        params[f] = req.body[f];
      }
    }
    if (updates.length === 0) throw new ApiError(400, 'No changes provided.');

    await pool.query(`UPDATE events SET ${updates.join(', ')} WHERE id = :id`, params);

    const changedStatus = req.body.status && req.body.status !== existing[0].status;
    const changedLocation = req.body.location_id && Number(req.body.location_id) !== existing[0].location_id;

    if (changedStatus || changedLocation) {
      let newLocationName = null;
      if (changedLocation) {
        const [[loc]] = await pool.query('SELECT name FROM locations WHERE id = :id', { id: req.body.location_id });
        newLocationName = loc?.name || null;
      }

      const parts = [];
      if (changedStatus) parts.push(`This event is now ${req.body.status}.`);
      if (changedLocation) parts.push(newLocationName ? `New venue: ${newLocationName}.` : 'The venue has changed.');

      await notify({
        target: { scope: 'event', eventId },
        type: 'event_update',
        title: `Update: ${existing[0].title}`,
        body: parts.join(' '),
        urgency: 'important',
        referenceType: 'event',
        referenceId: eventId,
        actionLocationId: changedLocation ? req.body.location_id : null,
        actionLabel: changedLocation && newLocationName ? `Get directions to ${newLocationName}` : null,
      }).catch(() => {});
    }

    res.json({ message: 'Event updated.' });
  } catch (err) { next(err); }
}

async function registerForEvent(req, res, next) {
  try {
    const eventId = req.params.id;
    const [rows] = await pool.query('SELECT * FROM events WHERE id = :id', { id: eventId });
    const event = rows[0];
    if (!event) throw new ApiError(404, 'Event not found.');
    if (event.status !== 'scheduled') throw new ApiError(409, 'This event is not open for registration.');

    let status = 'registered';
    if (event.capacity) {
      const [[{ count }]] = await pool.query(
        `SELECT COUNT(*) AS count FROM event_registrations WHERE event_id = :id AND status = 'registered'`,
        { id: eventId }
      );
      if (count >= event.capacity) status = 'waitlisted';
    }

    await pool.query(
      `INSERT INTO event_registrations (event_id, user_id, status) VALUES (:eventId, :userId, :status)
       ON DUPLICATE KEY UPDATE status = :status`,
      { eventId, userId: req.user.id, status }
    );

    res.status(201).json({ message: status === 'registered' ? 'You are registered.' : 'Event is full — you have been waitlisted.', status });
  } catch (err) { next(err); }
}

async function cancelRegistration(req, res, next) {
  try {
    await pool.query(
      `UPDATE event_registrations SET status = 'cancelled' WHERE event_id = :id AND user_id = :uid`,
      { id: req.params.id, uid: req.user.id }
    );
    res.json({ message: 'Registration cancelled.' });
  } catch (err) { next(err); }
}

async function listRegistrations(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      const [event] = await pool.query('SELECT club_id FROM events WHERE id = :id', { id: req.params.id });
      if (!event[0]) throw new ApiError(404, 'Event not found.');
      const [ownership] = await pool.query(
        'SELECT id FROM clubs WHERE id = :clubId AND (president_id = :uid OR vp_id = :uid)',
        { clubId: event[0].club_id, uid: req.user.id }
      );
      if (ownership.length === 0) throw new ApiError(403, 'You can only view registrations for your own club.');
    }

    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.registered_at, u.full_name, u.email, u.department, u.year_of_study
       FROM event_registrations r JOIN users u ON u.id = r.user_id
       WHERE r.event_id = :id ORDER BY r.registered_at`,
      { id: req.params.id }
    );
    res.json({ registrations: rows });
  } catch (err) { next(err); }
}

module.exports = {
  listEvents, getEvent, createEvent, updateEvent,
  registerForEvent, cancelRegistration, listRegistrations,
};
