// ─── Auth Routes ─────────────────────────────────────────────────────────────
// POST /api/auth/signup      — register with Gmail, get OTP
// POST /api/auth/login       — existing user, get OTP
// POST /api/auth/verify-otp  — submit OTP, receive JWT
// POST /api/auth/logout      — client-side (returns instruction)

import { Router } from 'express';
import { query, pool } from '../config/db.js';
import { config } from '../config/env.js';
import { generateOTP, hashOTP, verifyOTP, sendOTP } from '../services/otpService.js';
import { signToken } from '../services/tokenService.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Apply strict rate limiting to all auth routes
router.use(authLimiter);

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_OTP_ATTEMPTS = 5;

// ─── Helper ───────────────────────────────────────────────────────────────────

const GMAIL_REGEX = /^[^@]+@gmail\.com$/i;

function validateGmail(email) {
  return typeof email === 'string' && GMAIL_REGEX.test(email.trim());
}

/**
 * Create an OTP for a user: generate → hash → store in DB → send email.
 * Shared logic between signup and login flows.
 */
async function issueOTP(userId, email) {
  const otp = generateOTP();
  const hash = await hashOTP(otp);
  const expiresAt = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

  await query(
    `INSERT INTO otp_codes (user_id, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );

  await sendOTP(email, otp);
}

// Generic response used by both signup and login to avoid account enumeration.
const OTP_SENT_MESSAGE = 'If this email is eligible, an OTP has been sent.';

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

router.post('/signup', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!validateGmail(email)) {
      return res.status(400).json({ error: 'Only Gmail addresses are allowed.' });
    }

    // Check if user already exists
    const existing = await query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      // User exists — send generic response to prevent enumeration.
      // The frontend can prompt "try logging in" as a general suggestion.
      return res.json({ message: OTP_SENT_MESSAGE });
    }

    // Use a transaction: if OTP email fails, roll back the user insert
    const client = await pool.connect();
    let userId;
    try {
      await client.query('BEGIN');

      // Auto-promote if this is the admin email
      const isAdmin = config.ADMIN_EMAIL.toLowerCase() === email;

      const newUser = await client.query(
        `INSERT INTO users (email, is_admin) VALUES ($1, $2) RETURNING id`,
        [email, isAdmin]
      );
      userId = newUser.rows[0].id;

      const otp = generateOTP();
      const hash = await hashOTP(otp);
      const expiresAt = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

      await client.query(
        `INSERT INTO otp_codes (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, hash, expiresAt]
      );

      // Send email — if this fails, the catch block rolls back
      await sendOTP(email, otp);

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    return res.status(201).json({ message: OTP_SENT_MESSAGE });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!validateGmail(email)) {
      return res.status(400).json({ error: 'Only Gmail addresses are allowed.' });
    }

    const result = await query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      // User does not exist — send generic response to prevent enumeration
      return res.json({ message: OTP_SENT_MESSAGE });
    }

    const userId = result.rows[0].id;

    await issueOTP(userId, email);

    return res.json({ message: OTP_SENT_MESSAGE });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────

router.post('/verify-otp', async (req, res, next) => {
  try {
    const email       = req.body.email?.trim().toLowerCase();
    const otp         = req.body.otp?.trim();
    const stayLoggedIn = req.body.stayLoggedIn === true;

    if (!validateGmail(email) || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    // Get user
    const userResult = await query(
      `SELECT id, email, is_admin FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'OTP expired or invalid.' });
    }

    const user = userResult.rows[0];

    // Get the latest unused, non-expired, non-locked OTP for this user
    const otpResult = await query(
      `SELECT id, code_hash, attempt_count, locked_at
       FROM otp_codes
       WHERE user_id = $1
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: 'OTP expired or invalid.' });
    }

    const { id: otpId, code_hash, attempt_count, locked_at } = otpResult.rows[0];

    // Reject if OTP is locked (too many failed attempts)
    if (locked_at || attempt_count >= MAX_OTP_ATTEMPTS) {
      return res.status(401).json({ error: 'OTP expired or invalid.' });
    }

    // Compare submitted OTP against stored hash
    const isValid = await verifyOTP(otp, code_hash);

    if (!isValid) {
      // Increment attempt counter; lock if threshold reached
      await query(
        `UPDATE otp_codes
         SET attempt_count = attempt_count + 1,
             locked_at = CASE WHEN attempt_count + 1 >= $2 THEN NOW() ELSE locked_at END
         WHERE id = $1`,
        [otpId, MAX_OTP_ATTEMPTS]
      );
      return res.status(401).json({ error: 'OTP expired or invalid.' });
    }

    // Atomically mark OTP as used — only succeeds if still unused.
    // This prevents race conditions where two concurrent requests
    // with the same valid OTP could both obtain JWTs.
    const markUsed = await query(
      `UPDATE otp_codes SET used = TRUE
       WHERE id = $1 AND used = FALSE
       RETURNING id`,
      [otpId]
    );

    if (markUsed.rowCount !== 1) {
      // Another concurrent request already consumed this OTP
      return res.status(401).json({ error: 'OTP expired or invalid.' });
    }

    // Update stay_logged_in preference
    await query(`UPDATE users SET stay_logged_in = $1 WHERE id = $2`, [stayLoggedIn, user.id]);

    // Issue JWT
    const token = signToken(user, stayLoggedIn);

    return res.json({
      token,
      user: {
        id:      user.id,
        email:   user.email,
        isAdmin: user.is_admin,
      },
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Auth is stateless (JWT). Logout is handled client-side by deleting the token.
// This endpoint exists so clients have a clean API to call.

router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out. Delete the token from your client.' });
});

export default router;
