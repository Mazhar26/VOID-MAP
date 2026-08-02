// ─── Environment Config ──────────────────────────────────────────────────────
// Single source of truth for all environment variables.
// Every other file imports from here — never from process.env directly.
// This makes it easy to catch missing vars at startup, not at runtime.

import 'dotenv/config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function required(key) {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function optional(key, defaultValue) {
  return process.env[key] || defaultValue;
}

/**
 * Require a string env var with a minimum length.
 * Used for secrets that must meet a strength threshold.
 */
function requiredMinLength(key, min) {
  const val = required(key);
  if (val.length < min) {
    throw new Error(`${key} must be at least ${min} characters`);
  }
  return val;
}

/**
 * Parse an integer env var with bounds checking.
 * Prevents silent NaN from bad env values.
 */
function intEnv(key, fallback, { min, max } = {}) {
  const raw = optional(key, String(fallback));
  const num = Number.parseInt(raw, 10);
  if (!Number.isInteger(num)) {
    throw new Error(`${key} must be an integer, got: "${raw}"`);
  }
  if (min !== undefined && num < min) {
    throw new Error(`${key} must be >= ${min}, got: ${num}`);
  }
  if (max !== undefined && num > max) {
    throw new Error(`${key} must be <= ${max}, got: ${num}`);
  }
  return num;
}

// ─── Determine Environment ───────────────────────────────────────────────────

const NODE_ENV = optional('NODE_ENV', 'development');
const isTest = NODE_ENV === 'test';
const isProd = NODE_ENV === 'production';

// ─── Export Config ────────────────────────────────────────────────────────────

export const config = {
  // Server
  PORT: intEnv('PORT', 3000, { min: 1, max: 65535 }),
  NODE_ENV,

  // Database
  DATABASE_URL: isTest
    ? optional('DATABASE_URL_TEST', 'postgresql://postgres:voidmap123@localhost:5432/voidmap_test')
    : required('DATABASE_URL'),

  // JWT — require 32+ char secret in production
  JWT_SECRET: isTest
    ? optional('JWT_SECRET', 'test_secret_key_32_chars_minimum')
    : isProd
      ? requiredMinLength('JWT_SECRET', 32)
      : required('JWT_SECRET'),
  JWT_EXPIRY_SHORT: optional('JWT_EXPIRY_SHORT', '24h'),
  JWT_EXPIRY_LONG: optional('JWT_EXPIRY_LONG', '30d'),

  // OTP / Email
  RESEND_API_KEY: isTest
    ? optional('RESEND_API_KEY', 're_test_key')
    : required('RESEND_API_KEY'),
  FROM_EMAIL: optional('FROM_EMAIL', 'onboarding@resend.dev'),
  OTP_EXPIRY_MINUTES: intEnv('OTP_EXPIRY_MINUTES', 5, { min: 1, max: 30 }),

  // Signal TTL
  SIGNAL_TTL_MINUTES: intEnv('SIGNAL_TTL_MINUTES', 30, { min: 1, max: 1440 }),
  CLEANUP_INTERVAL_MS: intEnv('CLEANUP_INTERVAL_MS', 60000, { min: 5000 }),

  // Admin
  ADMIN_EMAIL: optional('ADMIN_EMAIL', ''),

  // CORS — comma-separated allowed origins
  // In production, require explicit origin (no localhost defaults)
  CORS_ORIGIN: isProd
    ? required('CORS_ORIGIN')
    : optional('CORS_ORIGIN', 'http://localhost:5173,http://localhost:4173'),

  // Metrics — optional bearer token to protect /metrics endpoint
  METRICS_TOKEN: optional('METRICS_TOKEN', ''),
};
