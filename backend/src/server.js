require('dotenv').config();
const express = require('express');

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = 'CampusPulse_Local_Dev_JWT_2026_Change_For_Production_8xK7mP2qL9';
  console.warn('JWT_SECRET was not found; using the development fallback. Set JWT_SECRET in backend/.env for production.');
}
const cors = require('cors');
const http = require('http');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const { initSocket } = require('./services/socket.service');

const authRoutes = require('./routes/auth.routes');
const clubsRoutes = require('./routes/clubs.routes');
const eventsRoutes = require('./routes/events.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const incidentsRoutes = require('./routes/incidents.routes');
const navigationRoutes = require('./routes/navigation.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const searchRoutes = require('./routes/search.routes');
const adminRoutes = require('./routes/admin.routes');
const topicsRoutes = require('./routes/topics.routes');
const formsRoutes = require('./routes/forms.routes');
const mediaRoutes = require('./routes/media.routes');
const linksRoutes = require('./routes/links.routes');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Uploaded club media is served as plain static files. Filenames are
// server-generated (never the client's original filename) — see
// media.controller.js — so this is safe to expose directly.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Rate limiting: a tight limit on auth (brute-force protection), a looser
// one on everything else under /api (general abuse protection).
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/links', linksRoutes);

app.use((req, res) => res.status(404).json({ error: 'That endpoint does not exist.' }));
app.use(errorHandler);

initSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  console.log(`CampusPulse+ API listening on :${PORT}`);
  if (process.env.NODE_ENV !== 'production' && String(process.env.BOOTSTRAP_LOCAL_ADMIN || 'true').toLowerCase() === 'true') {
    try {
      const bcrypt = require('bcrypt');
      const pool = require('./config/db');
      const email = String(process.env.DEV_ADMIN_EMAIL || 'admin@campuspulse.dev').trim().toLowerCase();
      const password = String(process.env.DEV_ADMIN_PASSWORD || 'Password123!');
      const hash = await bcrypt.hash(password, 12);
      await pool.query(`INSERT INTO users (full_name,email,password_hash,role,department,approval_status,is_active,approved_at)
        VALUES ('CampusPulse Administrator',:email,:hash,'admin','Administration','approved',TRUE,NOW())
        ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='admin', approval_status='approved', is_active=TRUE`, { email, hash });
      console.log(`Development admin available at ${email}`);
    } catch (err) {
      console.warn(`Development admin bootstrap skipped: ${err.message}`);
    }
  }
});
