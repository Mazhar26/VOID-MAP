# VOID-MAP

> Privacy-first, open-source mapping platform for finding and sharing quiet spots.

**Forgetting is enforced by clean database lifecycle logic, not manual discipline.**

VOID-MAP records noise readings from users' microphones, maps silence levels transiently, and offers activity suggestions based on local decibels. Readings are stored anonymously in a PostgreSQL database and purged after 30 minutes.

---

## 🛠️ Technology Stack

- **Server:** Node.js (Express.js), Helmet, express-rate-limit, pg, prom-client, Resend
- **Database:** PostgreSQL (with indexed geohash tiles, 30-min cleanup)
- **Client:** Vite, Vanilla JS, Leaflet.js, OpenStreetMap
- **Monitoring:** Grafana / Prometheus scraping

---

## 🌐 Project Structure

```
VOID-MAP/
├── server/                          # Express.js backend
│   ├── src/
│   │   ├── index.js                 # App entry point & Prometheus endpoints
│   │   ├── config/
│   │   │   ├── db.js                # PostgreSQL pool config
│   │   │   └── env.js               # Envs validation schema
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification
│   │   │   ├── adminAuth.js         # Admin role gate
│   │   │   └── rateLimiter.js       # Express rate limiting
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # OTP Signup/Login/Verify
│   │   │   ├── signalRoutes.js      # Post signals & get quiet scores
│   │   │   ├── locationRoutes.js    # Saved locations CRUD
│   │   │   ├── recommendRoutes.js   # Activity recommendations
│   │   │   └── adminRoutes.js       # Admin stats & User management
│   │   ├── services/
│   │   │   ├── otpService.js        # Bcrypt hashing & Resend integration
│   │   │   ├── tokenService.js      # JWT helper
│   │   │   └── cleanupService.js    # 30-min TTL signal purge background runner
│   │   └── db/
│   │       ├── migrate.js           # Schema migration runner
│   │       └── schema.sql           # PostgreSQL table schemas
│   ├── package.json
│   └── .env.example
│
├── client/                          # Vite + Vanilla JS frontend
│   ├── index.html                   # Entry SPA layout
│   ├── vite.config.js               # Proxy setup to Express (cors-free)
│   ├── src/
│   │   ├── main.js                  # Routing setup & Entry
│   │   ├── style.css                # Global variables & theme variables
│   │   ├── api.js                   # Fetch wrapper with auto-auth headers
│   │   ├── router.js                # Client hash router with guards & afterMount hook
│   │   ├── pages/
│   │   │   ├── home.js              # Sound capture dashboard
│   │   │   ├── map.js               # Interactive map layout
│   │   │   ├── login.js             # Passwordless Gmail OTP form
│   │   │   └── admin.js             # Systems statistics & metrics dashboard
│   │   ├── components/
│   │   │   ├── locationToggle.js    # Address / Coordinates switcher
│   │   │   ├── pinModal.js          # Save/Share location dialog
│   │   │   └── recommendList.js     # Suggestion tiles
│   │   ├── lib/
│   │   │   ├── microphone.js        # Web Audio API analyzer
│   │   │   ├── classify.js          # Threshold classification
│   │   │   ├── geohash.js           # Geohash encoder
│   │   │   └── geocode.js           # Nominatim forward/reverse geocoding
│   │   └── map/
│   │       ├── leafletMap.js        # Leaflet init & markers paths fix
│   │       ├── markers.js           # Live spots layer
│   │       └── userPins.js          # Pin layer & interactive deletion popups
│
├── archive/                         # Archived AWS implementation
│   ├── lambdas/                     # Python Lambdas
│   └── terraform/                   # Terraform config
```

---

## 🚀 Local Development

### 1. Database Setup
Ensure PostgreSQL is running locally. Connect and create a database named `voidmap`:
```sql
CREATE DATABASE voidmap;
```

### 2. Backend Setup
1. Navigate to `/server`:
   ```bash
   cd server
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Create a `.env` file (copied from `.env.example`) and fill in details:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:<password>@localhost:5432/voidmap
   JWT_SECRET=<your-jwt-secret>
   RESEND_API_KEY=<your-resend-api-key>
   FROM_EMAIL=onboarding@resend.dev
   ADMIN_EMAIL=<your-gmail-address>
   ```
4. Run migrations:
   ```bash
   npm run migrate
   ```
5. Start backend in development mode:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to `/client`:
   ```bash
   cd ../client
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
4. Open the link displayed (`http://localhost:5173/`).

---

## 📡 API Reference

### Auth Routes
- `POST /api/auth/signup` — Submit Gmail to register, receive verification OTP.
- `POST /api/auth/login` — Request OTP for existing Gmail account.
- `POST /api/auth/verify-otp` — Verify OTP and receive JWT access token.
- `POST /api/auth/logout` — Stateless token removal reminder.

### Ephemeral Signals
- `POST /api/signal` — Submit anonymous noise reading: `{ ts, geo, noise_bucket, latitude, longitude, rms_value }`.
- `GET /api/quiet/:geohash` — Returns average quiet score over the last 30 minutes.

### Location Pinning & Sharing
- `POST /api/locations` (Auth) — Pin location: `{ latitude, longitude, address, noise_level, is_public, note }`.
- `GET /api/locations/mine` (Auth) — Fetch current user's pins.
- `GET /api/locations/public` (Auth) — Get public spots shared by the community.
- `DELETE /api/locations/:id` (Auth) — Delete a user's pin.

### Recommendations & Administration
- `GET /api/recommendations/:noiseLevel` — Fetch rule-based activities.
- `GET /api/admin/stats` (Admin) — Fetch dashboard metrics.
- `GET /api/admin/users` (Admin) — View user catalog.
- `GET /metrics` — Prometheus metrics scraper target.
