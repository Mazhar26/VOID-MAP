// ─── Authentication Routes Integration Tests ──────────────────────────────────
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../index.js';
import { query, pool } from '../config/db.js';

describe('Auth Routes API', () => {
  const testEmail = 'tester.auth@gmail.com';

  before(async () => {
    // Clear only this suite's test user
    await query('DELETE FROM users WHERE email = $1', [testEmail]);
  });

  after(async () => {
    await query('DELETE FROM users WHERE email = $1', [testEmail]);
    await pool.end();
  });

  test('POST /api/auth/signup — registers new Gmail user and issues OTP', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: testEmail });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.message);

    // Confirm user exists in DB
    const userRes = await query('SELECT * FROM users WHERE email = $1', [testEmail]);
    assert.strictEqual(userRes.rows.length, 1);
    assert.strictEqual(userRes.rows[0].email, testEmail);
  });

  test('POST /api/auth/signup — blocks non-Gmail addresses', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'hacker@yahoo.com' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Only Gmail addresses are allowed.');
  });

  test('POST /api/auth/signup — existing email returns generic message (no enumeration)', async () => {
    // Ensure user exists first
    const checkUser = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    if (checkUser.rows.length === 0) {
      // Re-create the user if parallel test cleanup removed it
      await request(app).post('/api/auth/signup').send({ email: testEmail });
    }

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: testEmail });

    // Should succeed with a generic message — must NOT return 409 or reveal "already exists"
    assert.ok(res.status >= 200 && res.status < 300, `Expected 2xx, got ${res.status}`);
    assert.ok(res.body.message);
    assert.ok(!res.body.message.includes('already exists'));
    assert.ok(!res.body.action, 'Should not include action hint that reveals account state');
  });

  test('POST /api/auth/login — non-existent email returns generic message (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody.here.999@gmail.com' });

    // Should return 200 with generic message, NOT 404
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
    assert.ok(!res.body.message.includes('not found'));
  });

  test('POST /api/auth/verify-otp — verifies valid OTP and signs JWT', async () => {
    // Get user
    const userRes = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    const userId = userRes.rows[0].id;

    // Inject a known OTP code ('123456') hash directly into the DB
    const knownOtp = '123456';
    const hash = await bcrypt.hash(knownOtp, 10);
    await query(
      `UPDATE otp_codes
       SET code_hash = $1, used = FALSE, attempt_count = 0, locked_at = NULL
       WHERE user_id = $2`,
      [hash, userId]
    );

    // Call verify-otp route
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: testEmail,
        otp: knownOtp,
        stayLoggedIn: false
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, testEmail);
  });

  test('POST /api/auth/verify-otp — rejects incorrect OTP code and increments attempts', async () => {
    // Get user and reset OTP state for this test
    const userRes = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    const userId = userRes.rows[0].id;
    await query('UPDATE otp_codes SET used = FALSE, attempt_count = 0, locked_at = NULL WHERE user_id = $1', [userId]);

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: testEmail,
        otp: '999999',
        stayLoggedIn: false
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'OTP expired or invalid.');

    // Verify attempt count was incremented
    const otpRes = await query('SELECT attempt_count FROM otp_codes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
    assert.strictEqual(otpRes.rows[0].attempt_count, 1);
  });

  test('POST /api/auth/verify-otp — locks OTP after 5 failed attempts', async () => {
    const userRes = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    const userId = userRes.rows[0].id;

    // Simulate 5 failed attempts by setting attempt_count directly in DB
    // (avoids rate limiter interference during testing)
    await query(
      `UPDATE otp_codes
       SET used = FALSE, attempt_count = 4, locked_at = NULL
       WHERE user_id = $1`,
      [userId]
    );

    // This 5th attempt should trigger the lockout
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testEmail, otp: '000000', stayLoggedIn: false });

    assert.strictEqual(res.status, 401);

    // Verify OTP is now locked
    const otpRes = await query(
      'SELECT attempt_count, locked_at FROM otp_codes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    assert.ok(otpRes.rows[0].attempt_count >= 5);
    assert.ok(otpRes.rows[0].locked_at !== null, 'OTP should be locked after 5 failed attempts');
  });

});
