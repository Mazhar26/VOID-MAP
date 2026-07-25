// ─── Noise Signal Markers ─────────────────────────────────────────────────────
// Renders color-coded circle markers for live noise readings on the map.

import L from 'leaflet';

// Color palette — matches the CSS bucket colors in style.css
const BUCKET_COLORS = {
  very_quiet: '#64ffb4',
  quiet: '#7ccfff',
  moderate: '#ffd764',
  loud: '#ff6b8a',
};

const BUCKET_LABELS = {
  very_quiet: '🟢 Very Quiet',
  quiet: '🔵 Quiet',
  moderate: '🟡 Moderate',
  loud: '🔴 Loud',
};

/**
 * Add color-coded circle markers to the map for a list of noise signals.
 * @param {L.Map} map
 * @param {Array<{latitude, longitude, noise_bucket, created_at}>} signals
 * @returns {L.LayerGroup} — the layer group (so caller can remove/refresh it)
 */
export function renderSignalMarkers(map, signals) {
  const layerGroup = L.layerGroup();

  for (const signal of signals) {
    const color = BUCKET_COLORS[signal.noise_bucket] || '#ffffff';
    const label = BUCKET_LABELS[signal.noise_bucket] || signal.noise_bucket;

    const marker = L.circleMarker([signal.latitude, signal.longitude], {
      radius: 10,
      fillColor: color,
      fillOpacity: 0.6,
      color: color,
      weight: 1.5,
    });

    const time = signal.created_at
      ? new Date(signal.created_at).toLocaleTimeString()
      : 'Recently';

    marker.bindPopup(`
      <div style="font-family:'Inter',sans-serif;min-width:120px;">
        <strong style="color:${color}">${label}</strong><br>
        <span style="font-size:0.8em;color:#aaa;">Measured at ${time}</span>
      </div>
    `);

    layerGroup.addLayer(marker);
  }

  layerGroup.addTo(map);
  return layerGroup;
}
