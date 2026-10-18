'use strict';
// GET /api/cost — spend vs budgets from `node scripts/naksha-stats.js --json`
// (cost tracking, naksha v6). If the script is absent → { available: false }.
//
// The script's JSON is treated defensively. Expected (documented in docs/dashboard.md):
//   {
//     "currency": "USD",
//     "spend":   { "session": 0.42, "today": 1.80, "month": 12.50 },
//     "budgets": [{ "scope": "daily", "limit": 5, "spent": 1.80 }]
//                 — or { "daily": { "limit": 5, "spent": 1.8 } } — or { "daily": 5 }
//     "by_command": [{ "command": "/design", "cost": 3.2 }]   (optional)
//   }
// Also accepted: *_usd suffixes, budget/max for limit, used/current for spent,
// and numeric top-level keys containing cost/spend/usd when `spend` is missing.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// naksha-stats.js reads every transcript on its first run (it caches per-file results
// after that), which can take well over WAIT_MS with a long history. The route waits
// WAIT_MS for a run, then answers with the last good result (marked stale) or a
// "pending" note, and lets the run finish in the background for the next request.
const WAIT_MS = 8000;
const RUN_TIMEOUT_MS = 180000;
const CACHE_MS = 30000;

function num(...vals) {
  for (const v of vals) {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return null;
}

function label(s) {
  return String(s).replace(/_usd$/i, '').replace(/[_-]+/g, ' ').slice(0, 40);
}

function normalizeSpend(raw) {
  const out = [];
  if (raw.spend && typeof raw.spend === 'object' && !Array.isArray(raw.spend)) {
    for (const [k, v] of Object.entries(raw.spend)) {
      const n = num(v, v && v.usd, v && v.cost);
      if (n !== null) out.push({ key: k.replace(/_usd$/i, ''), label: label(k), value: n });
    }
  } else if (num(raw.spend) !== null) {
    out.push({ key: 'total', label: 'total', value: num(raw.spend) });
  }
  if (!out.length) {
    for (const [k, v] of Object.entries(raw)) {
      if (/cost|spend|usd/i.test(k) && num(v) !== null) out.push({ key: k.replace(/_usd$/i, ''), label: label(k), value: num(v) });
    }
  }
  return out.slice(0, 8);
}

function normalizeBudgets(raw, spend) {
  const spentFor = (key) => {
    const hit = spend.find((s) => s.key === key || s.key === key.replace(/ly$/, '') || (key === 'daily' && s.key === 'today'));
    return hit ? hit.value : null;
  };
  const toBudget = (lab, b) => {
    if (b === null || b === undefined) return null;
    const limit = typeof b === 'object' ? num(b.limit, b.limit_usd, b.budget, b.budget_usd, b.max) : num(b);
    const spent =
      typeof b === 'object' ? num(b.spent, b.spent_usd, b.used, b.current, b.cost, spentFor(String(lab))) : spentFor(String(lab));
    if (limit === null || limit <= 0) return null;
    const ratio = spent === null ? null : spent / limit;
    return {
      label: label(lab),
      limit,
      spent,
      ratio,
      status: ratio === null ? 'unknown' : ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok',
    };
  };
  const b = raw.budgets || raw.budget;
  let list = [];
  if (Array.isArray(b)) list = b.map((x, i) => toBudget((x && (x.name || x.scope || x.period || x.label)) || `budget ${i + 1}`, x));
  else if (b && typeof b === 'object') list = Object.entries(b).map(([k, v]) => toBudget(k, v));
  return list.filter(Boolean).slice(0, 8);
}

function normalizeTop(raw) {
  const src = raw.by_command || raw.commands || raw.top;
  let rows = [];
  if (Array.isArray(src)) {
    rows = src.map((r) => ({ label: String((r && (r.command || r.name || r.label)) || '?').slice(0, 40), value: num(r && r.cost, r && r.usd, r && r.spend, r && r.value) }));
  } else if (src && typeof src === 'object') {
    rows = Object.entries(src).map(([k, v]) => ({ label: k.slice(0, 40), value: num(v, v && v.cost, v && v.usd) }));
  }
  return rows.filter((r) => r.value !== null).sort((a, b) => b.value - a.value).slice(0, 5);
}

// Exact mapping for naksha's own scripts/naksha-stats.js (schema "naksha-stats/1"):
// { totals: { cost_usd }, commands: [{ command, cost_usd }], budgets: { configured,
//   month, month_spend_usd, warn_at, monthly: { limit_usd, spend_usd, ratio, status } | null,
//   per_command: [{ command, limit_usd, max_run_usd, status }] } }
// Statuses come from the script, so they respect the user's warn_at.
const STATUSES = new Set(['ok', 'warn', 'over']);

function fromNakshaStats(raw) {
  const b = raw.budgets && typeof raw.budgets === 'object' ? raw.budgets : {};
  const spend = [];
  const total = num(raw.totals && raw.totals.cost_usd);
  if (total !== null) spend.push({ key: 'total', label: 'all time', value: total });
  const month = num(b.month_spend_usd);
  if (month !== null) spend.push({ key: 'month', label: typeof b.month === 'string' ? b.month.slice(0, 7) : 'this month', value: month });

  const toBudget = (lab, limit, spent, status) => {
    if (limit === null || limit <= 0) return null;
    const ratio = spent === null ? null : spent / limit;
    const fallback = ratio === null ? 'unknown' : ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok';
    return { label: label(lab), limit, spent, ratio, status: STATUSES.has(status) ? status : fallback };
  };
  const budgets = [];
  if (b.monthly && typeof b.monthly === 'object') {
    budgets.push(toBudget('monthly', num(b.monthly.limit_usd), num(b.monthly.spend_usd), b.monthly.status));
  }
  for (const c of Array.isArray(b.per_command) ? b.per_command : []) {
    if (c && typeof c === 'object') budgets.push(toBudget(`${c.command} per run (max)`, num(c.limit_usd), num(c.max_run_usd), c.status));
  }

  const top = (Array.isArray(raw.commands) ? raw.commands : [])
    .map((r) => ({ label: String((r && r.command) || '?').slice(0, 40), value: num(r && r.cost_usd) }))
    .filter((r) => r.value !== null && r.value > 0)
    .sort((x, y) => y.value - x.value)
    .slice(0, 5);

  return {
    available: true,
    currency: 'USD',
    spend,
    budgets: budgets.filter(Boolean).slice(0, 8),
    top,
    generated_at: typeof raw.generated_at === 'string' ? raw.generated_at.slice(0, 40) : new Date().toISOString(),
  };
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { available: true, error: 'naksha-stats.js returned no JSON object' };
  }
  if (raw.error && typeof raw.error === 'string') {
    return { available: true, error: raw.error.slice(0, 200) };
  }
  if (typeof raw.schema === 'string' && raw.schema.startsWith('naksha-stats/')) return fromNakshaStats(raw);
  const spend = normalizeSpend(raw);
  return {
    available: true,
    currency: typeof raw.currency === 'string' ? raw.currency.slice(0, 6) : 'USD',
    spend,
    budgets: normalizeBudgets(raw, spend),
    top: normalizeTop(raw),
    generated_at: typeof raw.generated_at === 'string' ? raw.generated_at.slice(0, 40) : new Date().toISOString(),
  };
}

