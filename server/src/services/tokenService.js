// ─── Token Service ────────────────────────────────────────────────────────────
// Single place for all JWT operations.
// We never call jwt.sign/verify directly in routes — always through here.

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Issue a signed JWT for an authenticated user.
 * @param {object} user - { id, email, is_admin }
 * @param {boolean} stayLoggedIn - true → 30d expiry, false → 24h
 * @returns {string} signed JWT
 */
export function signToken(user, stayLoggedIn = false) {
  const expiry = stayLoggedIn ? config.JWT_EXPIRY_LONG : config.JWT_EXPIRY_SHORT;

  return jwt.sign(
    {
      sub: user.id,           // standard JWT subject claim
      email: user.email,
      isAdmin: user.is_admin,
    },
    config.JWT_SECRET,
    { expiresIn: expiry }
  );
}

/**
 * Verify and decode a JWT.
 * Throws JsonWebTokenError or TokenExpiredError if invalid.
 * @param {string} token
 * @returns {{ sub: string, email: string, isAdmin: boolean }}
 */
export function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}
