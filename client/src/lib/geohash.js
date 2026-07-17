// ─── Geohash Encoder ─────────────────────────────────────────────────────────
// Extracted from original client/index.html (lines 396-427).
// No changes — same algorithm, just modularized.

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude/longitude into a geohash string.
 * @param {number} lat
 * @param {number} lon
 * @param {number} precision - number of characters (default 5)
 * @returns {string} geohash
 */
export function encodeGeohash(lat, lon, precision = 5) {
  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLon = true;

  while (hash.length < precision) {
    const range = isLon ? lonRange : latRange;
    const val = isLon ? lon : lat;
    const mid = (range[0] + range[1]) / 2;

    if (val >= mid) {
      ch |= (1 << (4 - bit));
      range[0] = mid;
    } else {
      range[1] = mid;
    }

    bit++;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
    isLon = !isLon;
  }

  return hash;
}
