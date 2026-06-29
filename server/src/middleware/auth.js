// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Verifies JWT from Authorization header and attaches user to req.
// Any route that needs authentication calls this middleware first.

import { verifyToken } from '../services/tokenService.js';

/**
 * Express middleware — require valid JWT.
 * On success: attaches req.user = { id, email, isAdmin }
 * On failure: returns 401 JSON error
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = verifyToken(token);
    req.user = {
      id:      payload.sub,
      email:   payload.email,
      isAdmin: payload.isAdmin,
    };
    next();
  } catch (err) {
    // jwt.verify throws JsonWebTokenError / TokenExpiredError
    // The errorHandler in index.js maps these to 401 responses.
    next(err);
  }
}
