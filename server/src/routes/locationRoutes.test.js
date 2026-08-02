// ─── Location Routes Integration Tests ────────────────────────────────────────
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../index.js';
import { query, pool } from '../config/db.js';
import { signToken } from '../services/tokenService.js';

describe('Location Routes API', () => {
  let userToken;
  let userId;
  let savedLocationId;
  const userEmail = 'tester.locations@gmail.com';

  before(async () => {
    // Clear only this suite's test user
    await query('DELETE FROM users WHERE email = $1', [userEmail]);

    // Seed a test user
    const userRes = await query(
      `INSERT INTO users (email, is_admin)
       VALUES ($1, FALSE)
       RETURNING id`,
      [userEmail]
    );
    userId = userRes.rows[0].id;

    // Generate JWT token
    userToken = signToken({ id: userId, email: userEmail, is_admin: false });
  });

  after(async () => {
    await query('DELETE FROM users WHERE email = $1', [userEmail]);
    await pool.end();
  });

  test('POST /api/locations — successfully saves location pin', async () => {
    const res = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Bangalore, India',
        noise_level: 'very_quiet',
        is_public: true,
        note: 'Peaceful reading spot'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.message, 'Location saved successfully.');
    savedLocationId = res.body.id;
  });

  test('POST /api/locations — blocks unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/locations')
      .send({
        latitude: 12.9716,
        longitude: 77.5946
      });

    assert.strictEqual(res.status, 401);
  });

  test('GET /api/locations/mine — fetches private/public pins for user', async () => {
    const res = await request(app)
      .get('/api/locations/mine')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length >= 1);
    const pin = res.body.find(l => l.id === savedLocationId);
    assert.ok(pin);
    assert.strictEqual(pin.address, 'Bangalore, India');
    assert.strictEqual(pin.note, 'Peaceful reading spot');
  });

  test('POST /api/locations — rejects out-of-range latitude', async () => {
    const res = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        latitude: 999,
        longitude: 77.5946,
        noise_level: 'quiet'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('latitude'));
  });

  test('POST /api/locations — rejects invalid noise_level', async () => {
    const res = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        latitude: 12.97,
        longitude: 77.59,
        noise_level: 'extremely_loud'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('noise_level'));
  });

  test('POST /api/locations — rejects note exceeding 500 characters', async () => {
    const res = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        latitude: 12.97,
        longitude: 77.59,
        note: 'x'.repeat(501)
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('500'));
  });

  test('POST /api/locations — rejects address exceeding 300 characters', async () => {
    const res = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        latitude: 12.97,
        longitude: 77.59,
        address: 'A'.repeat(301)
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('300'));
  });

  test('DELETE /api/locations/:id — deletes user saved pin', async () => {
    assert.ok(savedLocationId, 'savedLocationId must be set from the save test');

    const res = await request(app)
      .delete(`/api/locations/${savedLocationId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Location deleted successfully.');

    // Confirm it is gone
    const checkRes = await query('SELECT COUNT(*) AS count FROM saved_locations WHERE id = $1', [savedLocationId]);
    assert.strictEqual(parseInt(checkRes.rows[0].count, 10), 0);
  });
});
