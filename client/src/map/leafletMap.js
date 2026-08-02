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

  // Google Satellite + Street labels — 100% free, no API key needed
  L.tileLayer('http://{s}.google.com/vt/lyrs=s,m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps'
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

    // Classic Red Map Location Pin Pointer Icon
    const redPinIcon = L.divIcon({
      className: 'user-red-location-pin',
      html: `
        <div style="filter:drop-shadow(0 4px 10px rgba(0,0,0,0.4));">
          <svg width="32" height="42" viewBox="0 0 384 512" fill="#d32f2f">
            <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
          </svg>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
    });

    userMarker = L.marker([lat, lon], { icon: redPinIcon }).addTo(map);
    userMarker.bindTooltip('You are here', { permanent: false });


  } catch {
    // Geolocation denied or unavailable — use default center
    map.setView(DEFAULT_CENTER, 5);
  }

  return { map, userMarker };
}
