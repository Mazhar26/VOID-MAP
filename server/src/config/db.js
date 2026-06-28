// ─── PostgreSQL Connection Pool ──────────────────────────────────────────────
// pg.Pool manages a set of persistent connections to PostgreSQL.
// We export a query() helper so all DB calls go through one place.
// This means if we ever need to add query logging or tracing, we do it once.

import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,               // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Fail fast if DB is unreachable
});

// Log pool errors — these would otherwise be silent
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a parameterized SQL query.
 * @param {string} text - SQL string with $1, $2 placeholders
 * @param {Array} params - Parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.NODE_ENV === 'development') {
    console.log(`[DB] ${duration}ms — ${text.slice(0, 80)}`);
  }

  return result;
}

// Export pool for cases where we need a client (transactions)
export { pool };
