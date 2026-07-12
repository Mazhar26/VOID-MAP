// ─── Recommendations Service ──────────────────────────────────────────────────
// Rule-based activity recommendations based on the ambient noise level.
// Optionally adjusts suggestions based on the time of day.

const RECOMMENDATIONS = {
  very_quiet: [
    {
      activity: 'Meditation & Mindfulness',
      desc: 'Perfect stillness for tuning inward and focusing on your breath.',
      icon: '🧘'
    },
    {
      activity: 'Deep Reading',
      desc: 'An excellent environment to absorb complex texts or get lost in a novel.',
      icon: '📚'
    },
    {
      activity: 'Journaling & Reflection',
      desc: 'Put your thoughts to paper without external distractions.',
      icon: '✍️'
    },
    {
      activity: 'Yoga or Napping',
      desc: 'Ideal atmosphere for restoring physical and mental energy.',
      icon: '🛌'
    }
  ],
  quiet: [
    {
      activity: 'Light Reading or Sketching',
      desc: 'Comfortable quiet for creative tasks and light focus.',
      icon: '🎨'
    },
    {
      activity: 'Podcast Listening',
      desc: 'Great sound environment to enjoy spoken audio.',
      icon: '🎧'
    },
    {
      activity: 'Coffee Break & Planning',
      desc: 'Plan your day or reflect over a warm drink.',
      icon: '☕'
    },
    {
      activity: 'Light Stretching',
      desc: 'Reconnect with your body in a relaxed atmosphere.',
      icon: '🤸'
    }
  ],
  moderate: [
    {
      activity: 'Walking & Exploring',
      desc: 'Fine background level for a casual stroll or light hike.',
      icon: '🚶'
    },
    {
      activity: 'Casual Conversation',
      desc: 'Comfortable sound level for talking with friends.',
      icon: '💬'
    },
    {
      activity: 'Phone Call or Audio Notes',
      desc: 'Audible environment suitable for clear voice communication.',
      icon: '📞'
    },
    {
      activity: 'Music Practice',
      desc: 'Play instruments or listen to upbeat tracks.',
      icon: '🎸'
    }
  ],
  loud: [
    {
      activity: 'Seek a Quieter Space',
      desc: 'High sound level can be draining. We suggest finding a void map location.',
      icon: '🏃'
    },
    {
      activity: 'Active Walking / Errands',
      desc: 'Suitable for getting steps in or running essential errands.',
      icon: '🚶‍♂️'
    }
  ]
};

/**
 * Get recommended activities for a specific noise level.
 * @param {'very_quiet'|'quiet'|'moderate'|'loud'} noiseLevel
 * @param {'morning'|'afternoon'|'evening'|null} timeOfDay
 * @returns {Array<{activity: string, desc: string, icon: string}>}
 */
export function getActivitiesForNoise(noiseLevel, timeOfDay = null) {
  const normalizedLevel = String(noiseLevel).trim().toLowerCase();
  const list = RECOMMENDATIONS[normalizedLevel] || RECOMMENDATIONS.moderate;

  // Optional: Apply time-of-day customization (e.g. suggest stargazing only in evening)
  if (timeOfDay === 'evening' && normalizedLevel === 'very_quiet') {
    return [
      {
        activity: 'Stargazing & Astronomical Observation',
        desc: 'Look up at the dark sky in complete silent isolation.',
        icon: '🌌'
      },
      ...list.slice(0, 3)
    ];
  }

  return list;
}
