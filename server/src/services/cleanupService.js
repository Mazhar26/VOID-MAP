// ─── Signal Cleanup Service ───────────────────────────────────────────────────
// Runs every 60 seconds (configurable via CLEANUP_INTERVAL_MS).
// Deletes noise_signals rows where expires_at < NOW().
// This enforces the 30-minute TTL — same behavior as DynamoDB TTL, but explicit.
//
// Why a separate service instead of relying on a DB job?
// → We own the cleanup logic, it's visible in code, and it logs what it purges.
// → No need for pg_cron or any external scheduler.

import { query } from '../config/db.js';
import { config } from '../config/env.js';

let cleanupInterval = null;

async function runCleanup() {
  try {
    const result = await query(
      `DELETE FROM noise_signals WHERE expires_at < NOW()`
    );
    const purged = result.rowCount;
    if (purged > 0) {
      console.log(`[cleanup] Purged ${purged} expired signal(s).`);
    }
  } catch (err) {
    // Log but don't crash — this is a background job
    console.error('[cleanup] Error during purge:', err.message);
  }
}

export function startCleanupService() {
  console.log(`[cleanup] Starting — interval: ${config.CLEANUP_INTERVAL_MS}ms`);

  // Run immediately on startup to clear any stale signals from before restart
  runCleanup();

  cleanupInterval = setInterval(runCleanup, config.CLEANUP_INTERVAL_MS);
}

export function stopCleanupService() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
