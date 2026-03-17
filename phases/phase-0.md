# Phase 0 — Design & Documentation

> **Goal:** Define the project vision, architecture, and development roadmap before writing any code.

## Deliverables

- [x] Project README with one-liner description
- [x] Architecture document outlining components and data flow
- [x] API route definitions
- [x] Phase documents (phase-0 through phase-3)
- [x] Privacy-first design principles established

## Key Decisions

- **Ephemeral storage:** DynamoDB TTL (30 minutes) ensures data is automatically forgotten
- **No audio recording:** Only noise-level classification buckets are transmitted
- **Coarse geolocation:** Geohash precision 5 (~5km² tiles) to prevent precise tracking
- **Serverless architecture:** API Gateway + Lambda + DynamoDB — no servers to manage
- **Single-file client:** Minimal HTML/CSS/JS with no build step required

## Status: ✅ Complete
