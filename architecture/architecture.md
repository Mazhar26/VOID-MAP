# Architecture Overview

VOID-MAP is a privacy-first mapping platform built on a fully open-source stack of Express.js, PostgreSQL, Vite, and Leaflet.js. All raw sound signals are ephemeral and automatically purged after 30 minutes.

> **Core Principle:** Ephemerality is built into the data layer and backed by a custom scheduled cleanup service.

---

## System Diagram

```mermaid
graph TD
    subgraph Client [Vite + Vanilla JS Client]
        A["🌐 UI / Map (Leaflet.js)"]
        B["🎙️ Audio Capture Lib"]
    end

    subgraph Backend [Express.js Backend]
        C["🚀 Express Server"]
        D["🔑 JWT / OTP Auth Middleware"]
        E["🧹 Cleanup Service (60s interval)"]
    end

    subgraph DB [PostgreSQL Database]
        F[("noise_signals table")]
        G[("users & otp_codes")]
        H[("saved_locations")]
    end

    subgraph External [External Services]
        I["✉️ Resend Email API"]
        J["🗺️ Nominatim Geocoder"]
    end

    B -->|Ambient sound values| A
    A -->|API requests / signals| C
    C -->|Authenticate request| D
    D -->|Query/Verify| G
    C -->|Insert noise reading| F
    C -->|CRUD user locations| H
    C -->|Scrape metrics| K["📊 Prometheus / Grafana"]
    
    E -->|DELETE FROM noise_signals WHERE expires_at < NOW()| F
    C -->|Send OTP emails| I
    A -->|Reverse / Forward geocoding| J
```

---

## Components

### Frontend Client (`client/`)
- **Vite & Vanilla JS:** Provides lightweight, fast builds and module resolution.
- **Audio Capture (`client/src/lib/microphone.js`):** Hooks into the Web Audio API to measure RMS amplitude. Does not record or store audio files.
- **Leaflet Map (`client/src/map/`):** Visualizes color-coded live noise spots and user pins using OpenStreetMap tiles.
- **Hash Router (`client/src/router.js`):** Lightweight client-side navigation with authorization guards for map/admin dashboards.

### Express.js Backend (`server/`)
- **API Server (`server/src/index.js`):** Exposes health, auth, signals, recommendations, locations, and prometheus metrics endpoints.
- **Cleanup Service (`server/src/services/cleanupService.js`):** Runs periodically every 60 seconds to purge expired signals and stale OTP codes from the database.
- **Metrics Scraping (`prom-client`):** Automatically collects CPU/memory utilization and tracks custom histograms (HTTP request durations) and gauges (active noise readings).

### Database Schema (`server/src/db/schema.sql`)
- **`noise_signals`:** Stores anonymous coordinates, noise bucket values, and an `expires_at` timestamp.
- **`users`:** Holds unique Gmail accounts. Passwords are not used; verification is entirely passwordless.
- **`otp_codes`:** Houses hashed OTPs linked to a user. Code records are single-use.
- **`saved_locations`:** Holds private pins (visible only to the user) and shared public locations (visible to the entire community).

---

## Data Lifecycle

```
Signal Recorded → POST to Backend → Saved with 30-min Expiry → Scraped/Aggregated → Purged by Cleanup Service
```

1. Client calculates RMS and classifies into `very_quiet`, `quiet`, `moderate`, or `loud`.
2. Signal is transmitted with latitude, longitude, and timestamp to the backend.
3. Express server inserts it with `expires_at = NOW() + 30 minutes`.
4. Background cleanup service removes records that have passed their `expires_at`.

---

## Privacy & Security Guarantees

- **No Stored Audio:** No recordings are stored or transmitted.
- **Stateless JWT Auth:** Users authenticate via single-use Gmail OTP codes. JWTs are stored in client localStorage.
- **Ephemeral Noise Signals:** Automatically deleted from PostgreSQL database after 30 minutes.
- **Ownership Verification:** Users can only view or delete their own saved location pins.
- **Encrypted OTP Codes:** OTPs are bcrypt-hashed before saving, protecting database integrity.
