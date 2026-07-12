// ─── Recommendation Routes ───────────────────────────────────────────────────
// GET /api/recommendations/:noiseLevel — get rule-based activity suggestions

import { Router } from 'express';
import { getActivitiesForNoise } from '../services/recommendService.js';

const router = Router();

router.get('/:noiseLevel', (req, res) => {
  const { noiseLevel } = req.params;
  const { time } = req.query; // 'morning', 'afternoon', 'evening'

  // Validate noise level value
  const validLevels = new Set(['very_quiet', 'quiet', 'moderate', 'loud']);
  if (!validLevels.has(noiseLevel)) {
    return res.status(400).json({ error: 'Invalid noise level bucket' });
  }

  const recommendations = getActivitiesForNoise(noiseLevel, time);
  return res.json(recommendations);
});

export default router;
