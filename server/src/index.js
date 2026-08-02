// ─── Express App Entry Point ─────────────────────────────────────────────────
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createRequire } from 'module';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { startCleanupService } from './services/cleanupService.js';
import signalRoutes from './routes/signalRoutes.js';
import authRoutes from './routes/authRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import recommendRoutes from './routes/recommendRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { query } from './config/db.js';

// ─── Prometheus Metrics ───────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 200, 500, 1000],
  registers: [register],
});

export const activeSignalsGauge = new client.Gauge({
  name: 'voidmap_active_signals',
  help: 'Number of currently active noise signals',
  registers: [register],
});

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

// Trust first proxy (Koyeb / Cloudflare) so rate limiters see real client IPs
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet());

// CORS — origins loaded from env, split on comma
app.use(cors({
  origin: config.CORS_ORIGIN.split(',').map(s => s.trim()),
  credentials: true,
}));

// Request logging
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));

// JSON body parsing
app.use(express.json());

// Request duration tracking
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

// Apply general rate limiter to all /api routes
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Prometheus Metrics Endpoint ──────────────────────────────────────────────
// Protected by optional METRICS_TOKEN bearer token.
// In production without a token configured, the endpoint is disabled.
app.get('/metrics', async (req, res) => {
  // If a METRICS_TOKEN is configured, require it as a bearer token
  if (config.METRICS_TOKEN) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${config.METRICS_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (config.NODE_ENV === 'production') {
    // No token configured in production — disable endpoint entirely
    return res.status(404).json({ error: 'Not found.' });
  }

  try {
    const result = await query('SELECT COUNT(*) AS count FROM noise_signals WHERE expires_at > NOW()');
    const count = parseInt(result.rows[0].count, 10);
    activeSignalsGauge.set(count);
  } catch (err) {
    console.error('[metrics] Failed to update active signals gauge:', err.message);
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', signalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/recommendations', recommendRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 Catch-All ────────────────────────────────────────────────────────────
// Returns consistent JSON for unknown routes instead of Express HTML defaults
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ─── Global Error Handler (must be LAST) ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
if (config.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`[server] VOID-MAP running on http://localhost:${config.PORT}`);
    console.log(`[server] Environment: ${config.NODE_ENV}`);
    if (config.NODE_ENV !== 'production' || config.METRICS_TOKEN) {
      console.log(`[server] Metrics:     http://localhost:${config.PORT}/metrics`);
    }

    // Start background services
    startCleanupService();
  });
}

export default app;
