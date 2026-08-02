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
import { showGatedModal } from '../components/gatedModal.js';

export async function mapPage() {
  const el = document.createElement('div');
  el.className = 'map-page';

  el.innerHTML = `
    <!-- Controls overlay -->
    <div class="map-controls">
      <button class="map-back-btn" id="backBtn">← Home</button>
      <input class="map-search" id="mapSearch" type="text" placeholder="Search a place…" aria-label="Search location">
      <button class="layer-btn" id="btnLive" data-layer="live">📡 Live</button>
      <button class="layer-btn active" id="btnMine" data-layer="mine">📌 My Pins</button>
      <button class="layer-btn active" id="btnPublic" data-layer="public">⭐ Community</button>
    </div>

    <!-- Map container -->
    <div id="map"></div>

    <!-- Legend -->
    <div class="map-legend">
      <div class="legend-title">Noise Level</div>
      <div class="legend-scale">
        <span class="legend-dot bucket-very_quiet" title="Below 40 dB"></span> &lt;40 dB
        <span class="legend-dot bucket-quiet" title="40–55 dB"></span> 40–55
        <span class="legend-dot bucket-moderate" title="55–70 dB"></span> 55–70
        <span class="legend-dot bucket-loud" title="&gt;70 dB"></span> &gt;70 dB
      </div>
    </div>

    <!-- Guest Map Overlay Banner -->
    <div id="guestMapBanner" style="display:none;position:absolute;top:5rem;left:50%;transform:translateX(-50%);z-index:900;background:rgba(14,18,36,0.85);border:1px solid rgba(255,92,0,0.4);border-radius:30px;padding:0.6rem 1.4rem;backdrop-filter:blur(12px);box-shadow:0 10px 30px rgba(0,0,0,0.5);display:flex;align-items:center;gap:0.8rem;">
      <span style="font-size:0.85rem;color:var(--text-secondary);">🔒 Guest Mode — Sign in to save custom quiet spots</span>
      <button id="guestSignInBtn" class="hs-nav-cta" style="padding:0.35rem 1rem;font-size:0.78rem;">SIGN IN</button>
    </div>
  `;

  return {
    el,
    afterMount: async () => {
      const mapContainer = el.querySelector('#map');
      if (!mapContainer) return;

      const { map, userMarker } = await initMap(mapContainer);

      // Force Leaflet to recalculate its dimensions now that it is in the DOM
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      // ─── Layer state ────────────────────────────────────────────────────
      const layers = { live: null, mine: null, public: null };
      const visible = { live: false, mine: true, public: true };
      const token = localStorage.getItem('voidmap_token');

      const guestBanner = el.querySelector('#guestMapBanner');
      if (!token && guestBanner) {
        guestBanner.style.display = 'flex';
        el.querySelector('#guestSignInBtn')?.addEventListener('click', () => {
          showGatedModal('Unlock Full Map & Save Spots', 'Sign in with your Gmail address to explore public community spots and pin your own quiet sanctuaries.');
        });
      }

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
                data.quiet_score > 0.5 ? 'quiet' :
                  data.quiet_score > 0.3 ? 'moderate' : 'loud',
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
      // Remove userMarker initially until btnLive is clicked
      if (userMarker) map.removeLayer(userMarker);

      el.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const layer = btn.dataset.layer;
          visible[layer] = !visible[layer];
          btn.classList.toggle('active', visible[layer]);

          // Handle Live GPS Location Marker Toggle
          if (layer === 'live') {
            if (visible.live) {
              if (userMarker) {
                userMarker.addTo(map);
                map.flyTo(userMarker.getLatLng(), 14); // Smoothly fly to user's position
              }
              loadLiveSignals();
            } else {
              if (userMarker) map.removeLayer(userMarker);
              if (layers.live) map.removeLayer(layers.live);
            }
            return;
          }

          // Handle My Pins & Community Pins Toggles
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
          window.location.hash = token ? '#/home' : '#/';
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
