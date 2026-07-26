// ─── Home Page — VOID 01 Reference Design ──────────────────────────────────────
// Replicates the Awwwards Bulma No. 19 reference layout exactly for VOID-MAP.

import { navigateTo } from '../router.js';

export function homePage() {
  const el = document.createElement('div');
  el.className = 'home-outer-frame';
  el.setAttribute('role', 'main');

  const token = localStorage.getItem('voidmap_token');

  el.innerHTML = `
    <div class="home-inner-card">
      <!-- Top Navigation Bar -->
      <header class="home-nav-header">
        <div class="home-logo">VOID-MAP</div>

        <div class="home-nav-right">
          <nav class="home-nav-pill" aria-label="Main Navigation">
            <a href="#/" class="home-nav-link active">Home</a>
            <a href="#/map" class="home-nav-link">Map</a>
            <!-- TODO: Add Sanctuary page route -->
            <a href="#/" class="home-nav-link" id="sanctuaryPlaceholder">Sanctuary</a>
          </nav>

          <a href="${token ? '#/map' : '#/login'}" class="home-measure-btn" id="measureCta">
            MEASURE
          </a>
        </div>
      </header>

      <!-- Side Navigation Chevrons -->
      <button class="home-chevron home-chevron-left" aria-label="Previous mode" id="prevModeBtn">‹</button>
      <button class="home-chevron home-chevron-right" aria-label="Next mode" id="nextModeBtn">›</button>

      <!-- Hero Section (Center Stage) -->
      <div class="home-hero-stage">
        <!-- Massive Black Typography -->
        <h1 class="home-hero-bg-text">VOID 01</h1>

        <!-- Floating Orange Pulse Dot -->
        <div class="home-pulse-dot" aria-hidden="true"></div>

        <!-- 3D Acoustic Sphere Asset -->
        <!-- Replace with: <img src="/assets/hero-sphere.png"> when asset ready -->
        <div class="home-hero-sphere" aria-hidden="true"></div>
      </div>

      <!-- Bottom-Right Caption -->
      <div class="home-bottom-caption">VOID-MAP · SANCTUARY 01</div>
    </div>
  `;

  // Event Handlers
  el.querySelector('#prevModeBtn')?.addEventListener('click', () => {
    console.log('cycle mode');
  });

  el.querySelector('#nextModeBtn')?.addEventListener('click', () => {
    console.log('cycle mode');
  });

  el.querySelector('#sanctuaryPlaceholder')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('cycle mode');
  });

  return el;
}
