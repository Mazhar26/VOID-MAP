// ─── Signal Routes Integration Tests ──────────────────────────────────────────
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../index.js';
import { query, pool } from '../config/db.js';

describe('Signal Routes API', () => {
  // Clear the DB before tests run
  before(async () => {
    await query('DELETE FROM noise_signals');
  });

  // Close database pool connection when tests are complete
  after(async () => {
    await query('DELETE FROM noise_signals');
    await pool.end();
  });

  test('POST /api/signal — successful anonymous write', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const res = await request(app)
      .post('/api/signal')
      .send({
        ts,
        geo: 'tdr5s',
        noise_bucket: 'quiet',
        latitude: 17.4,
        longitude: 78.5,
        rms_value: 0.035
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Silence remembered briefly.');
  });

  test('POST /api/signal — fails if fields are missing or invalid', async () => {
    const res = await request(app)
      .post('/api/signal')
      .send({
        ts: 'not-a-timestamp',
        geo: 'td',
        noise_bucket: 'invalid_bucket',
        latitude: 17.4,
        longitude: 78.5
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  test('GET /api/quiet/:geohash — aggregates quiet score correctly', async () => {
    // Note: The previous test added 1 'quiet' signal (weight: 0.75) for 'tdr5s'
    const res = await request(app)
      .get('/api/quiet/tdr5s');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.geo, 'tdr5s');
    assert.strictEqual(res.body.quiet_score, 0.75);
    assert.strictEqual(res.body.confidence, 'low');
  });

  test('GET /api/quiet/:geohash — returns empty score for unknown tiles', async () => {
    const res = await request(app)
      .get('/api/quiet/nonexistent');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.quiet_score, 0.0);
    assert.strictEqual(res.body.confidence, 'low');
  });
});
