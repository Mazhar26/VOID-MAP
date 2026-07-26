// ─── Guest Demo Page — Real-Time dB Meter (#/try) ──────────────────────────────
// Basic dB meter with visual feedback for unauthenticated users

import { captureAudio } from '../lib/microphone.js';
import { classifyNoise } from '../lib/classify.js';
import { escapeHtml } from '../lib/escape.js';

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

      <!-- Bottom CTA Banner -->
      <div class="try-bottom-cta-banner">
        <span class="try-cta-text">
          Sign in to unlock the full VOID-MAP experience — map, save quiet spots, and share.
        </span>
        <a href="#/login" class="try-cta-btn">
          SIGN IN →
        </a>
      </div>
    </div>
  `;

  // ─── State & Audio Controls ────────────────────────────────────────────────
  let isListening = false;
  let audioStream = null;
  let audioContext = null;
  let animationFrameId = null;

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
      startStopBtn.textContent = 'STOP';

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
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
      audioStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }

    startStopBtn.textContent = 'START LISTENING';
    pulseCircle.style.transform = 'scale(1)';
  }

  startStopBtn.addEventListener('click', () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  el.querySelector('#sanctuaryPlaceholder')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('cycle mode');
  });

  return el;
}
