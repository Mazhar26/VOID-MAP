// ─── Reverse Geocoder ────────────────────────────────────────────────────────
// Extracted from original client/index.html (lines 464-476).
// Uses Nominatim (OpenStreetMap) — free, no API key required.

/**
 * Reverse geocode coordinates to a human-readable address.
 * Returns null silently on failure — address is always optional.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'VOID-MAP/2.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

/**
 * Forward geocode a place name to coordinates.
 * Used by the map search bar.
 * @param {string} query - place name or address
 * @returns {Promise<{lat: number, lon: number, display_name: string}|null>}
 */
export async function forwardGeocode(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'VOID-MAP/2.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch {
    return null;
  }
}
