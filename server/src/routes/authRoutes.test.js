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
    // Clear test tables
    await query('DELETE FROM otp_codes');
    await query('DELETE FROM users');
  });

  after(async () => {
    await query('DELETE FROM otp_codes');
    await query('DELETE FROM users');
    await pool.end();
  });

  test('POST /api/auth/signup — registers new Gmail user and issues OTP', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: testEmail });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, 'OTP sent to your email.');

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

  test('POST /api/auth/verify-otp — verifies valid OTP and signs JWT', async () => {
    // Get user
    const userRes = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    const userId = userRes.rows[0].id;

    // Inject a known OTP code ('123456') hash directly into the DB
    const knownOtp = '123456';
    const hash = await bcrypt.hash(knownOtp, 10);
    await query(
      `UPDATE otp_codes
       SET code_hash = $1
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

  test('POST /api/auth/verify-otp — rejects incorrect OTP code', async () => {
    // Get user and set their OTP code back to unused for this test case
    const userRes = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    const userId = userRes.rows[0].id;
    await query('UPDATE otp_codes SET used = FALSE WHERE user_id = $1', [userId]);

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: testEmail,
        otp: '999999',
        stayLoggedIn: false
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Invalid OTP. Please try again.');
  });

});
