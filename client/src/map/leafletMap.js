// ─── Leaflet Map Initializer ─────────────────────────────────────────────────
// Initializes a Leaflet map centered on the user's GPS location.
// Falls back to a default location if geolocation is denied.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's broken default icon paths when bundled with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India center fallback
const DEFAULT_ZOOM = 13;

/**
 * Initialize a Leaflet map inside the given container element.
 * @param {HTMLElement} container
 * @returns {Promise<{ map: L.Map, userMarker: L.Marker|null }>}
 */
export async function initMap(container) {
  const map = L.map(container, {
    zoomControl: true,
    attributionControl: true,
  });

  // OpenStreetMap tile layer — free, no API key needed
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Try to center on user's location
  let userMarker = null;

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      });
    });

    const { latitude: lat, longitude: lon } = pos.coords;
    map.setView([lat, lon], DEFAULT_ZOOM);

    // Blue pulsing dot for user's location
    userMarker = L.circleMarker([lat, lon], {
      radius: 8,
      fillColor: '#7ccfff',
      fillOpacity: 0.9,
      color: '#ffffff',
      weight: 2,
    }).addTo(map);

    userMarker.bindTooltip('You are here', { permanent: false });

  } catch {
    // Geolocation denied or unavailable — use default center
    map.setView(DEFAULT_CENTER, 5);
  }

  return { map, userMarker };
}
