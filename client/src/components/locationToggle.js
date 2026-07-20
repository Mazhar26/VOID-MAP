// ─── Location Toggle Component ────────────────────────────────────────────────
// Toggle between human-readable address and raw coordinates.
// Persists the user's preference in localStorage.

import { escapeHtml } from '../lib/escape.js';

const PREF_KEY = 'voidmap_location_view';

/**
 * Create a location display component.
 * @param {object} data - { address: string|null, lat: number, lon: number }
 * @returns {HTMLElement}
 */
export function createLocationToggle(data) {
  const { address, lat, lon } = data;
  const savedPref = localStorage.getItem(PREF_KEY) || 'address';

  let current = address ? savedPref : 'coords'; // fall back to coords if no address

  const el = document.createElement('div');
  el.className = 'location-toggle';

  function render() {
    const isAddress = current === 'address' && address;
    const displayText = isAddress
      ? address
      : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

    el.innerHTML = `
      <div class="location-text">
        <span>📍</span>
        <span class="location-display">${escapeHtml(displayText)}</span>
        ${address ? `
          <button
            class="toggle-btn"
            title="Switch to ${isAddress ? 'coordinates' : 'address'}"
            aria-label="Toggle location format"
          >${isAddress ? '🗺️' : '📝'}</button>
        ` : ''}
      </div>
    `;

    el.querySelector('.toggle-btn')?.addEventListener('click', () => {
      current = current === 'address' ? 'coords' : 'address';
      localStorage.setItem(PREF_KEY, current);
      render();
    });
  }

  render();
  return el;
}


