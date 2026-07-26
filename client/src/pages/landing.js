// ─── Landing Page — Awwwards Bulma No.19 Style with Pure CSS Black Hole ───────
// Public marketing landing page for VOID-MAP (#/)

import { navigateTo } from '../router.js';

export function landingPage() {
  const el = document.createElement('div');
  el.className = 'landing-outer-frame';
  el.setAttribute('role', 'main');

  el.innerHTML = `
    <div class="landing-inner-card">
      <!-- Top Navigation Bar -->
      <header class="landing-nav-header">
        <div class="landing-logo">VOID-MAP</div>

        <div class="landing-nav-right">
          <nav class="landing-nav-pill" aria-label="Main Navigation">
            <a href="#/" class="landing-nav-link active">Home</a>
            <a href="#/map" class="landing-nav-link">Map</a>
            <!-- TODO: Add Sanctuary page route -->
            <a href="#/" class="landing-nav-link" id="sanctuaryPlaceholder">Sanctuary</a>
          </nav>

          <a href="#/try" class="landing-try-btn" id="tryNowBtn">
            TRY NOW
          </a>
        </div>
      </header>

      <!-- Side Navigation Chevrons -->
      <button class="landing-chevron landing-chevron-left" aria-label="Previous mode" id="prevModeBtn">‹</button>
      <button class="landing-chevron landing-chevron-right" aria-label="Next mode" id="nextModeBtn">›</button>

      <!-- Hero Section (Center Stage) -->
      <div class="landing-hero-stage">
        <!-- Massive Black Typography -->
        <h1 class="landing-hero-bg-text">VOID-MAP</h1>

        <!-- Floating Orange Pulse Dot -->
        <div class="landing-pulse-dot" aria-hidden="true"></div>

        <!-- Pure CSS Black Hole Visual -->
        <div class="landing-black-hole" aria-hidden="true"></div>
      </div>

      <!-- Bottom-Right Caption -->
      <div class="landing-bottom-caption">VOID-MAP · SANCTUARY 01</div>
    </div>
  `;

  // Event Listeners
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
