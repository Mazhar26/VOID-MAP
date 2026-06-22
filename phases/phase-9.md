# Phase 9 — Monitoring (Grafana)

> **Goal:** Track performance metrics and system load using Prometheus scraping and Grafana dashboard visualization.

## Deliverables

- [x] Prometheus core metrics setup via `prom-client` in `server/src/index.js`
- [x] Custom metrics:
  - [x] HTTP request duration histogram (`http_request_duration_ms`)
  - [x] Active signals gauge (`voidmap_active_signals` updating dynamically from DB query on scrape)
- [x] `/metrics` open endpoint for scraper configuration
- [x] Manual Grafana dashboard target integration instructions

## Status: ✅ Complete
