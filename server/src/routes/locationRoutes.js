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

// ─── Constants ────────────────────────────────────────────────────────────────
const VALID_NOISE_LEVELS = new Set(['very_quiet', 'quiet', 'moderate', 'loud']);
const MAX_ADDRESS_LEN = 300;
const MAX_NOTE_LEN = 500;

// ─── POST /api/locations ──────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, address, noise_level, is_public, note } = req.body;
    const userId = req.user.id;

    // Coordinate validation — finite numbers within valid ranges
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      return res.status(400).json({ error: "Invalid or missing 'latitude'/'longitude'" });
    }

    // Noise level — must be from the allowed set if provided
    const noiseLevel = typeof noise_level === 'string' ? noise_level.trim() : null;
    if (noiseLevel && !VALID_NOISE_LEVELS.has(noiseLevel)) {
      return res.status(400).json({ error: "Invalid 'noise_level'" });
    }

    const isPublic = is_public === true;

    // Address — string, max 300 chars
    const addr = typeof address === 'string' ? address.trim() : null;
    if (addr && addr.length > MAX_ADDRESS_LEN) {
      return res.status(400).json({ error: `Address must be ${MAX_ADDRESS_LEN} characters or less.` });
    }

    // Note — string, max 500 chars
    const noteText = typeof note === 'string' ? note.trim() : null;
    if (noteText && noteText.length > MAX_NOTE_LEN) {
      return res.status(400).json({ error: `Note must be ${MAX_NOTE_LEN} characters or less.` });
    }

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

    // Pagination — default 100, max 100
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    // Reduce precision to ~11m (4 decimal places) for public responses.
    // Exclude address and note for privacy.
    let sql = `
      SELECT id,
             ROUND(latitude::numeric,  4)::float AS latitude,
             ROUND(longitude::numeric, 4)::float AS longitude,
             geohash,
             noise_level,
             created_at
      FROM saved_locations
      WHERE is_public = TRUE
    `;
    const params = [];
    let paramIdx = 1;

    if (lat && lon && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const r = parseFloat(radius); // in degrees approx (1 degree = ~111km)

      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(r)) {
        const centerHash = encodeGeohash(latitude, longitude, 3);
        sql += ` AND latitude BETWEEN $${paramIdx} - $${paramIdx + 2} AND $${paramIdx} + $${paramIdx + 2}
                 AND longitude BETWEEN $${paramIdx + 1} - $${paramIdx + 2} AND $${paramIdx + 1} + $${paramIdx + 2}
                 AND geohash LIKE $${paramIdx + 3}`;
        params.push(latitude, longitude, r, `${centerHash}%`);
        paramIdx += 4;
      }
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

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
