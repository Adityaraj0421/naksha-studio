// Pure, testable beat normalization for /design-reel.
// The extraction pass returns beats with inconsistent role labels
// ("Layout", "UI visual", "Product/UX strategy"). We map them to a fixed
// canonical set (stable name + fn + accent), truncate captions, dedupe by
// role, and enforce the minimum-beat gate. No Remotion/React here so it can
// be unit-tested with `node --test`.

export const CANONICAL = {
  creative_director: { role: 'Creative Director', fn: 'Vision', accent: '#E8633A' },
  product_designer: { role: 'Product Designer', fn: 'Strategy', accent: '#F472B6' },
  ux_designer: { role: 'UX Designer', fn: 'Flows', accent: '#4B96F3' },
  ui_designer: { role: 'UI Designer', fn: 'Visual', accent: '#F47240' },
  ux_researcher: { role: 'UX Researcher', fn: 'Research', accent: '#A78BFA' },
  design_system_lead: { role: 'Design System Lead', fn: 'Tokens', accent: '#3ECF8E' },
  content_designer: { role: 'Content Designer', fn: 'Copy', accent: '#F5A623' },
  motion_designer: { role: 'Motion Designer', fn: 'Motion', accent: '#2DD4BF' },
};

const FALLBACK = { role: 'Design', fn: 'Craft', accent: '#A1A1AA' };

export const MAX_CAPTION = 95;
export const MIN_BEATS = 3;

// Keyword -> canonical key. First hit wins; check most-specific first.
const RULES = [
  [/creative\s*director|vision|art\s*direct/i, 'creative_director'],
  [/design\s*system|system\s*lead|token|grid|consistency/i, 'design_system_lead'],
  [/content|copy|writer|microcopy|words/i, 'content_designer'],
  [/motion|animation|transition|micro-?interaction/i, 'motion_designer'],
  [/research|usability|accessibility|a11y|heuristic/i, 'ux_researcher'],
  [/product|strategy|scope/i, 'product_designer'],
  [/\bux\b|flow|information architecture|\bia\b|wireframe|journey/i, 'ux_designer'],
  [/\bui\b|visual|layout|color|colour|typograph|type\b|hierarchy|spacing/i, 'ui_designer'],
];

export function resolveRole(rawRole = '', rawFn = '') {
  const hay = `${rawRole} ${rawFn}`.trim();
  for (const [re, key] of RULES) {
    if (re.test(hay)) return CANONICAL[key];
  }
  return FALLBACK;
}

export function clampCaption(s = '') {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= MAX_CAPTION) return t;
  // truncate on a word boundary, add an ellipsis, stay within the cap
  const cut = t.slice(0, MAX_CAPTION - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '') + '…';
}

// rawBeats: [{role, fn, caption, focus?}]
// returns { ok, scenes?, error? }
export function normalizeBeats(rawBeats) {
  if (!Array.isArray(rawBeats)) return { ok: false, error: 'beats is not an array' };
  const seen = new Set();
  const scenes = [];
  for (const b of rawBeats) {
    if (!b || typeof b.caption !== 'string' || !b.caption.trim()) continue;
    const c = resolveRole(b.role, b.fn);
    if (seen.has(c.role)) continue; // one beat per canonical role
    seen.add(c.role);
    scenes.push({ role: c.role, fn: c.fn, accent: c.accent, caption: clampCaption(b.caption) });
  }
  if (scenes.length < MIN_BEATS) {
    return {
      ok: false,
      error: `only ${scenes.length} distinct role beat(s); /design-reel needs >= ${MIN_BEATS}. Re-run /design or pass more beats.`,
      scenes,
    };
  }
  return { ok: true, scenes };
}
