// ─── Global Error Handler ────────────────────────────────────────────────────
// This is an Express error-handling middleware (4 args — err, req, res, next).
// It must be mounted LAST, after all routes.
// Catches any error passed via next(err) or thrown in async handlers.

import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log the full error in development for debugging
  const isDev = config.NODE_ENV === 'development';

  if (isDev) {
    console.error('[error]', err);
  } else {
    // In production, log minimal info — don't expose stack traces
    console.error(`[error] ${req.method} ${req.path} — ${err.message}`);
  }

  // Handle specific known error types
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  // Default: internal server error
  const status = err.status || err.statusCode || 500;
  const message = isDev ? err.message : 'Internal server error.';

  res.status(status).json({ error: message });
}
