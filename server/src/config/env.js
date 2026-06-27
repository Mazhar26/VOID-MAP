// ─── Environment Config ──────────────────────────────────────────────────────
// Single source of truth for all environment variables.
// Every other file imports from here — never from process.env directly.
// This makes it easy to catch missing vars at startup, not at runtime.

import 'dotenv/config';

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

export const config = {
  // Server
  PORT: parseInt(optional('PORT', '3000'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),

  // Database
  DATABASE_URL: process.env.NODE_ENV === 'test'
    ? optional('DATABASE_URL_TEST', 'postgresql://postgres:voidmap123@localhost:5432/voidmap_test')
    : required('DATABASE_URL'),

  // JWT
  JWT_SECRET: process.env.NODE_ENV === 'test'
    ? optional('JWT_SECRET', 'test_secret_key_32_chars_minimum')
    : required('JWT_SECRET'),
  JWT_EXPIRY_SHORT: optional('JWT_EXPIRY_SHORT', '24h'),
  JWT_EXPIRY_LONG: optional('JWT_EXPIRY_LONG', '30d'),

  // OTP / Email
  RESEND_API_KEY: process.env.NODE_ENV === 'test'
    ? optional('RESEND_API_KEY', 're_test_key')
    : required('RESEND_API_KEY'),
  FROM_EMAIL: optional('FROM_EMAIL', 'onboarding@resend.dev'),
  OTP_EXPIRY_MINUTES: parseInt(optional('OTP_EXPIRY_MINUTES', '5'), 10),

  // Signal TTL
  SIGNAL_TTL_MINUTES: parseInt(optional('SIGNAL_TTL_MINUTES', '30'), 10),
  CLEANUP_INTERVAL_MS: parseInt(optional('CLEANUP_INTERVAL_MS', '60000'), 10),

  // Admin
  ADMIN_EMAIL: optional('ADMIN_EMAIL', ''),

  // CORS — comma-separated allowed origins (e.g. "https://void-map.pages.dev,https://voidmap.com")
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173,http://localhost:4173'),
};
