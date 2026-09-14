const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { notify, notifyUser } = require('../services/notification.service');
const { findPossibleDuplicates } = require('../services/ai.service');
const { shortestPath } = require('../services/routeGraph.service');
const { emitToRoom } = require('../services/socket.service');
const { logAction } = require('../services/audit.service');
const { parsePagination } = require('../utils/pagination');

// A report needs both a minimum number of votes AND a strong enough ratio
// before the community can mark it "community_verified". This keeps a
// single vote (or a couple of friends confirming a joke) from flipping status.
const MIN_CONFIRMATIONS_FOR_COMMUNITY_VERIFY = 5;
const COMMUNITY_VERIFY_THRESHOLD = 70; // percent

function computeConfidence(confirmCount, rejectCount) {
  const total = confirmCount + rejectCount;
  if (total === 0) return 0;
  return Math.round((confirmCount / total) * 1000) / 10; // one decimal place
}

async function listIncidents(req, res, next) {
  try {
    const { status } = req.query;
    const params = {};
    let where = '';
    if (status) { where = 'WHERE i.status = :status'; params.status = status; }
    const { page, pageSize, offset } = parsePagination(req.query);

    const [rows] = await pool.query(
      `SELECT i.id, i.title, i.description, i.category, i.status, i.confidence_score, i.created_at,
              u.full_name AS reported_by_name,
              ol.name AS old_location_name, nl.name AS new_location_name,
              (SELECT COUNT(*) FROM incident_confirmations c WHERE c.incident_id = i.id AND c.vote = 'confirm') AS confirm_count,
              (SELECT COUNT(*) FROM incident_confirmations c WHERE c.incident_id = i.id AND c.vote = 'reject') AS reject_count
       FROM incidents i
       JOIN users u ON u.id = i.reported_by
       LEFT JOIN locations ol ON ol.id = i.old_location_id
       LEFT JOIN locations nl ON nl.id = i.new_location_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM incidents i ${where}`, params);
    res.json({ incidents: rows, page, pageSize, total, hasMore: offset + rows.length < total });
  } catch (err) { next(err); }
}

