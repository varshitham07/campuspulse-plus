// AI-assisted helpers. These only ever produce SUGGESTIONS:
// - announcement classification / urgency
// - duplicate incident detection
// They never mark anything as verified — that stays a human/community decision.
//
// By default this uses a transparent keyword heuristic so the app is fully
// functional with zero external dependency. If ANTHROPIC_API_KEY is set,
// classify() will instead call the Claude API for a better suggestion.
// If that call fails for any reason, we silently fall back to the heuristic
// so a flaky AI provider never breaks the core product.

const CATEGORY_KEYWORDS = {
  exam: ['exam', 'test', 'midterm', 'viva', 'invigilat'],
  emergency: ['emergency', 'fire', 'evacuate', 'medical emergency', 'lockdown', 'safety'],
  academic: ['class', 'lecture', 'assignment', 'syllabus', 'faculty', 'department'],
  club: ['club', 'meeting', 'society'],
  workshop: ['workshop', 'training', 'bootcamp'],
  competition: ['hackathon', 'competition', 'contest', 'tournament'],
  transportation: ['bus', 'shuttle', 'transport', 'parking', 'traffic', 'route diversion'],
  facilities: ['wifi', 'wi-fi', 'electricity', 'power cut', 'water supply', 'maintenance', 'washroom', 'elevator', 'lift'],
};

const URGENCY_KEYWORDS = {
  critical: ['emergency', 'evacuate', 'immediately', 'urgent', 'now', 'lockdown'],
  important: ['changed', 'moved', 'cancelled', 'postponed', 'rescheduled', 'deadline'],
};

function heuristicClassify(text) {
  const lower = text.toLowerCase();

  let category = 'general';
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) {
      category = cat;
      break;
    }
  }

  let urgency = 'normal';
  if (URGENCY_KEYWORDS.critical.some((w) => lower.includes(w))) urgency = 'critical';
  else if (URGENCY_KEYWORDS.important.some((w) => lower.includes(w))) urgency = 'important';

  return { category, urgency, source: 'heuristic' };
}

async function classify(text) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return heuristicClassify(text);
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Classify this campus announcement. Respond with ONLY compact JSON like {"category":"exam","urgency":"important"}. Valid categories: exam, academic, emergency, club, workshop, competition, transportation, facilities, general. Valid urgency: critical, important, normal.\n\nText: """${text}"""`,
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) throw new Error(`AI service responded ${resp.status}`);
    const data = await resp.json();
    const raw = data.content?.[0]?.text?.trim() || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, ''));
    if (!parsed.category || !parsed.urgency) throw new Error('Malformed AI response');
    return { ...parsed, source: 'llm' };
  } catch (err) {
    console.warn('[ai.service] falling back to heuristic classifier:', err.message);
    return heuristicClassify(text);
  }
}

// Cheap similarity check for duplicate-incident suggestions: normalizes text
// and compares shared significant words. Good enough to flag "possible
// duplicate" for a human to look at — never used to auto-merge anything.
function similarity(a, b) {
  const normalize = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared++;
  return shared / Math.min(wordsA.size, wordsB.size);
}

async function findPossibleDuplicates(incidentId, text, pool) {
  const [others] = await pool.query(
    `SELECT id, title, description FROM incidents
     WHERE id != :id AND status != 'rejected'
     AND created_at > DATE_SUB(NOW(), INTERVAL 2 DAY)`,
    { id: incidentId }
  );

  return others
    .map((o) => ({ id: o.id, title: o.title, score: similarity(text, `${o.title} ${o.description}`) }))
    .filter((o) => o.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

module.exports = { classify, findPossibleDuplicates };
