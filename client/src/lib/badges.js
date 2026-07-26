// ─── User Silence Explorer Badges & Gamification Module ─────────────────────

const BADGES = [
  { id: 'first_measure', title: '🌱 First Whisper', desc: 'Measured ambient silence for the first time', icon: '🌱' },
  { id: 'sanctuary_seeker', title: '🌙 Sanctuary Explorer', desc: 'Discovered a spot below 35 dB (Very Quiet)', icon: '🌙' },
  { id: 'pin_creator', title: '📍 Silence Cartographer', desc: 'Saved a quiet location pin to the map', icon: '📍' },
  { id: 'night_owl', title: '🌌 Midnight Listener', desc: 'Measured ambient sound between 10 PM and 5 AM', icon: '🌌' },
];

/**
 * Get user earned badges from localStorage.
 * @returns {Array<{id: string, title: string, desc: string, icon: string}>}
 */
export function getEarnedBadges() {
  try {
    const raw = localStorage.getItem('voidmap_badges');
    const badgeIds = raw ? JSON.parse(raw) : [];
    return BADGES.filter(b => badgeIds.includes(b.id));
  } catch {
    return [];
  }
}

/**
 * Award a badge to the user if not already earned.
 * @param {string} badgeId
 * @returns {boolean} Was new badge awarded
 */
export function unlockBadge(badgeId) {
  try {
    const raw = localStorage.getItem('voidmap_badges');
    const badgeIds = raw ? JSON.parse(raw) : [];
    if (!badgeIds.includes(badgeId)) {
      badgeIds.push(badgeId);
      localStorage.setItem('voidmap_badges', JSON.stringify(badgeIds));
      return true;
    }
  } catch (err) {
    console.warn('[badges] Could not save badge:', err);
  }
  return false;
}
