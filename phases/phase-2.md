# Phase 2 — Write Path Implementation

> **Goal:** Build the signal ingestion pipeline — client capture through Lambda storage.

## Deliverables

- [x] Browser client with microphone capture
  - [x] RMS + variation-based noise classification (named threshold constants)
  - [x] Geolocation API integration with geohash encoding (precision 5)
  - [x] Error handling for mic/location permission denial
  - [x] Premium UI with audio visualizer and progress bar
  - [x] XSS protection via `escapeHtml()` on all dynamic output
  - [x] API retry with exponential backoff (2 retries)
  - [x] `AudioContext.resume()` safety net
  - [x] ARIA attributes for accessibility
  - [x] Emoji favicon
- [x] Write Lambda (`lambdas/write_signal/handler.py`)
  - [x] Input validation (ts, geo, noise_bucket)
  - [x] Timestamp validation within ±5 min of server time
  - [x] Composite sort key `ts#signal_id` to prevent DynamoDB collisions
  - [x] CORS + `Content-Type` headers on all responses
  - [x] Specific `json.JSONDecodeError` handling
  - [x] Structured logging via `logging` module
  - [x] TTL-based ephemeral storage (30 minutes)

## Status: ✅ Complete
