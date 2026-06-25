// ─── Database Migration Runner ───────────────────────────────────────────────
// Reads schema.sql and executes it against the database.
// Safe to run multiple times — all statements use IF NOT EXISTS.
// Usage: npm run migrate

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import { config } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

async function migrate() {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
  });

  try {
    console.log('[migrate] Connecting to database...');
    const schemaPath = join(__dirname, 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf8');

    console.log('[migrate] Running schema.sql...');
    await pool.query(sql);

    console.log('[migrate] ✅ Migration complete. All tables and indexes are ready.');
  } catch (err) {
    console.error('[migrate] ❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
