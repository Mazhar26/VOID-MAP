// ─── Admin Auth Middleware ────────────────────────────────────────────────────
// Must be used AFTER requireAuth — it reads req.user which auth.js sets.
// Rejects non-admin users with 403 Forbidden.

/**
 * Express middleware — require admin role.
 * Use as: router.get('/admin/stats', requireAuth, requireAdmin, handler)
 */
export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}
