// ─── Admin Auth Middleware ────────────────────────────────────────────────────
// Must be used AFTER requireAuth — it reads req.user which auth.js sets.
// Re-checks admin role from the database on every request.
// This ensures that demoted admins lose access immediately, not at token expiry.

import { query } from '../config/db.js';

/**
 * Express middleware — require admin role (verified from DB, not JWT).
 * Use as: router.use(requireAuth, requireAdmin)
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const result = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || result.rows[0].is_admin !== true) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    next();
  } catch (err) {
    next(err);
  }
}
