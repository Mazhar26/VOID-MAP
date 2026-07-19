// ─── User Pins Layer ──────────────────────────────────────────────────────────
// Renders saved private pins and shared public locations on the map.

import L from 'leaflet';
import { escapeHtml } from '../lib/escape.js';

/**
 * Render user's saved locations on the map.
 * Private pins → 📌 purple marker
 * Public spots → ⭐ gold marker
 *
 * @param {L.Map} map
 * @param {Array} locations - from GET /api/locations/mine or /api/locations/public
 * @param {object} options - { onDelete: fn(id), showDelete: bool }
 * @returns {L.LayerGroup}
 */
export function renderUserPins(map, locations, options = {}) {
  const layerGroup = L.layerGroup();

  for (const loc of locations) {
    const icon = loc.is_public ? '⭐' : '📌';
    const color = loc.is_public ? '#ffd764' : '#c47aff';

    const marker = L.circleMarker([loc.latitude, loc.longitude], {
      radius: 9,
      fillColor: color,
      fillOpacity: 0.85,
      color: '#ffffff',
      weight: 1.5,
    });

    let popupHtml = `
      <div style="font-family:'Inter',sans-serif;min-width:140px;">
        <div style="font-size:1.1rem;margin-bottom:4px;">${icon} ${loc.is_public ? 'Community Spot' : 'My Pin'}</div>
        ${loc.noise_level ? `<div style="font-size:0.8em;color:#aaa;">Noise: ${loc.noise_level.replace(/_/g,' ')}</div>` : ''}
        ${loc.address ? `<div style="font-size:0.75em;color:#aaa;margin-top:2px;">${escapeHtml(loc.address.slice(0, 60))}…</div>` : ''}
        ${loc.note ? `<div style="font-size:0.8em;margin-top:4px;font-style:italic;">"${escapeHtml(loc.note)}"</div>` : ''}
        ${options.showDelete ? `<button data-id="${loc.id}" class="pin-delete-btn" style="margin-top:6px;font-size:0.75em;background:rgba(255,107,138,0.15);border:1px solid #ff6b8a;color:#ff6b8a;padding:2px 8px;border-radius:6px;cursor:pointer;">Delete</button>` : ''}
      </div>
    `;

    marker.bindPopup(popupHtml);

    if (options.showDelete && options.onDelete) {
      marker.on('popupopen', () => {
        document.querySelector(`.pin-delete-btn[data-id="${loc.id}"]`)
          ?.addEventListener('click', () => options.onDelete(loc.id));
      });
    }

    layerGroup.addLayer(marker);
  }

  layerGroup.addTo(map);
  return layerGroup;
}
