-- VOID-MAP Database Schema
-- PostgreSQL 17
-- Run via: npm run migrate

-- ─── Extensions ─────────────────────────────────────────────────────────────
-- gen_random_uuid() requires pgcrypto on older PG versions.
-- On PG 13+ it is built-in. We enable it anyway for safety.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Users ──────────────────────────────────────────────────────────────────
-- Only Gmail addresses allowed (enforced at DB level as a safety net).
-- Authentication is OTP-only — no stored passwords.
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL
                    CHECK (email ~ '^[^@]+@gmail\.com$'),
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    stay_logged_in  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── OTP Codes ───────────────────────────────────────────────────────────────
-- Stored as bcrypt hashes — never plaintext.
-- Each OTP is single-use (used = TRUE after verification).
-- Expired OTPs are cleaned up automatically by the cleanup service.
CREATE TABLE IF NOT EXISTS otp_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes (expires_at);

-- ─── Noise Signals (Ephemeral) ───────────────────────────────────────────────
-- 30-minute TTL enforced in application layer (cleanupService).
-- No user ID — completely anonymous by design.
-- latitude/longitude stored for map rendering.
CREATE TABLE IF NOT EXISTS noise_signals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geohash      VARCHAR(12) NOT NULL,
    noise_bucket VARCHAR(20) NOT NULL
                 CHECK (noise_bucket IN ('very_quiet', 'quiet', 'moderate', 'loud')),
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    rms_value    REAL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

-- Composite index: geohash queries filtered by time (hot path for aggregation)
CREATE INDEX IF NOT EXISTS idx_signals_geo_time ON noise_signals (geohash, created_at);
-- Index for cleanup service — deletes by expires_at
CREATE INDEX IF NOT EXISTS idx_signals_expires ON noise_signals (expires_at);

-- ─── Saved Locations ────────────────────────────────────────────────────────
-- is_public = FALSE → private pin (only owner sees it)
-- is_public = TRUE  → shared community spot (all users see it on map)
CREATE TABLE IF NOT EXISTS saved_locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    geohash     VARCHAR(12),
    address     TEXT,
    noise_level VARCHAR(20),
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: only indexes public rows — private pins never appear here
CREATE INDEX IF NOT EXISTS idx_locations_public ON saved_locations (is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_locations_user ON saved_locations (user_id);
