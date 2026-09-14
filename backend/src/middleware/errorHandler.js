const ApiError = require('../utils/ApiError');
const multer = require('multer');

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details || undefined });
  }

  // Multer's own errors (file too large, wrong field name) and the custom
  // fileFilter rejection (a plain Error, thrown for wrong file type) both
  // deserve a clean 400 with their real message — not a generic 500.
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large (5MB max).' : err.message;
    return res.status(400).json({ error: message });
  }
  if (err.message && err.message.includes('Only JPEG, PNG, WEBP')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('[unhandled error]', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'That record already exists.' });
  }

  const safeDevelopmentMessage = process.env.NODE_ENV !== 'production' && err?.message
    ? err.message
    : 'Something went wrong on our end. Please try again in a moment.';
  return res.status(500).json({
    error: safeDevelopmentMessage,
  });
}

module.exports = errorHandler;
