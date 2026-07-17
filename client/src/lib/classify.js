// ─── Noise Classifier ────────────────────────────────────────────────────────
// Extracted from original client/index.html (lines 647-660).
// Classifies mic audio into one of 4 buckets based on RMS + variation.

// Thresholds — match CONFIG in original index.html exactly
const THRESHOLDS = {
  VERY_QUIET_RMS_MAX: 0.025,
  VERY_QUIET_VAR_MAX: 0.015,
  QUIET_RMS_MAX:      0.05,
  QUIET_VAR_MAX:      0.03,
  MODERATE_RMS_MAX:   0.09,
};

/**
 * Classify average RMS + variation into a noise bucket.
 * @param {number} avgRms       - average RMS across all samples
 * @param {number} avgVariation - average sample-to-sample variation
 * @returns {'very_quiet'|'quiet'|'moderate'|'loud'}
 */
export function classifyNoise(avgRms, avgVariation) {
  if (avgRms < THRESHOLDS.VERY_QUIET_RMS_MAX && avgVariation < THRESHOLDS.VERY_QUIET_VAR_MAX) {
    return 'very_quiet';
  }
  if (avgRms < THRESHOLDS.QUIET_RMS_MAX && avgVariation < THRESHOLDS.QUIET_VAR_MAX) {
    return 'quiet';
  }
  if (avgRms < THRESHOLDS.MODERATE_RMS_MAX) {
    return 'moderate';
  }
  return 'loud';
}