function parseJSONOutput(stdout) {
  const text = String(stdout || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('no JSON in output');
  }
}

function register({ route, projectDir, naksha, options = {}, onClose }) {
  const script = path.join(naksha.pluginRoot, 'scripts', 'naksha-stats.js');
  const waitMs = options.costWaitMs || WAIT_MS;
  let cache = null; // last finished run: { at, data }
  let lastGood = null; // last run without an error
  let inflight = null;
  let child = null;

  // Stop a background run on shutdown, and wait for it to exit (on Windows a running
  // process keeps its working directory locked).
  if (onClose) {
    onClose(() => new Promise((resolve) => {
      if (!child || child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      child.kill();
    }));
  }

  const runStats = () => new Promise((resolve) => {
    child = execFile(
      process.execPath,
      [script, '--json'],
      { cwd: projectDir, timeout: RUN_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, NAKSHA_PROJECT_DIR: projectDir } },
      (err, stdout) => {
        if (err && !stdout) {
          return resolve({ available: true, error: err.killed ? 'naksha-stats.js timed out' : 'naksha-stats.js failed' });
        }
        try {
          resolve(normalize(parseJSONOutput(stdout)));
        } catch {
          resolve({ available: true, error: 'naksha-stats.js did not print JSON' });
        }
      },
    );
  });

  const refresh = () => {
    if (!inflight) {
      inflight = runStats().then((data) => {
        cache = { at: Date.now(), data };
        if (!data.error) lastGood = data;
        inflight = null;
        return data;
      });
    }
    return inflight;
  };

  route('GET', '/cost', async (req, res, { json, query }) => {
    if (!fs.existsSync(script)) return json(200, { available: false, reason: 'not-installed' });
    if (cache && Date.now() - cache.at < CACHE_MS && !query.refresh) return json(200, cache.data);
    let timer;
    const late = new Promise((resolve) => { timer = setTimeout(() => resolve(null), waitMs); });
    const data = await Promise.race([refresh(), late]);
    clearTimeout(timer);
    if (data) return json(200, data.error && lastGood ? { ...lastGood, stale: true, error_note: data.error } : data);
    if (lastGood) return json(200, { ...lastGood, stale: true });
    return json(200, { available: true, pending: true });
  });
}

module.exports = { register, normalize };