async function getIncident(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, u.full_name AS reported_by_name,
              ol.name AS old_location_name, nl.name AS new_location_name
       FROM incidents i JOIN users u ON u.id = i.reported_by
       LEFT JOIN locations ol ON ol.id = i.old_location_id
       LEFT JOIN locations nl ON nl.id = i.new_location_id
       WHERE i.id = :id`,
      { id: req.params.id }
    );
    if (!rows[0]) throw new ApiError(404, 'Report not found.');

    let myVote = null;
    if (req.user) {
      const [v] = await pool.query('SELECT vote FROM incident_confirmations WHERE incident_id = :id AND user_id = :uid', { id: req.params.id, uid: req.user.id });
      myVote = v[0]?.vote || null;
    }

    res.json({ incident: rows[0], myVote });
  } catch (err) { next(err); }
}

async function reportIncident(req, res, next) {
  try {
    const { title, description, category, affects_event_id, old_location_id, new_location_id } = req.body;
    if (!title || !description) throw new ApiError(400, 'A title and description are required.');

    const [result] = await pool.query(
      `INSERT INTO incidents (reported_by, title, description, category, affects_event_id, old_location_id, new_location_id)
       VALUES (:reportedBy, :title, :description, :category, :eventId, :oldLoc, :newLoc)`,
      {
        reportedBy: req.user.id, title, description,
        category: category || 'venue_change',
        eventId: affects_event_id || null,
        oldLoc: old_location_id || null,
        newLoc: new_location_id || null,
      }
    );

    const duplicates = await findPossibleDuplicates(result.insertId, `${title} ${description}`, pool).catch(() => []);

    res.status(201).json({
      message: 'Report submitted. Other students can now confirm it.',
      incidentId: result.insertId,
      possibleDuplicates: duplicates,
    });
  } catch (err) { next(err); }
}

async function voteOnIncident(req, res, next) {
  try {
    const { vote } = req.body; // 'confirm' | 'reject'
    if (!['confirm', 'reject'].includes(vote)) throw new ApiError(400, 'Vote must be confirm or reject.');

    const incidentId = req.params.id;
    const [existing] = await pool.query('SELECT * FROM incidents WHERE id = :id', { id: incidentId });
    if (!existing[0]) throw new ApiError(404, 'Report not found.');
    if (existing[0].reported_by === req.user.id) throw new ApiError(400, "You can't confirm your own report.");
    if (existing[0].status === 'officially_verified' || existing[0].status === 'rejected') {
      throw new ApiError(409, 'This report is already resolved.');
    }

    await pool.query(
      `INSERT INTO incident_confirmations (incident_id, user_id, vote) VALUES (:incidentId, :userId, :vote)
       ON DUPLICATE KEY UPDATE vote = :vote`,
      { incidentId, userId: req.user.id, vote }
    );

    const [[counts]] = await pool.query(
      `SELECT
        SUM(vote = 'confirm') AS confirm_count,
        SUM(vote = 'reject') AS reject_count
       FROM incident_confirmations WHERE incident_id = :id`,
      { id: incidentId }
    );

    const confirmCount = Number(counts.confirm_count) || 0;
    const rejectCount = Number(counts.reject_count) || 0;
    const confidence = computeConfidence(confirmCount, rejectCount);

    let status = existing[0].status;
    if (
      status === 'unverified' &&
      confirmCount >= MIN_CONFIRMATIONS_FOR_COMMUNITY_VERIFY &&
      confidence >= COMMUNITY_VERIFY_THRESHOLD
    ) {
      status = 'community_verified';
    }

    await pool.query('UPDATE incidents SET confidence_score = :confidence, status = :status WHERE id = :id', { confidence, status, id: incidentId });

    emitToRoom('campus', 'incident:updated', { incidentId: Number(incidentId), confidence, status, confirmCount, rejectCount });

    res.json({ confidence, status, confirmCount, rejectCount });
  } catch (err) { next(err); }
}

// Official verification by a teacher/admin. This is the only path that can
// set status = officially_verified, and — if the report describes a venue
// change tied to an event — the only path that triggers automatic rerouting
// for students currently navigating there.
async function officiallyVerify(req, res, next) {
  try {
    const { decision } = req.body; // 'verify' | 'reject'
    const incidentId = req.params.id;

    const [rows] = await pool.query('SELECT * FROM incidents WHERE id = :id', { id: incidentId });
    const incident = rows[0];
    if (!incident) throw new ApiError(404, 'Report not found.');

    if (decision === 'reject') {
      await pool.query('UPDATE incidents SET status = "rejected", verified_by = :vid, verified_at = NOW() WHERE id = :id', { vid: req.user.id, id: incidentId });
      await logAction({ actorId: req.user.id, action: 'incident.rejected', targetType: 'incident', targetId: incidentId, details: incident.title });
      return res.json({ status: 'rejected' });
    }

    await pool.query(
      'UPDATE incidents SET status = "officially_verified", verified_by = :vid, verified_at = NOW() WHERE id = :id',
      { vid: req.user.id, id: incidentId }
    );
    await logAction({ actorId: req.user.id, action: 'incident.officially_verified', targetType: 'incident', targetId: incidentId, details: incident.title });

    emitToRoom('campus', 'incident:updated', { incidentId: Number(incidentId), status: 'officially_verified' });

    // If this report describes a venue change, give the "go here instead"
    // action directly on the notification — not just to people who happen
    // to already be mid-navigation (handled separately below).
    let newLocationName = null;
    if (incident.new_location_id) {
      const [[nl]] = await pool.query('SELECT name FROM locations WHERE id = :id', { id: incident.new_location_id });
      newLocationName = nl?.name || null;
    }
    const actionFields = incident.new_location_id
      ? { actionLocationId: incident.new_location_id, actionLabel: newLocationName ? `Get directions to ${newLocationName}` : 'Get directions' }
      : {};

    // Notify everyone relevant
    if (incident.affects_event_id) {
      await notify({
        target: { scope: 'event', eventId: incident.affects_event_id },
        type: 'incident_update',
        title: 'Officially verified: ' + incident.title,
        body: incident.description,
        urgency: 'important',
        referenceType: 'incident',
        referenceId: incidentId,
        ...actionFields,
      });
    } else {
      await notify({
        target: { scope: 'campus' },
        type: 'incident_update',
        title: 'Officially verified: ' + incident.title,
        body: incident.description,
        urgency: 'important',
        referenceType: 'incident',
        referenceId: incidentId,
        ...actionFields,
      });
    }

    // ---- Dynamic reroute: the signature feature ----
    let reroutedSessions = 0;
    if (incident.old_location_id && incident.new_location_id) {
      // Update the event's own location record if this incident is linked to one
      if (incident.affects_event_id) {
        await pool.query('UPDATE events SET location_id = :newLoc WHERE id = :eventId', {
          newLoc: incident.new_location_id,
          eventId: incident.affects_event_id,
        });
      }

      // Find every active navigation session currently heading to the old location
      // (either because it's linked to the affected event, or the destination matches directly)
      const [sessions] = await pool.query(
        `SELECT * FROM navigation_sessions
         WHERE status = 'active'
         AND (to_location_id = :oldLoc OR linked_event_id = :eventId)`,
        { oldLoc: incident.old_location_id, eventId: incident.affects_event_id || 0 }
      );

      for (const session of sessions) {
        const route = await shortestPath(session.from_location_id, incident.new_location_id);
        await pool.query('UPDATE navigation_sessions SET to_location_id = :newLoc WHERE id = :id', {
          newLoc: incident.new_location_id,
          id: session.id,
        });

        const [[oldLocRow]] = await pool.query('SELECT name FROM locations WHERE id = :id', { id: incident.old_location_id });
        const [[newLocRow]] = await pool.query('SELECT name FROM locations WHERE id = :id', { id: incident.new_location_id });

        await notifyUser(session.user_id, {
          type: 'route_update',
          title: 'Destination changed',
          body: `${oldLocRow.name} → ${newLocRow.name}. Your route has been updated automatically.`,
          urgency: 'important',
          referenceType: 'incident',
          referenceId: incidentId,
          actionLocationId: incident.new_location_id,
          actionLabel: `Continue to ${newLocRow.name}`,
        });

        emitToRoom(`user:${session.user_id}`, 'route:updated', {
          sessionId: session.id,
          reason: incident.title,
          from: oldLocRow.name,
          to: newLocRow.name,
          route,
        });

        reroutedSessions++;
      }
    }

    res.json({ status: 'officially_verified', reroutedSessions });
  } catch (err) { next(err); }
}

module.exports = { listIncidents, getIncident, reportIncident, voteOnIncident, officiallyVerify };
