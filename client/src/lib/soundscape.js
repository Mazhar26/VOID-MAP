// ─── Web Audio API Ambient Soundscape Generator ────────────────────────────────
// Zero external assets required. Generates soothing ambient pink noise,
// soft acoustic rain, and subtle binaural sanctuary waves directly in browser.

let audioCtx = null;
let activeSource = null;
let gainNode = null;

/**
 * Toggle or play synthesized ambient sanctuary audio.
 * @param {boolean} enable - Whether to start or stop ambient audio
 * @param {number} [volume=0.15] - Master volume level (0.0 to 1.0)
 * @returns {boolean} Is ambient audio currently playing
 */
export function toggleSanctuarySoundscape(enable, volume = 0.15) {
  if (!enable) {
    if (gainNode && audioCtx) {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
      setTimeout(() => {
        if (activeSource) {
          activeSource.stop();
          activeSource.disconnect();
          activeSource = null;
        }
      }, 1200);
    }
    return false;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (activeSource) {
      toggleSanctuarySoundscape(false);
      return false;
    }

    const bufferSize = audioCtx.sampleRate * 4; // 4 second loop buffer
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate soothing pink noise (Paul Kellet's filter algorithm)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // normalize
      b6 = white * 0.115926;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Lowpass filter to create a warm, deep acoustic sanctuary ocean/rain tone
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420; // warm soothing cut-off

    // Master gain node with smooth fade-in
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 1.5);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseSource.start(0);
    activeSource = noiseSource;

    return true;
  } catch (err) {
    console.warn('[soundscape] Could not start audio context:', err);
    return false;
  }
}
