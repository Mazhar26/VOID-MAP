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
-- attempt_count tracks failed verification attempts; locked_at freezes the OTP after 5.
CREATE TABLE IF NOT EXISTS otp_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash       VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used            BOOLEAN NOT NULL DEFAULT FALSE,
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    locked_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes (expires_at);

-- Migration helper: add columns if table already exists from prior schema
-- These are safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS pattern).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_codes' AND column_name = 'attempt_count'
  ) THEN
    ALTER TABLE otp_codes ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_codes' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE otp_codes ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
END
$$;

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

-- DB-level CHECK constraints for noise signals (safe to add if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noise_lat') THEN
    ALTER TABLE noise_signals ADD CONSTRAINT chk_noise_lat CHECK (latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noise_lon') THEN
    ALTER TABLE noise_signals ADD CONSTRAINT chk_noise_lon CHECK (longitude BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noise_geohash') THEN
    ALTER TABLE noise_signals ADD CONSTRAINT chk_noise_geohash CHECK (geohash ~ '^[0123456789bcdefghjkmnpqrstuvwxyz]{3,8}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noise_rms') THEN
    ALTER TABLE noise_signals ADD CONSTRAINT chk_noise_rms CHECK (rms_value IS NULL OR rms_value >= 0);
  END IF;
END
$$;

-- ─── Saved Locations ────────────────────────────────────────────────────────
-- is_public = FALSE → private pin (only owner sees it)
-- is_public = TRUE  → shared community spot (all users see it on map)
CREATE TABLE IF NOT EXISTS saved_locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    geohash     VARCHAR(12),
    address     VARCHAR(300),
    noise_level VARCHAR(20),
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    note        VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: only indexes public rows — private pins never appear here
CREATE INDEX IF NOT EXISTS idx_locations_public ON saved_locations (is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_locations_user ON saved_locations (user_id);

-- DB-level CHECK constraints for saved locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saved_lat') THEN
    ALTER TABLE saved_locations ADD CONSTRAINT chk_saved_lat CHECK (latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saved_lon') THEN
    ALTER TABLE saved_locations ADD CONSTRAINT chk_saved_lon CHECK (longitude BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saved_noise') THEN
    ALTER TABLE saved_locations ADD CONSTRAINT chk_saved_noise CHECK (
      noise_level IS NULL OR noise_level IN ('very_quiet', 'quiet', 'moderate', 'loud')
    );
  END IF;
END
$$;

-- Migration helper: convert TEXT columns to VARCHAR with length limits
-- Safe to run multiple times — ALTER TYPE is idempotent for matching types.
DO $$
BEGIN
  ALTER TABLE saved_locations ALTER COLUMN address TYPE VARCHAR(300);
  ALTER TABLE saved_locations ALTER COLUMN note TYPE VARCHAR(500);
EXCEPTION WHEN OTHERS THEN
  -- Column type may already match, ignore
  NULL;
END
$$;
