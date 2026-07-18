// ─── API Client ──────────────────────────────────────────────────────────────
// Centralized fetch wrapper for all backend calls.
// Auto-attaches JWT from localStorage.
// Handles 401 by redirecting to login.
// Retries on network failure (same logic as the original postSignal).

const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Core fetch wrapper — all API calls go through here.
 * @param {string} path - e.g. '/api/signal'
 * @param {RequestInit} options
 * @returns {Promise<any>} parsed JSON response
 */
async function request(path, options = {}) {
  const token = localStorage.getItem('voidmap_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 — token expired or invalid
  if (res.status === 401) {
    localStorage.removeItem('voidmap_token');
    localStorage.removeItem('voidmap_user');
    window.location.hash = '#/login';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

/**
 * POST /api/signal — with retry logic (ported from original postSignal())
 */
export async function postSignal(payload, retries = 2, delayMs = 800) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await request('/api/signal', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
}

export const api = {
  // ─── Auth ──────────────────────────────────────────────────────
  signup: (email) =>
    request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email }) }),

  login: (email) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),

  verifyOTP: (email, otp, stayLoggedIn) =>
    request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, stayLoggedIn }),
    }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  // ─── Signals ───────────────────────────────────────────────────
  postSignal,

  getQuietScore: (geohash) =>
    request(`/api/quiet/${geohash}`),

  // ─── Locations ─────────────────────────────────────────────────
  saveLocation: (data) =>
    request('/api/locations', { method: 'POST', body: JSON.stringify(data) }),

  getMyLocations: () =>
    request('/api/locations/mine'),

  getPublicLocations: () =>
    request('/api/locations/public'),

  deleteLocation: (id) =>
    request(`/api/locations/${id}`, { method: 'DELETE' }),

  // ─── Recommendations ───────────────────────────────────────────
  getRecommendations: (noiseLevel, time) =>
    request(`/api/recommendations/${noiseLevel}${time ? `?time=${time}` : ''}`),

  // ─── Admin ─────────────────────────────────────────────────────
  getAdminStats: () =>
    request('/api/admin/stats'),

  getAdminUsers: (page = 1) =>
    request(`/api/admin/users?page=${page}`),
};
