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

const TIMEOUT_MS = 8000;
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

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { available: true, error: 'naksha-stats.js returned no JSON object' };
  }
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

function register({ route, projectDir, naksha }) {
  const script = path.join(naksha.pluginRoot, 'scripts', 'naksha-stats.js');
  let cache = null;

  route('GET', '/cost', async (req, res, { json, query }) => {
    if (!fs.existsSync(script)) return json(200, { available: false, reason: 'not-installed' });
    if (cache && Date.now() - cache.at < CACHE_MS && !query.refresh) return json(200, cache.data);
    const data = await new Promise((resolve) => {
      execFile(
        process.execPath,
        [script, '--json'],
        { cwd: projectDir, timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024, env: { ...process.env, NAKSHA_PROJECT_DIR: projectDir } },
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
    cache = { at: Date.now(), data };
    return json(200, data);
  });
}

module.exports = { register, normalize };
