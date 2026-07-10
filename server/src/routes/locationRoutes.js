// ─── Location Routes ──────────────────────────────────────────────────────────
// POST /api/locations       — save a new location pin (private or public)
// GET  /api/locations/mine  — get logged-in user's pins
// GET  /api/locations/public— get all public shared pins (optionally filter nearby)
// DELETE /api/locations/:id — delete user's own pin

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ponytail: inlined — 20 lines, not worth a shared package between client/server
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function encodeGeohash(lat, lon, precision = 5) {
  let latRange = [-90, 90], lonRange = [-180, 180];
  let hash = '', bit = 0, ch = 0, isLon = true;
  while (hash.length < precision) {
    const range = isLon ? lonRange : latRange;
    const mid = (range[0] + range[1]) / 2;
    if ((isLon ? lon : lat) >= mid) { ch |= (1 << (4 - bit)); range[0] = mid; } else { range[1] = mid; }
    if (++bit === 5) { hash += BASE32[ch]; bit = 0; ch = 0; }
    isLon = !isLon;
  }
  return hash;
}

// ─── POST /api/locations ──────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, address, noise_level, is_public, note } = req.body;
    const userId = req.user.id;

    // Validation
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: "Invalid or missing 'latitude'/'longitude'" });
    }

    const noiseLevel = typeof noise_level === 'string' ? noise_level.trim() : null;
    const isPublic = is_public === true;
    const noteText = typeof note === 'string' ? note.trim() : null;
    const addr = typeof address === 'string' ? address.trim() : null;

    const geohash = encodeGeohash(latitude, longitude, 5);

    const result = await query(
      `INSERT INTO saved_locations
         (user_id, latitude, longitude, geohash, address, noise_level, is_public, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [userId, latitude, longitude, geohash, addr, noiseLevel, isPublic, noteText]
    );

    return res.status(201).json({
      message: 'Location saved successfully.',
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/locations/mine ──────────────────────────────────────────────────
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, latitude, longitude, geohash, address, noise_level, is_public, note, created_at
       FROM saved_locations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/locations/public ────────────────────────────────────────────────
router.get('/public', async (req, res, next) => {
  try {
    const { lat, lon, radius } = req.query;

    // If coordinates and radius are provided, perform client-side/database filtering.
    // For now, let's select all public locations.
    // (Optional optimization: Filter by geohash box or simple bounding box if coordinates provided).
    let sql = `
      SELECT id, latitude, longitude, geohash, address, noise_level, is_public, note, created_at
      FROM saved_locations
      WHERE is_public = TRUE
    `;
    const params = [];

    if (lat && lon && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const r = parseFloat(radius); // in degrees approx (1 degree = ~111km)

      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(r)) {
        sql += ` AND latitude BETWEEN $1 - $3 AND $1 + $3
                 AND longitude BETWEEN $2 - $3 AND $2 + $3`;
        params.push(latitude, longitude, r);
      }
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/locations/:id ────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `DELETE FROM saved_locations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Location not found or unauthorized.' });
    }

    return res.json({ message: 'Location deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
