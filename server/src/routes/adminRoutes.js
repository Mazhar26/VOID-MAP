// ─── Admin Routes ─────────────────────────────────────────────────────────────
// GET /api/admin/stats — admin-only system metrics
// GET /api/admin/users — admin-only paginated user list

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

// Apply admin protection to all admin routes
router.use(requireAuth, requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    // ponytail: all queries are independent — run in parallel
    const [usersCountRes, signalsCountRes, activeZonesRes, publicLocationsRes, distributionRes, signupsRes] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM users'),
      query('SELECT COUNT(*) AS count FROM noise_signals WHERE expires_at > NOW()'),
      query('SELECT DISTINCT geohash FROM noise_signals WHERE expires_at > NOW() ORDER BY geohash'),
      query('SELECT COUNT(*) AS count FROM saved_locations WHERE is_public = TRUE'),
      query(`SELECT noise_bucket, COUNT(*) AS count
             FROM noise_signals
             WHERE expires_at > NOW()
             GROUP BY noise_bucket`),
      query(`SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*) AS count
             FROM users
             WHERE created_at >= NOW() - INTERVAL '30 days'
             GROUP BY day
             ORDER BY day ASC`),
    ]);

    const totalUsers = parseInt(usersCountRes.rows[0].count, 10);
    const activeSignals = parseInt(signalsCountRes.rows[0].count, 10);
    const activeGeohashList = activeZonesRes.rows.map(r => r.geohash);
    const activeZonesCount = activeGeohashList.length;
    const totalSharedSpots = parseInt(publicLocationsRes.rows[0].count, 10);

    const distribution = { very_quiet: 0, quiet: 0, moderate: 0, loud: 0 };
    for (const row of distributionRes.rows) {
      if (row.noise_bucket in distribution) {
        distribution[row.noise_bucket] = parseInt(row.count, 10);
      }
    }

    const signupsOverTime = signupsRes.rows.map(row => ({
      day: new Date(row.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: parseInt(row.count, 10)
    }));

    // Calculate simulated TTL cost savings for dashboard (port from stats lambda)
    // DynamoDB costing was $0.25/GB, PG storage is cheap but we keep formula for equivalency
    const monthlyStorageWithoutTtlGb = (totalUsers * 1000 * 150) / (1024 ** 3); // simulated
    const ttlCostSavedMonthly = round(monthlyStorageWithoutTtlGb * 0.25, 4);

    return res.json({
      active_geohash_zones: activeZonesCount,
      active_geohash_list: activeGeohashList,
      total_active_signals: activeSignals,
      total_users: totalUsers,
      total_shared_locations: totalSharedSpots,
      noise_distribution: distribution,
      signups_over_time: signupsOverTime,
      ttl_cost_savings: {
        monthly_storage_without_ttl_gb: round(monthlyStorageWithoutTtlGb, 6),
        estimated_monthly_savings_usd: ttlCostSavedMonthly
      }
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get paginated users with their saved location count
    const usersRes = await query(
      `SELECT u.id, u.email, u.is_admin, u.created_at, COUNT(l.id) AS location_count
       FROM users u
       LEFT JOIN saved_locations l ON u.id = l.user_id
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count for pagination headers
    const countRes = await query('SELECT COUNT(*) AS count FROM users');
    const totalUsers = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalUsers / limit);

    return res.json({
      users: usersRes.rows.map(row => ({
        id: row.id,
        email: row.email,
        isAdmin: row.is_admin,
        createdAt: row.created_at,
        locationCount: parseInt(row.location_count, 10)
      })),
      pagination: {
        page,
        limit,
        totalPages,
        totalUsers
      }
    });

  } catch (err) {
    next(err);
  }
});

function round(val, dec) {
  return Number(Math.round(val + 'e' + dec) + 'e-' + dec);
}

export default router;
