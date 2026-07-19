// ─── Map Page ─────────────────────────────────────────────────────────────────
// Full-screen interactive map with:
// - Live noise signal markers (color-coded by bucket)
// - User's saved private pins
// - Community shared spots
// - Layer toggles
// - Nominatim search bar

import '../map/map.css';
import { initMap } from '../map/leafletMap.js';
import { renderSignalMarkers } from '../map/markers.js';
import { renderUserPins } from '../map/userPins.js';
import { encodeGeohash } from '../lib/geohash.js';
import { forwardGeocode } from '../lib/geocode.js';
import { api } from '../api.js';

export async function mapPage() {
  const el = document.createElement('div');
  el.className = 'map-page';

  el.innerHTML = `
    <!-- Controls overlay -->
    <div class="map-controls">
      <button class="map-back-btn" id="backBtn">← Home</button>
      <input class="map-search" id="mapSearch" type="text" placeholder="Search a place…" aria-label="Search location">
      <button class="layer-btn active" id="btnLive" data-layer="live">📡 Live</button>
      <button class="layer-btn active" id="btnMine" data-layer="mine">📌 My Pins</button>
      <button class="layer-btn active" id="btnPublic" data-layer="public">⭐ Community</button>
    </div>

    <!-- Map container -->
    <div id="map"></div>

    <!-- Legend -->
    <div class="map-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#64ffb4"></div> Very Quiet</div>
      <div class="legend-item"><div class="legend-dot" style="background:#7ccfff"></div> Quiet</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ffd764"></div> Moderate</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ff6b8a"></div> Loud</div>
    </div>
  `;

  return {
    el,
    afterMount: async () => {
      const mapContainer = el.querySelector('#map');
      if (!mapContainer) return;

      const { map } = await initMap(mapContainer);

      // Force Leaflet to recalculate its dimensions now that it is in the DOM
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      // ─── Layer state ────────────────────────────────────────────────────
      const layers = { live: null, mine: null, public: null };
      const visible = { live: true, mine: true, public: true };
      const token = localStorage.getItem('voidmap_token');

      // ─── Load live signals ──────────────────────────────────────────────
      async function loadLiveSignals() {
        if (layers.live) map.removeLayer(layers.live);
        try {
          const center = map.getCenter();
          const geo = encodeGeohash(center.lat, center.lng, 3);
          const data = await api.getQuietScore(geo);

          if (data.quiet_score > 0) {
            layers.live = renderSignalMarkers(map, [{
              latitude: center.lat,
              longitude: center.lng,
              noise_bucket: data.quiet_score > 0.75 ? 'very_quiet' :
                            data.quiet_score > 0.5  ? 'quiet' :
                            data.quiet_score > 0.3  ? 'moderate' : 'loud',
              created_at: new Date().toISOString(),
            }]);
          }
        } catch (err) {
          console.error('[map] Failed to load live signals:', err);
        }
      }

      // ─── Load user pins ─────────────────────────────────────────────────
      async function loadMyPins() {
        if (!token) return;
        if (layers.mine) map.removeLayer(layers.mine);
        try {
          const locations = await api.getMyLocations();
          layers.mine = renderUserPins(map, locations, {
            showDelete: true,
            onDelete: async (id) => {
              try {
                await api.deleteLocation(id);
                loadMyPins();
              } catch (err) {
                console.error('[map] Failed to delete location:', err);
              }
            },
          });
        } catch (err) {
          console.error('[map] Failed to load user pins:', err);
        }
      }

      // ─── Load public pins ───────────────────────────────────────────────
      async function loadPublicPins() {
        if (layers.public) map.removeLayer(layers.public);
        try {
          const locations = await api.getPublicLocations();
          layers.public = renderUserPins(map, locations, { showDelete: false });
        } catch (err) {
          console.error('[map] Failed to load public pins:', err);
        }
      }

      // Load initial layers
      await Promise.allSettled([loadLiveSignals(), loadMyPins(), loadPublicPins()]);

      // ─── Layer toggles ──────────────────────────────────────────────────
      el.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const layer = btn.dataset.layer;
          visible[layer] = !visible[layer];
          btn.classList.toggle('active', visible[layer]);
          if (layers[layer]) {
            if (visible[layer]) {
              layers[layer].addTo(map);
            } else {
              map.removeLayer(layers[layer]);
            }
          }
        });
      });

      // ─── Search bar ─────────────────────────────────────────────────────
      const searchInput = el.querySelector('#mapSearch');

      if (searchInput) {
        searchInput.addEventListener('keydown', async (e) => {
          if (e.key !== 'Enter') return;
          const queryText = searchInput.value.trim();
          if (!queryText) return;

          searchInput.placeholder = 'Searching…';
          const result = await forwardGeocode(queryText);
          searchInput.placeholder = 'Search a place…';

          if (result) {
            map.setView([result.lat, result.lon], 14);
            searchInput.value = '';
          } else {
            searchInput.value = '';
            searchInput.placeholder = 'Place not found. Try again.';
            setTimeout(() => {
              searchInput.placeholder = 'Search a place…';
            }, 2000);
          }
        });
      }

      // ─── Back button ────────────────────────────────────────────────────
      const backBtn = el.querySelector('#backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          window.location.hash = '#/';
        });
      }

      // Refresh signals when map moves to a new area
      let liveSignalsTimeout;
      map.on('moveend', () => {
        clearTimeout(liveSignalsTimeout);
        liveSignalsTimeout = setTimeout(loadLiveSignals, 500);
      });
    }
  };
}
