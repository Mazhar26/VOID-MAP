// ─── Admin Routes Integration Tests ───────────────────────────────────────────
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../index.js';
import { query, pool } from '../config/db.js';
import { signToken } from '../services/tokenService.js';

describe('Admin Routes API', () => {
  let adminToken;
  let adminUserId;
  let normalUserId;
  const adminEmail = 'admin.tester@gmail.com';
  const normalEmail = 'normal.tester@gmail.com';

  before(async () => {
    // Clear only this suite's test users
    await query('DELETE FROM users WHERE email IN ($1, $2)', [adminEmail, normalEmail]);

    // Create admin user
    const adminRes = await query(
      `INSERT INTO users (email, is_admin) VALUES ($1, TRUE) RETURNING id`,
      [adminEmail]
    );
    adminUserId = adminRes.rows[0].id;

    // Create normal user
    const normalRes = await query(
      `INSERT INTO users (email, is_admin) VALUES ($1, FALSE) RETURNING id`,
      [normalEmail]
    );
    normalUserId = normalRes.rows[0].id;

    // Sign admin JWT (contains isAdmin: true in payload)
    adminToken = signToken({ id: adminUserId, email: adminEmail, is_admin: true });
  });

  after(async () => {
    await query('DELETE FROM users WHERE email IN ($1, $2)', [adminEmail, normalEmail]);
    await pool.end();
  });

  test('GET /api/admin/stats — accessible by admin', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok('total_users' in res.body);
  });

  test('GET /api/admin/stats — blocked for non-admin user', async () => {
    const normalToken = signToken({ id: normalUserId, email: normalEmail, is_admin: false });

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${normalToken}`);

    assert.strictEqual(res.status, 403);
  });

  test('Admin demotion — old JWT with isAdmin:true is rejected after DB demotion', async () => {
    // adminToken was signed with isAdmin: true

    // Demote admin in DB directly (simulates another admin demoting them)
    await query('UPDATE users SET is_admin = FALSE WHERE id = $1', [adminUserId]);

    // Try accessing admin route with the old token
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    // Should be rejected because requireAdmin now checks DB, not JWT
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Admin access required.');

    // Restore admin for cleanup
    await query('UPDATE users SET is_admin = TRUE WHERE id = $1', [adminUserId]);
  });
});
