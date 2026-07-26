// ─── Home Page — Handshake AI Product Landing & Guest Free Trial Flow ─────────
// Multi-page landing page featuring kinetic hero, bento box product grid,
// 1-time free guest trial measurement, and gated conversion modals.

import { encodeGeohash } from '../lib/geohash.js';
import { classifyNoise } from '../lib/classify.js';
import { reverseGeocode } from '../lib/geocode.js';
import { getUserLocation, captureAudio } from '../lib/microphone.js';
import { escapeHtml } from '../lib/escape.js';
import { api } from '../api.js';
import { createLocationToggle } from '../components/locationToggle.js';
import { toggleSanctuarySoundscape } from '../lib/soundscape.js';
import { unlockBadge, getEarnedBadges } from '../lib/badges.js';
import { showGatedModal } from '../components/gatedModal.js';

const GEOHASH_PRECISION = 5;

function formatBucket(bucket) {
  return bucket.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getHeaderNav() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('voidmap_user')); } catch { return null; } })();
  const token = localStorage.getItem('voidmap_token');

  return `
    <nav class="hs-nav" aria-label="Main Navigation">
      <a href="#/" class="hs-brand">
        <span style="font-size:1.4rem;">🌙</span> VOID-MAP
      </a>
      <div class="hs-nav-links">
        <a href="#/map" class="hs-nav-link">🗺️ Map</a>
        ${user?.isAdmin ? `<a href="#/admin" class="hs-nav-link">📊 Admin</a>` : ''}
        ${token 
          ? `<a href="#/login" id="logoutNavBtn" class="hs-nav-link" style="color:var(--error);">Sign out</a>`
          : `<a href="#/login" class="hs-nav-cta">SIGN IN</a>`}
      </div>
    </nav>
  `;
}

