// ─── Home Page — Measure Silence ─────────────────────────────────────────────
// Direct migration of the original index.html measurement flow.
// Uses the extracted lib modules: microphone, classify, geohash, geocode.

import { encodeGeohash } from '../lib/geohash.js';
import { classifyNoise } from '../lib/classify.js';
import { reverseGeocode } from '../lib/geocode.js';
import { getUserLocation, captureAudio } from '../lib/microphone.js';
import { escapeHtml } from '../lib/escape.js';
import { api } from '../api.js';
import { createLocationToggle } from '../components/locationToggle.js';
import { toggleSanctuarySoundscape } from '../lib/soundscape.js';
import { unlockBadge, getEarnedBadges } from '../lib/badges.js';

const GEOHASH_PRECISION = 5;



function formatBucket(bucket) {
  return bucket.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getNavLinks() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('voidmap_user')); } catch { return null; } })();
  const token = localStorage.getItem('voidmap_token');

  return `
    <a href="#/map">🗺️ Map</a>
    ${token ? `<a href="#/login" id="logoutLink">Sign out</a>` : `<a href="#/login">Sign in</a>`}
    ${user?.isAdmin ? `<a href="#/admin">Admin</a>` : ''}
  `;
}

export async function homePage() {
  const el = document.createElement('div');
  el.className = 'container brand-hero';
  el.setAttribute('role', 'main');

  el.innerHTML = `
    <!-- Telemetry Pill Badge -->
    <div class="zap-badge">
      <span class="pulse-dot"></span> ⚡ LIVE ACOUSTIC TELEMETRY
    </div>

    <div class="logo">
      <div class="logo-icon" aria-hidden="true">🌙</div>
      <h1 class="hero-title">VOID-MAP</h1>
    </div>
    <p class="subtitle">Privacy-first mapping of quiet places using ephemeral data</p>

    <button class="measure-btn zap-btn" id="measureBtn" aria-label="Measure ambient silence level">
      <span class="btn-text">MEASURE SILENCE</span>
    </button>

    <!-- Interactive Web Audio Ambient Soundscape Generator -->
    <div style="margin-top:1rem;text-align:center;">
      <button id="soundscapeBtn" class="btn-mini" style="padding:0.5rem 1.2rem;font-weight:600;border-radius:20px;background:rgba(255,92,0,0.12);border:1px solid rgba(255,92,0,0.4);color:#ff8c00;cursor:pointer;transition:all 0.3s ease;">
        🎧 Listen to Sanctuary Ambient Audio
      </button>
    </div>

    <!-- User Earned Badges Row -->
    <div id="userBadgesRow" style="margin-top:1.2rem;display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap;"></div>

    <div class="status-area" id="statusArea" role="status" aria-live="polite"></div>

    <div class="footer" aria-label="Navigation">
      ${getNavLinks()}
    </div>
    <div class="copyright">© 2077 VOID-MAP Inc.</div>
  `;

  // ─── Logout handler ───────────────────────────────────────────────────────
  el.querySelector('#logoutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('voidmap_token');
    localStorage.removeItem('voidmap_user');
    window.location.hash = '#/login';
  });

  // ─── Soundscape Audio & Badges Setup ─────────────────────────────────────
  let isPlayingSoundscape = false;
  const soundscapeBtn = el.querySelector('#soundscapeBtn');
  soundscapeBtn?.addEventListener('click', () => {
    isPlayingSoundscape = toggleSanctuarySoundscape(!isPlayingSoundscape);
    soundscapeBtn.textContent = isPlayingSoundscape 
      ? '⏸️ Pause Sanctuary Audio' 
      : '🎧 Listen to Sanctuary Ambient Audio';
    soundscapeBtn.style.background = isPlayingSoundscape ? 'rgba(181,255,54,0.18)' : 'rgba(255,92,0,0.12)';
    soundscapeBtn.style.color = isPlayingSoundscape ? '#b5ff36' : '#ff8c00';
  });

  function renderBadges() {
    const badgesRow = el.querySelector('#userBadgesRow');
    if (!badgesRow) return;
    const earned = getEarnedBadges();
    if (earned.length === 0) {
      badgesRow.innerHTML = `<span style="font-size:0.75rem;color:var(--text-muted);">Measure silence to unlock explorer badges</span>`;
      return;
    }
    badgesRow.innerHTML = earned.map(b => `
      <span title="${escapeHtml(b.desc)}" style="padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:600;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--text-primary);display:inline-flex;align-items:center;gap:0.3rem;">
        ${b.icon} ${escapeHtml(b.title)}
      </span>
    `).join('');
  }
  renderBadges();

  // ─── Measure button ───────────────────────────────────────────────────────
  const measureBtn = el.querySelector('#measureBtn');
  const statusArea = el.querySelector('#statusArea');

  function setStatus(html, className = '') {
    statusArea.innerHTML = `<div class="status-msg ${className}">${html}</div>`;
  }

  function setMeasuring(active) {
    measureBtn.disabled = active;
    measureBtn.querySelector('.btn-text').textContent = active ? 'Listening…' : 'Measure Silence';
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

    // 1. Get location
    let geo, lat, lon;
    try {
      const loc = await getUserLocation(encodeGeohash, GEOHASH_PRECISION);
      geo = loc.geo; lat = loc.lat; lon = loc.lon;
    } catch (locErr) {
      setStatus(`⚠️ ${escapeHtml(locErr.message)}`, 'error');
      setMeasuring(false);
      return;
    }

    // 2. Reverse geocode (non-blocking)
    const addressPromise = reverseGeocode(lat, lon);

    // 3. Show visualizer
    setStatus(`Measuring ambient sound…${buildVisualizer()}`, 'measuring');

    // 4. Capture audio
    let avgRms, avgVariation;
    try {
      const result = await captureAudio(
        (rms) => updateVisualizer(rms),
        (progress) => {
          const bar = el.querySelector('#progressBar');
          if (bar) bar.style.width = `${progress * 100}%`;
        }
      );
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

    // 5. Classify & Award Badges
    const bucket = classifyNoise(avgRms, avgVariation);
    const address = await addressPromise;

    unlockBadge('first_measure');
    if (bucket === 'very_quiet') unlockBadge('sanctuary_seeker');
    const hr = new Date().getHours();
    if (hr >= 22 || hr <= 5) unlockBadge('night_owl');
    renderBadges();

    // 6. Show result card
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.innerHTML = `
      <div class="bucket-name bucket-${escapeHtml(bucket)}">${escapeHtml(formatBucket(bucket))}</div>
    `;

    // Append location toggle
    const toggle = createLocationToggle({ address, lat, lon });
    resultCard.appendChild(toggle);

    // Auth pin helper
    const token = localStorage.getItem('voidmap_token');
    if (token) {
      const pinBtn = document.createElement('button');
      pinBtn.className = 'btn-primary';
      pinBtn.style.marginTop = '1rem';
      pinBtn.style.width = '100%';
      pinBtn.textContent = '📌 Pin Location';
      pinBtn.addEventListener('click', () => {
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
    } else {
      const loginTip = document.createElement('div');
      loginTip.style.fontSize = '0.8rem';
      loginTip.style.color = 'var(--text-muted)';
      loginTip.style.marginTop = '1rem';
      loginTip.style.textAlign = 'center';
      loginTip.innerHTML = `<a href="#/login" style="color:var(--accent);text-decoration:underline;">Sign in</a> to pin this location on your map`;
      resultCard.appendChild(loginTip);
    }

    statusArea.innerHTML = '';
    statusArea.appendChild(resultCard);

    // 7. Load recommendations list
    import('../components/recommendList.js').then(async ({ createRecommendList }) => {
      const recList = await createRecommendList(bucket);
      statusArea.appendChild(recList);
    });

    // 8. Send to API
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
