const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

// Verifies the JWT and attaches { id, role, email } to req.user.
// This is the only source of truth for identity on the backend —
// the frontend's idea of "who you are" is never trusted.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'You need to be signed in to do that.'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    return next(new ApiError(401, 'Your session has expired. Please sign in again.'));
  }
}

// Allows the request only if req.user.role is one of `roles`.
// Used on top of requireAuth. This is enforced on every protected route —
// hiding a button in React is never treated as access control.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to do that.'));
    }
    next();
  };
}

// Populates req.user when a valid token is present, but never blocks the
// request if it's missing or invalid. Used on public endpoints that still
// want to personalize the response (e.g. "did I already vote on this?").
function attachUserIfPresent(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
  } catch (err) {
    // invalid/expired token on a public route — just proceed unauthenticated
  }
  next();
}

module.exports = { requireAuth, requireRole, attachUserIfPresent };
