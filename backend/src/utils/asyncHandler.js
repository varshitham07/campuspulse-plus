// Wraps async route handlers so thrown errors reach the centralized error handler
// instead of crashing the process or being silently swallowed.
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
