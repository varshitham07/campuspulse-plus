const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getIo } = require('../services/socket.service');

async function listTopics(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM topics ORDER BY type, name');
    res.json({ topics: rows });
  } catch (err) { next(err); }
}

async function mySubscriptions(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT t.* FROM user_topic_subscriptions s JOIN topics t ON t.id = s.topic_id
       WHERE s.user_id = :uid ORDER BY t.type, t.name`,
      { uid: req.user.id }
    );
    res.json({ topics: rows });
  } catch (err) { next(err); }
}

async function subscribe(req, res, next) {
  try {
    await pool.query(
      'INSERT IGNORE INTO user_topic_subscriptions (user_id, topic_id) VALUES (:uid, :topicId)',
      { uid: req.user.id, topicId: req.params.id }
    );
    // Take effect immediately for any already-open connection, rather than
    // waiting for the next socket reconnect to pick up the new subscription.
    try { getIo().in(`user:${req.user.id}`).socketsJoin(`topic:${req.params.id}`); } catch (_) {}
    res.status(201).json({ message: 'Subscribed.' });
  } catch (err) { next(err); }
}

async function unsubscribe(req, res, next) {
  try {
    await pool.query(
      'DELETE FROM user_topic_subscriptions WHERE user_id = :uid AND topic_id = :topicId',
      { uid: req.user.id, topicId: req.params.id }
    );
    try { getIo().in(`user:${req.user.id}`).socketsLeave(`topic:${req.params.id}`); } catch (_) {}
    res.json({ message: 'Unsubscribed.' });
  } catch (err) { next(err); }
}

// Admin: extend the topic catalog (e.g. a new department or interest tag)
// without needing a deploy.
async function createTopic(req, res, next) {
  try {
    const { name, type } = req.body;
    const validTypes = ['year', 'department', 'interest', 'role'];
    if (!name || !validTypes.includes(type)) throw new ApiError(400, 'A name and valid type are required.');

    const [result] = await pool.query('INSERT INTO topics (name, type) VALUES (:name, :type)', { name, type });
    res.status(201).json({ topicId: result.insertId });
  } catch (err) { next(err); }
}

module.exports = { listTopics, mySubscriptions, subscribe, unsubscribe, createTopic };
