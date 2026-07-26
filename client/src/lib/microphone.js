// ─── Microphone Capture ───────────────────────────────────────────────────────
// Extracted from original client/index.html (lines 574-641).
// Captures audio for a set duration, returns RMS and variation arrays.
// Caller is responsible for calling stop() when done.

import { encodeGeohash } from './geohash.js';

const MEASUREMENT_DURATION_MS = 5000;
const SAMPLE_INTERVAL_MS = 60;

/**
 * Get the user's GPS location + geohash.
 * @returns {Promise<{geo: string, lat: number, lon: number}>}
 */
export async function getUserLocation(precision = 5) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const geo = encodeGeohash(lat, lon, precision);
        resolve({ geo, lat, lon });
      },
      (err) => {
        const msgs = {
          1: 'Location access denied. Please enable location permissions.',
          2: 'Location information unavailable.',
          3: 'Location request timed out. Please try again.',
        };
        reject(new Error(msgs[err.code] || 'Could not determine your location.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

/**
 * Capture audio from the microphone for MEASUREMENT_DURATION_MS.
 * Calls onSample(rms) on each sample interval for visualizer updates.
 *
 * @param {Function} onSample - called each sample with current RMS value
 * @param {Function} onProgress - called each sample with progress 0-1
 * @returns {Promise<{avgRms: number, avgVariation: number}>}
 */
export async function captureAudio(onSample, onProgress) {
  let sampleCb = typeof onSample === 'function' ? onSample : null;
  let progressCb = typeof onProgress === 'function' ? onProgress : null;

  if (onSample && typeof onSample === 'object') {
    progressCb = onSample.onProgress || null;
    sampleCb = onSample.onSample || null;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  try {
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    const rmsValues = [];
    const variationValues = [];
    const startTime = performance.now();

    await new Promise((resolve) => {
      const interval = setInterval(() => {
        const elapsed = performance.now() - startTime;

        if (elapsed >= MEASUREMENT_DURATION_MS) {
          clearInterval(interval);
          resolve();
          return;
        }

        analyser.getByteTimeDomainData(data);

        let sum = 0;
        let diffs = 0;
        for (let i = 1; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          const prev = (data[i - 1] - 128) / 128;
          sum += v * v;
          diffs += Math.abs(v - prev);
        }

        const rms = Math.sqrt(sum / data.length);
        rmsValues.push(rms);
        variationValues.push(diffs / data.length);

        sampleCb?.(rms);
        progressCb?.({ elapsedMs: elapsed, totalMs: MEASUREMENT_DURATION_MS, rms, timeDomainData: data });
      }, SAMPLE_INTERVAL_MS);
    });

    const avgRms = rmsValues.length > 0 ? rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length : 0;
    const avgVariation = variationValues.length > 0 ? variationValues.reduce((a, b) => a + b, 0) / variationValues.length : 0;

    return { avgRms, avgVariation };
  } finally {
    // Cleanup — stop mic tracks and close AudioContext
    stream.getTracks().forEach(t => t.stop());
    if (audioCtx.state !== 'closed') {
      await audioCtx.close();
    }
  }
}
