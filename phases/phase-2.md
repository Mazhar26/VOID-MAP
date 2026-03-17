# Phase 2 — Write Path Implementation

> **Goal:** Build the signal ingestion pipeline — client capture through Lambda storage.

## Deliverables

- [x] Browser client with microphone capture
  - [x] RMS + variation-based noise classification
  - [x] Geolocation API integration with geohash encoding
  - [x] Error handling for mic/location permission denial
  - [x] Premium UI with audio visualizer and progress bar
- [x] Write Lambda (`lambdas/write_signal/handler.py`)
  - [x] Input validation (ts, geo, noise_bucket)
  - [x] Timestamp validation within ±5 min of server time
  - [x] UUID-based signal_id to prevent DynamoDB key collisions
  - [x] CORS headers on all responses
  - [x] Specific `json.JSONDecodeError` handling
  - [x] TTL-based ephemeral storage (30 minutes)

## Status: ✅ Complete
