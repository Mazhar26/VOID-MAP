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
// Not behind auth — Grafana scrapes this
app.get('/metrics', async (_req, res) => {
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

import authRoutes from './routes/authRoutes.js';
app.use('/api/auth', authRoutes);

import locationRoutes from './routes/locationRoutes.js';
app.use('/api/locations', locationRoutes);

import recommendRoutes from './routes/recommendRoutes.js';
app.use('/api/recommendations', recommendRoutes);

import adminRoutes from './routes/adminRoutes.js';
app.use('/api/admin', adminRoutes);

// ─── Global Error Handler (must be LAST) ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
if (config.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`[server] VOID-MAP running on http://localhost:${config.PORT}`);
    console.log(`[server] Environment: ${config.NODE_ENV}`);
    console.log(`[server] Metrics:     http://localhost:${config.PORT}/metrics`);

    // Start background services
    startCleanupService();
  });
}

export default app;
