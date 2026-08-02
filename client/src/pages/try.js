// ─── Guest Demo Page — Real-Time dB Meter (#/try) ──────────────────────────────
// Basic dB meter with visual feedback for unauthenticated users (5-second auto-stop trial with live countdown & dismissable banner)

import { captureAudio } from '../lib/microphone.js';
import { classifyNoise } from '../lib/classify.js';

export function tryPage() {
  const el = document.createElement('div');
  el.className = 'try-outer-frame';
  el.setAttribute('role', 'main');

  el.innerHTML = `
    <div class="try-inner-card">
      <!-- Top Navigation Bar -->
      <header class="try-nav-header">
        <div class="try-logo">VOID-MAP</div>

        <div class="try-nav-right">
          <nav class="try-nav-pill" aria-label="Main Navigation">
            <a href="#/" class="try-nav-link">Home</a>
            <a href="#/map" class="try-nav-link">Map</a>
            <!-- TODO: Add Sanctuary page route -->
            <a href="#/" class="try-nav-link" id="sanctuaryPlaceholder">Sanctuary</a>
          </nav>

          <a href="#/login" class="try-signin-btn">
            SIGN IN
          </a>
        </div>
      </header>

      <!-- Center Stage Content -->
      <div class="try-center-stage">
        <h1 class="try-title">LIVE NOISE MONITOR</h1>

        <!-- Decibel Readout -->
        <div class="try-db-readout" id="dbReadout">-- dB</div>

        <!-- Pulsing Reactive Visual Circle -->
        <div class="try-pulse-circle" id="pulseCircle" aria-hidden="true"></div>

        <!-- Classification Label -->
        <div class="try-classification-label" id="classLabel">READY</div>

        <!-- Start / Stop Listening Button -->
        <button class="try-toggle-btn" id="startStopBtn">
          START LISTENING
        </button>

        <!-- Error Message Container (hidden by default) -->
        <p class="try-error-msg" id="errorMsg" style="display:none;"></p>
      </div>

      <!-- Scrollable 3-Card Acoustic Recommendation Section -->
      <section class="try-recs-section" id="gatedRecs" style="display:none;">
        <div class="recs-header">
          <div class="jp-key-title">音響環境のアクティビティ推奨</div>
          <h2 class="en-key-title">ACOUSTIC ENVIRONMENT RECOMMENDATIONS</h2>
        </div>

        <div class="try-gated-wrapper">
          <!-- 3 Grid Cards Matching Home/Landing Page Layout -->
          <div class="try-keypoints-grid">
            <!-- Card 001 -->
            <div class="try-keypoint-card">
              <div>
                <div class="card-num">001</div>
                <div class="card-db-badge">25–35 dB • QUIET</div>
                <h3 class="card-title">DEEP FOCUS & MEDITATION</h3>
              </div>
              <p class="card-desc">Ideal for intense reading, coding, meditation, and quiet studying without acoustic distraction.</p>
            </div>

            <!-- Card 002 -->
            <div class="try-keypoint-card">
              <div>
                <div class="card-num">002</div>
                <div class="card-db-badge">35–50 dB • MODERATE</div>
                <h3 class="card-title">CASUAL WORK & CONVERSATION</h3>
              </div>
              <p class="card-desc">Suitable for coffee breaks, casual group discussions, and light reading in ambient environments.</p>
            </div>

            <!-- Card 003 -->
            <div class="try-keypoint-card">
              <div>
                <div class="card-num">003</div>
                <div class="card-db-badge">50+ dB • LOUD</div>
                <h3 class="card-title">SOUNDSCAPE & NOISE MASKING</h3>
              </div>
              <p class="card-desc">High background noise detected. Headphones or VOID-MAP rain soundscapes recommended for focus.</p>
            </div>
          </div>

          <!-- Blurred Lock Overlay -->
          <div class="try-gated-lock-overlay">
            <div class="lock-icon">🔒</div>
            <h4 class="lock-title">RECOMMENDATIONS & SOUND MAPS LOCKED</h4>
            <p class="lock-text">Sign in to unlock personalized decibel recommendations, exact quiet map locations, and community quiet spots.</p>
            <a href="#/login" class="lock-signup-btn">SIGN UP TO UNLOCK →</a>
          </div>
        </div>
      </section>

      <!-- Bottom CTA Banner (Dismissable) -->
      <div class="try-bottom-cta-banner" id="ctaBanner">
        <span class="try-cta-text">
          Sign in to unlock the full VOID-MAP experience — map, save quiet spots, and share.
        </span>
        <div style="display:flex;align-items:center;gap:12px;">
          <a href="#/login" class="try-cta-btn">
            SIGN IN →
          </a>
          <button id="closeBannerBtn" aria-label="Dismiss banner" style="background:none;border:none;color:#ffffff;font-size:18px;cursor:pointer;padding:4px 8px;line-height:1;opacity:0.7;transition:opacity 0.2s ease;">
            ✕
          </button>
        </div>
      </div>
    </div>
  `;

  // ─── State & Audio Controls ────────────────────────────────────────────────
  let isListening = false;
  let audioStream = null;
  let audioContext = null;
  let animationFrameId = null;
  let countdownTimer = null;

  const dbReadout = el.querySelector('#dbReadout');
  const pulseCircle = el.querySelector('#pulseCircle');
  const classLabel = el.querySelector('#classLabel');
  const startStopBtn = el.querySelector('#startStopBtn');
  const errorMsg = el.querySelector('#errorMsg');

  function updateClassification(bucket) {
    if (bucket === 'very_quiet' || bucket === 'quiet') {
      classLabel.textContent = 'QUIET';
      classLabel.style.color = '#4ade80';
    } else if (bucket === 'moderate') {
      classLabel.textContent = 'MODERATE';
      classLabel.style.color = '#F24E1E';
    } else {
      classLabel.textContent = 'LOUD';
      classLabel.style.color = '#dc2626';
    }
  }

  async function startListening() {
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.fftSize);
      isListening = true;

      // Live 5s -> 1s countdown timer
      let secondsLeft = 5;
      startStopBtn.textContent = `LISTENING (${secondsLeft}s)...`;

      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          startStopBtn.textContent = `LISTENING (${secondsLeft}s)...`;
        } else {
          clearInterval(countdownTimer);
          countdownTimer = null;
          stopListening();
          startStopBtn.textContent = 'MEASURE AGAIN';

          // Reveal 3-card recommendations and scroll down smoothly
          const gatedRecs = el.querySelector('#gatedRecs');
          if (gatedRecs) {
            gatedRecs.style.display = 'block';
            gatedRecs.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }, 1000);

      function renderFrame() {
        if (!isListening) return;

        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        let diffs = 0;
        for (let i = 1; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          const prev = (dataArray[i - 1] - 128) / 128;
          sum += v * v;
          diffs += Math.abs(v - prev);
        }

        const rms = Math.sqrt(sum / dataArray.length);
        const variation = diffs / dataArray.length;

        // Calculate real-time dB readout
        const db = Math.max(25, Math.round(24 + rms * 600));
        dbReadout.textContent = `${db} dB`;

        // Scale visual circle in real time
        const scale = 1 + Math.min(0.8, rms * 4);
        pulseCircle.style.transform = `scale(${scale})`;

        // Classify bucket
        const bucket = classifyNoise(rms, variation);
        updateClassification(bucket);

        animationFrameId = requestAnimationFrame(renderFrame);
      }

      renderFrame();

    } catch (err) {
      stopListening();
      dbReadout.style.display = 'none';
      pulseCircle.style.display = 'none';
      classLabel.style.display = 'none';

      errorMsg.style.display = 'block';
      errorMsg.textContent = 'Microphone access denied. Please allow microphone access to try the demo.';
    }
  }

  function stopListening() {
    isListening = false;
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
      audioStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }

    pulseCircle.style.transform = 'scale(1)';
  }

  startStopBtn.addEventListener('click', () => {
    if (isListening) {
      stopListening();
      startStopBtn.textContent = 'START LISTENING';
    } else {
      startListening();
    }
  });

  // Close / Dismiss CTA Banner
  el.querySelector('#closeBannerBtn')?.addEventListener('click', () => {
    const banner = el.querySelector('#ctaBanner');
    if (banner) banner.style.display = 'none';
  });

  el.querySelector('#sanctuaryPlaceholder')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('cycle mode');
  });

  return el;
}
