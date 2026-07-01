// ─── Rate Limiter ────────────────────────────────────────────────────────────
// Protects all API routes from abuse.
// We define two limiters:
//   1. apiLimiter    — general routes (100 req/15min per IP)
//   2. authLimiter   — auth routes (10 req/15min per IP) — stricter

import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again in 15 minutes.' },
});
