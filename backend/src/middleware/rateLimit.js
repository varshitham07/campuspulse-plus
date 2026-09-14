const rateLimit = require('express-rate-limit');

// General API traffic — generous, just there to blunt abuse/scraping.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

// Auth endpoints get a much tighter limit — this is what actually matters:
// slows down credential-stuffing / brute-force login attempts without
// meaningfully affecting a real user who mistypes a password a couple times.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes before trying again.' },
});

module.exports = { apiLimiter, authLimiter };
