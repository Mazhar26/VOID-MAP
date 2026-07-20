// ─── Recommendations List Component ───────────────────────────────────────────
// Fetches and displays recommended activities for the ambient noise level.
// Appends underneath the noise measurement card.

import { api } from '../api.js';
import { escapeHtml } from '../lib/escape.js';

/**
 * Creates and loads the activity recommendations section.
 * @param {'very_quiet'|'quiet'|'moderate'|'loud'} noiseLevel
 * @returns {Promise<HTMLElement>}
 */
export async function createRecommendList(noiseLevel) {
  const container = document.createElement('div');
  container.className = 'recommend-section';
  container.innerHTML = `
    <div class="recommend-title">Suggested Activities</div>
    <div class="recommend-grid" id="recommendGrid">
      <div style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1rem;">Finding suggestions…</div>
    </div>
  `;

  // Fetch in background
  try {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    
    const list = await api.getRecommendations(noiseLevel, timeOfDay);
    const grid = container.querySelector('#recommendGrid');
    
    if (!list || list.length === 0) {
      grid.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1.2rem;">No current recommendations.</div>`;
      return container;
    }

    grid.innerHTML = list.map(item => `
      <div class="recommend-card">
        <div class="recommend-icon" aria-hidden="true">${item.icon}</div>
        <div class="recommend-info">
          <div class="recommend-name">${escapeHtml(item.activity)}</div>
          <div class="recommend-desc">${escapeHtml(item.desc)}</div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    const grid = container.querySelector('#recommendGrid');
    if (grid) {
      grid.innerHTML = `
        <div style="font-size:0.8rem;color:var(--error);text-align:center;padding:1rem;">
          ⚠️ Could not load activities — ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  return container;
}