export async function homePage() {
  const el = document.createElement('div');
  el.className = 'container';
  el.style.maxWidth = '920px';
  el.setAttribute('role', 'main');

  const token = localStorage.getItem('voidmap_token');

  el.innerHTML = `
    ${getHeaderNav()}

    <!-- Handshake AI Kinetic Hero -->
    <div class="hs-hero">
      <div class="hs-hero-badge">
        <span class="pulse-dot"></span> ⚡ ACOUSTIC SANCTUARY RADAR
      </div>
      <h1 class="hs-hero-title">Discover Tranquility in Digital Noise</h1>
      <p class="hs-hero-subtitle">
        Privacy-first spatial soundscape mapping. Measure ambient decibels, find quiet places nearby, and experience real-time sanctuary audio.
      </p>

      <div class="hs-hero-actions">
        <button class="measure-btn zap-btn" id="measureBtn" aria-label="Measure ambient silence level">
          <span class="btn-text">🔥 TRY 1-TIME FREE MEASUREMENT</span>
        </button>
        <button id="soundscapeBtn" class="btn-mini" style="padding:1.1rem 1.8rem;font-weight:700;border-radius:40px;background:rgba(255,92,0,0.12);border:1px solid rgba(255,92,0,0.4);color:#ff8c00;cursor:pointer;transition:all 0.3s ease;">
          🎧 Listen to Sanctuary Audio
        </button>
      </div>

      <!-- User Earned Badges Row -->
      <div id="userBadgesRow" style="margin-top:1.5rem;display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap;"></div>
    </div>

    <!-- Live Status & Trial Result Area -->
    <div class="status-area" id="statusArea" role="status" aria-live="polite" style="max-width:540px;margin:0 auto 3rem;"></div>

    <!-- Handshake AI Bento Box Feature Showcase -->
    <div class="hs-bento-grid">
      <div class="hs-bento-card">
        <div class="hs-bento-icon">🛡️</div>
        <h3 class="hs-bento-title">Ephemeral Privacy</h3>
        <p class="hs-bento-desc">Sound readings automatically purge every 30 minutes. Zero persistent audio buffers or tracking.</p>
      </div>
      <div class="hs-bento-card">
        <div class="hs-bento-icon">🎯</div>
        <h3 class="hs-bento-title">Sub-Geohash Accuracy</h3>
        <p class="hs-bento-desc">High-resolution spatial indexing maps quiet sanctuaries with sub-kilometer precision.</p>
      </div>
      <div class="hs-bento-card">
        <div class="hs-bento-icon">🌐</div>
        <h3 class="hs-bento-title">Crowdsourced Radar</h3>
        <p class="hs-bento-desc">Explore public community spots or save private quiet zones visible only to you.</p>
      </div>
    </div>

    <div class="copyright" style="margin-top:3rem;">© 2077 VOID-MAP Inc. • Handshake UI Architecture</div>
  `;

  // Logout handler
  el.querySelector('#logoutNavBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('voidmap_token');
    localStorage.removeItem('voidmap_user');
    window.location.hash = '#/login';
  });

  // Soundscape audio player
  let isPlayingSoundscape = false;
  const soundscapeBtn = el.querySelector('#soundscapeBtn');
  soundscapeBtn?.addEventListener('click', () => {
    isPlayingSoundscape = toggleSanctuarySoundscape(!isPlayingSoundscape);
    soundscapeBtn.textContent = isPlayingSoundscape 
      ? '⏸️ Pause Sanctuary Audio' 
      : '🎧 Listen to Sanctuary Audio';
    soundscapeBtn.style.background = isPlayingSoundscape ? 'rgba(181,255,54,0.18)' : 'rgba(255,92,0,0.12)';
    soundscapeBtn.style.color = isPlayingSoundscape ? '#b5ff36' : '#ff8c00';
  });

  function renderBadges() {
    const badgesRow = el.querySelector('#userBadgesRow');
    if (!badgesRow) return;
    const earned = getEarnedBadges();
    if (earned.length === 0) {
      badgesRow.innerHTML = `<span style="font-size:0.78rem;color:var(--text-muted);">Measure silence to unlock explorer badges</span>`;
      return;
    }
    badgesRow.innerHTML = earned.map(b => `
      <span title="${escapeHtml(b.desc)}" style="padding:0.3rem 0.85rem;border-radius:20px;font-size:0.78rem;font-weight:600;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--text-primary);display:inline-flex;align-items:center;gap:0.35rem;">
        ${b.icon} ${escapeHtml(b.title)}
      </span>
    `).join('');
  }
  renderBadges();

  // Measure button & Guest Trial flow
  const measureBtn = el.querySelector('#measureBtn');
  const statusArea = el.querySelector('#statusArea');

  function setStatus(html, className = '') {
    statusArea.innerHTML = `<div class="status-msg ${className}">${html}</div>`;
  }

  function setMeasuring(active) {
    measureBtn.disabled = active;
    measureBtn.querySelector('.btn-text').textContent = active ? 'Listening…' : '🔥 TRY 1-TIME FREE MEASUREMENT';
  }

  function buildVisualizer() {
    return `<div class="visualizer" id="visualizer" aria-hidden="true">
      ${Array.from({ length: 20 }, () => '<div class="bar" style="height:4px"></div>').join('')}
    </div>
    <div class="progress-wrap"><div class="progress-bar" id="progressBar"></div></div>`;
  }

  function updateVisualizer(rms) {
    const viz = el.querySelector('#visualizer');
    if (!viz) return;
    for (const bar of viz.children) {
      bar.style.height = Math.max(3, Math.min(28, rms * 800 + Math.random() * 10)) + 'px';
    }
  }

  measureBtn.addEventListener('click', async () => {
    setMeasuring(true);
    setStatus('📍 Locating you…', 'measuring');

    let lat, lon;
    try {
      const loc = await getUserLocation();
      lat = loc.lat;
      lon = loc.lon;
    } catch (locErr) {
      setStatus(`📍 ${escapeHtml(locErr.message)}`, 'error');
      setMeasuring(false);
      return;
    }

    const geo = encodeGeohash(lat, lon, GEOHASH_PRECISION);
    const addressPromise = reverseGeocode(lat, lon);

    statusArea.innerHTML = `
      <div class="status-msg measuring">
        🎤 Listening… Measuring ambient sound
        ${buildVisualizer()}
      </div>
    `;

    const progressBar = el.querySelector('#progressBar');
    let avgRms, avgVariation;

    try {
      const result = await captureAudio({
        durationMs: 5000,
        intervalMs: 100,
        onProgress: ({ elapsedMs, totalMs, rms }) => {
          if (progressBar) progressBar.style.width = `${(elapsedMs / totalMs) * 100}%`;
          updateVisualizer(rms);
        },
      });
      avgRms = result.avgRms;
      avgVariation = result.avgVariation;
    } catch (micErr) {
      const msg = micErr.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow mic permissions and try again.'
        : 'Could not access microphone. Please check your device settings.';
      setStatus(`🎤 ${escapeHtml(msg)}`, 'error');
      setMeasuring(false);
      return;
    }

    // Classify & unlock badges
    const bucket = classifyNoise(avgRms, avgVariation);
    const address = await addressPromise;

    unlockBadge('first_measure');
    if (bucket === 'very_quiet') unlockBadge('sanctuary_seeker');
    const hr = new Date().getHours();
    if (hr >= 22 || hr <= 5) unlockBadge('night_owl');
    renderBadges();

    // Result card
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.innerHTML = `
      <div class="bucket-name bucket-${escapeHtml(bucket)}">${escapeHtml(formatBucket(bucket))}</div>
    `;

    const toggle = createLocationToggle({ address, lat, lon });
    resultCard.appendChild(toggle);

    // Gated Pin Button for guests / authenticated users
    const pinBtn = document.createElement('button');
    pinBtn.className = 'btn-primary';
    pinBtn.style.marginTop = '1rem';
    pinBtn.style.width = '100%';
    pinBtn.textContent = token ? '📌 Pin Location' : '🔒 Sign in to Pin Location';
    pinBtn.addEventListener('click', () => {
      if (!token) {
        showGatedModal('Unlock Location Pinning', 'Sign in with your Gmail address to save custom quiet spots on your personal map.');
        return;
      }
      import('../components/pinModal.js').then(({ showPinModal }) => {
        showPinModal({ lat, lon, address, noiseLevel: bucket }, () => {
          pinBtn.disabled = true;
          pinBtn.textContent = '✅ Pinned!';
          pinBtn.style.background = 'rgba(100, 255, 180, 0.2)';
          pinBtn.style.color = '#64ffb4';
          pinBtn.style.border = '1px solid #64ffb4';
        });
      });
    });
    resultCard.appendChild(pinBtn);

    statusArea.innerHTML = '';
    statusArea.appendChild(resultCard);

    // Activity recommendations
    import('../components/recommendList.js').then(async ({ createRecommendList }) => {
      const recList = await createRecommendList(bucket);
      statusArea.appendChild(recList);
    });

    // Send anonymous signal
    try {
      await api.postSignal({
        ts: Math.floor(Date.now() / 1000),
        geo,
        noise_bucket: bucket,
        latitude: lat,
        longitude: lon,
        rms_value: avgRms,
      });

      const badge = document.createElement('div');
      badge.className = 'sent-badge';
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Sent anonymously
      `;
      statusArea.appendChild(badge);
    } catch (apiErr) {
      const errDiv = document.createElement('div');
      errDiv.className = 'status-msg error';
      errDiv.style.marginTop = '0.6rem';
      errDiv.textContent = `⚠️ Could not send data — ${apiErr.message}`;
      statusArea.appendChild(errDiv);
    }

    setMeasuring(false);
  });

  return el;
}
