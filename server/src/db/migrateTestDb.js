// ─── Test Database Migrations ────────────────────────────────────────────────
// Prepares the test database for testing:
// 1. Connect to default 'postgres' database.
// 2. CREATE DATABASE voidmap_test IF NOT EXISTS.
// 3. Connect to 'voidmap_test' database.
// 4. Run schema.sql.

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

// We use hardcoded fallback or environment DATABASE_URL_TEST
const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:voidmap123@localhost:5432/voidmap_test';

async function run() {
  // Parse base URL (without db name)
  const connectionUrl = new URL(testDbUrl);
  const dbName = connectionUrl.pathname.slice(1) || 'voidmap_test';
  
  // Set pathname to default postgres db to verify existence
  connectionUrl.pathname = '/postgres';
  
  console.log('[migrate-test] Connecting to server to check database presence...');
  const baseClient = new Client({ connectionString: connectionUrl.toString() });
  await baseClient.connect();

  try {
    const res = await baseClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rows.length === 0) {
      console.log(`[migrate-test] Creating test database "${dbName}"...`);
      await baseClient.query(`CREATE DATABASE "${dbName}"`);
    } else {
      console.log(`[migrate-test] Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('[migrate-test] Failed to create database:', err.message);
    process.exit(1);
  } finally {
    await baseClient.end();
  }

  // Connect directly to test db and load schema
  console.log(`[migrate-test] Running schema against "${dbName}"...`);
  const testClient = new Client({ connectionString: testDbUrl });
  await testClient.connect();

  try {
    const schemaPath = join(__dirname, 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf8');
    await testClient.query(sql);
    console.log('[migrate-test] ✅ Schema migration successfully completed.');
  } catch (err) {
    console.error('[migrate-test] Schema execution failed:', err.message);
    process.exit(1);
  } finally {
    await testClient.end();
  }
}

run();
