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
  const userEmail = 'tester.locations@gmail.com';

  before(async () => {
    // Clear tables
    await query('DELETE FROM saved_locations');
    await query('DELETE FROM users');

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
    await query('DELETE FROM saved_locations');
    await query('DELETE FROM users');
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
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].address, 'Bangalore, India');
    assert.strictEqual(res.body[0].note, 'Peaceful reading spot');
  });

  test('DELETE /api/locations/:id — deletes user saved pin', async () => {
    // Query saved location id
    const locRes = await query('SELECT id FROM saved_locations WHERE user_id = $1', [userId]);
    const locId = locRes.rows[0].id;

    const res = await request(app)
      .delete(`/api/locations/${locId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Location deleted successfully.');

    // Confirm it is gone
    const checkRes = await query('SELECT COUNT(*) AS count FROM saved_locations WHERE id = $1', [locId]);
    assert.strictEqual(parseInt(checkRes.rows[0].count, 10), 0);
  });
});
