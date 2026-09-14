const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

let io = null;

// Each connected socket joins a room named `user:<id>` so we can push a
// notification to one specific person, plus role/department/year/topic
// rooms so broadcast-style alerts reach the right audience without the
// server tracking socket ids manually.
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { id, role, department, year_of_study } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    if (department) socket.join(`dept:${department}`);
    if (year_of_study) socket.join(`year:${year_of_study}`);
    socket.join('campus');

    try {
      const [classRows] = await pool.query('SELECT id FROM classes WHERE name = (SELECT class_section FROM users WHERE id = :id)', { id });
      classRows.forEach((c) => socket.join(`class:${c.id}`));
      const [clubRows] = await pool.query('SELECT club_id FROM club_assignments WHERE user_id = :id', { id });
      clubRows.forEach((c) => socket.join(`club:${c.club_id}`));
    } catch (err) {
      console.warn('[socket.service] could not load scoped rooms:', err.message);
    }

    try {
      const [subs] = await pool.query('SELECT topic_id FROM user_topic_subscriptions WHERE user_id = :id', { id });
      subs.forEach((s) => socket.join(`topic:${s.topic_id}`));
    } catch (err) {
      // Realtime topic delivery is a nice-to-have — a lookup failure here
      // should never take down the socket connection itself.
      console.warn('[socket.service] could not load topic subscriptions for realtime rooms:', err.message);
    }

    socket.on('join:club', (clubId) => socket.join(`club:${clubId}`));
    socket.on('join:event', (eventId) => socket.join(`event:${eventId}`));
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.IO not initialized yet');
  return io;
}

// Emits a notification event to a room. `room` is one of:
// 'campus' | 'dept:<name>' | 'year:<n>' | 'club:<id>' | 'event:<id>' | 'user:<id>'
function emitToRoom(room, event, payload) {
  if (!io) return;
  io.to(room).emit(event, payload);
}

module.exports = { initSocket, getIo, emitToRoom };
