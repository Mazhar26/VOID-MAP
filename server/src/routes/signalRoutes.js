// ─── Signal Routes ────────────────────────────────────────────────────────────
// POST /api/signal        — write a new noise signal (port of write_signal lambda)
// GET  /api/quiet/:geohash — aggregate quiet score (port of read_aggregation lambda)

import { Router } from 'express';
import { query } from '../config/db.js';
import { config } from '../config/env.js';
import { signalLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_BUCKETS = new Set(['very_quiet', 'quiet', 'moderate', 'loud']);
const TS_TOLERANCE_SECONDS = 5 * 60; // ±5 minutes

// Weighted quiet score — mirrors read_aggregation/handler.py exactly
const WEIGHTS = {
  very_quiet: 1.0,
  quiet:      0.75,
  moderate:   0.4,
  loud:       0.1,
};

const CONFIDENCE_THRESHOLD_LOW  = 5;
const CONFIDENCE_THRESHOLD_HIGH = 20;

// Valid geohash: base32 charset, 3-8 characters
const GEOHASH_RE = /^[0123456789bcdefghjkmnpqrstuvwxyz]{3,8}$/;

// ─── POST /api/signal ─────────────────────────────────────────────────────────

router.post('/signal', signalLimiter, async (req, res, next) => {
  try {
    const { ts, geo, noise_bucket, latitude, longitude, rms_value } = req.body;

    // --- Validation (mirrors write_signal/handler.py) ---

    if (!Number.isInteger(ts)) {
      return res.status(400).json({ error: "Invalid or missing 'ts'" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(ts - now) > TS_TOLERANCE_SECONDS) {
      return res.status(400).json({ error: 'Timestamp is too far from server time' });
    }

    // Geohash: must be valid base32 charset, 3-8 chars
    const geoTrimmed = typeof geo === 'string' ? geo.trim().toLowerCase() : '';
    if (!GEOHASH_RE.test(geoTrimmed)) {
      return res.status(400).json({ error: "Invalid or missing 'geo'" });
    }

    const bucket = typeof noise_bucket === 'string' ? noise_bucket.trim() : null;
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return res.status(400).json({ error: "Invalid 'noise_bucket'" });
    }

    // Coordinates: must be finite numbers within valid ranges
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

    // rms_value: optional, but if present must be a non-negative finite number
    if (
      rms_value !== undefined &&
      rms_value !== null &&
      (typeof rms_value !== 'number' || !Number.isFinite(rms_value) || rms_value < 0)
    ) {
      return res.status(400).json({ error: "Invalid 'rms_value'" });
    }

    // --- Insert ---

    const expiresAt = new Date(Date.now() + config.SIGNAL_TTL_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO noise_signals
         (geohash, noise_bucket, latitude, longitude, rms_value, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        geoTrimmed,
        bucket,
        latitude,
        longitude,
        rms_value ?? null,
        expiresAt,
      ]
    );

    return res.json({ message: 'Silence remembered briefly.' });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/quiet/:geohash ──────────────────────────────────────────────────

router.get('/quiet/:geohash', async (req, res, next) => {
  try {
    const { geohash } = req.params;

    if (!geohash || geohash.length < 3) {
      return res.status(400).json({ error: 'Invalid geohash' });
    }

    // Query active (non-expired) signals for this geohash
    const result = await query(
      `SELECT noise_bucket
       FROM noise_signals
       WHERE geohash = $1 AND expires_at > NOW()`,
      [geohash]
    );

    const items = result.rows;

    if (items.length === 0) {
      return res.json({
        geo: geohash,
        quiet_score: 0.0,
        confidence: 'low',
        window_minutes: 30,
      });
    }

    // Compute weighted quiet score — same formula as read_aggregation/handler.py
    const scoreSum = items.reduce((sum, row) => sum + (WEIGHTS[row.noise_bucket] ?? 0), 0);
    const quietScore = Math.round((scoreSum / items.length) * 100) / 100;

    const confidence =
      items.length > CONFIDENCE_THRESHOLD_HIGH ? 'high' :
      items.length > CONFIDENCE_THRESHOLD_LOW  ? 'medium' :
      'low';

    return res.json({
      geo: geohash,
      quiet_score: quietScore,
      confidence,
      window_minutes: 30,
    });

  } catch (err) {
    next(err);
  }
});

export default router;
