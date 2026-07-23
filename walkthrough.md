# Walkthrough — Migration Complete 🌙

VOID-MAP has been successfully migrated from the original AWS serverless stack (Lambda, DynamoDB, API Gateway) to a robust, self-hosted, fully open-source stack.

## Technical Accomplishments

### 1. Backend API (Express.js)
- **Central App Entry:** [index.js](file:///d:/VOID-MAP/server/src/index.js) mounts security middleware (Helmet, CORS, rate limits) and sets up Prometheus metrics scraping.
- **Passwordless Auth:** [authRoutes.js](file:///d:/VOID-MAP/server/src/routes/authRoutes.js) coordinates single-use Gmail verification with secure bcrypt hashed OTP tables.
- **Saved Locations:** [locationRoutes.js](file:///d:/VOID-MAP/server/src/routes/locationRoutes.js) handles private pins (pins for myself) and public shared spots (shared with community) with bounding box latitude/longitude calculations.
- **Admin Stats Panel:** [adminRoutes.js](file:///d:/VOID-MAP/server/src/routes/adminRoutes.js) compiles database statistics including noise levels, signups over time, active zones, and cost savings.
- **Signal Aggregation:** [signalRoutes.js](file:///d:/VOID-MAP/server/src/routes/signalRoutes.js) validates coordinates and writes ephemeral records.
- **Activity Suggestion Rules:** [recommendRoutes.js](file:///d:/VOID-MAP/server/src/routes/recommendRoutes.js) triggers decibel-based recommendations with time-aware logic (evening astronomy).

### 2. Database Layer (PostgreSQL)
- **Database Schema:** [schema.sql](file:///d:/VOID-MAP/server/src/db/schema.sql) declares idempotent structure, composite indexes for time-series geohashes, and strict validation checks (Gmail-only format).
- **Migration Script:** [migrate.js](file:///d:/VOID-MAP/server/src/db/migrate.js) runs Schema SQL safely.

### 3. Frontend Client (Vite + Vanilla JS)
- **Hash Router:** [router.js](file:///d:/VOID-MAP/client/src/router.js) provides route guards and mounts Leaflet containers smoothly with an `afterMount` lifecycle hook.
- **Interactive Map:** [map.js](file:///d:/VOID-MAP/client/src/pages/map.js) initializes OpenStreetMap tiles, binds custom markers with color-coded popups, and updates active records as the user moves around the map.
- **Dashboard Panel:** [admin.js](file:///d:/VOID-MAP/client/src/pages/admin.js) builds custom stats rows and user grid tables with CSS visual bars.
- **Recommendations Component:** [recommendList.js](file:///d:/VOID-MAP/client/src/components/recommendList.js) renders custom suggestions cards on measurement success.
- **Pinning Modal:** [pinModal.js](file:///d:/VOID-MAP/client/src/components/pinModal.js) coordinates private/public location submissions.

---

## Final Verification Checklist

- [x] Run PostgreSQL migration: `npm run migrate` inside `/server`
- [x] Launch server in development mode: `npm run dev` inside `/server`
- [x] Launch client dev server: `npm run dev` inside `/client`
- [x] Navigate to browser: `http://localhost:5173/`
- [x] Trigger sound measurements (address and coordinates toggle works)
- [x] Log in using Resend OTP verification codes
- [x] Check interactive Leaflet map overlays
- [x] Promote user to admin role to examine stats cards and CSS bar charts
- [x] Scrape metrics from `http://localhost:3000/metrics`
