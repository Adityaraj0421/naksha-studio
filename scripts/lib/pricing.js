'use strict';
/**
 * pricing.js — load a model price table and turn token usage into an estimated cost.
 *
 * Zero dependencies. Used by scripts/naksha-stats.js; written so any other naksha
 * script (e.g. an eval runner) can share ONE table instead of keeping its own.
 *
 * ── Price table format ("naksha-model-prices/1", default: meta/model-prices.json) ──
 *
 *   {
 *     "format":   "naksha-model-prices/1",
 *     "currency": "USD",
 *     "unit":     "per_million_tokens",
 *     "source":   "<URL the prices were copied from>",      (required)
 *     "as_of":    "YYYY-MM-DD",                             (required)
 *     "models": {
 *       "<model id>": {
 *         "input": 4, "output": 20,                         (required, $ per 1M tokens)
 *         "cache_read": 0.2, "cache_write": 5,              (required; cache_write = 5-minute write)
 *         "cache_write_1h": 8,                              (optional; falls back to cache_write)
 *         "fast_multiplier": 2,                             (optional; applied when usage.speed === "fast")
 *         "long_context": { "threshold_tokens": 100000,     (optional; prompt tokens above the
 *                           "input": .., "output": .., ...}  threshold use these rates instead)
 *         "source": "...", "as_of": "...",                  (optional; override the top-level ones)
 *         "placeholder": true                               (optional; value NOT verified — flagged in output)
 *       }
 *     },
 *     "aliases": { "<other id>": "<model id>" }             (optional)
 *   }
 *
 * Model ids are matched after normalisation: lower-cased, a Bedrock-style
 * "<region>.anthropic." prefix, a "-v1:0" suffix, a Vertex "@date" suffix, a "[1m]"
 * style tag and a trailing "-YYYYMMDD" date are all stripped.
 *
 * Override the table with NAKSHA_PRICES=/path/to/table.json or loadPrices(path).
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PRICES_PATH = path.join(__dirname, '..', '..', 'meta', 'model-prices.json');
const RATE_FIELDS = ['input', 'output', 'cache_read', 'cache_write'];
const OPTIONAL_RATE_FIELDS = ['cache_write_1h'];
const PER_MILLION = 1e6;

function isRate(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/** Returns an array of human-readable problems; empty means the table is valid. */
function validatePriceTable(table) {
  const errors = [];
  if (!table || typeof table !== 'object' || Array.isArray(table)) return ['price table must be a JSON object'];
  if (typeof table.source !== 'string' || !table.source) errors.push('missing top-level "source"');
  if (typeof table.as_of !== 'string' || !table.as_of) errors.push('missing top-level "as_of"');
  if (table.currency && table.currency !== 'USD') errors.push(`unsupported currency "${table.currency}" (only USD)`);
  if (table.unit && table.unit !== 'per_million_tokens') errors.push(`unsupported unit "${table.unit}"`);
  if (!table.models || typeof table.models !== 'object' || Array.isArray(table.models)) {
    errors.push('missing "models" object');
    return errors;
  }
  for (const [id, m] of Object.entries(table.models)) {
    if (!m || typeof m !== 'object') { errors.push(`${id}: entry must be an object`); continue; }
    for (const f of RATE_FIELDS) if (!isRate(m[f])) errors.push(`${id}: "${f}" must be a non-negative number`);
    for (const f of OPTIONAL_RATE_FIELDS) if (f in m && !isRate(m[f])) errors.push(`${id}: "${f}" must be a non-negative number`);
    if ('fast_multiplier' in m && !(isRate(m.fast_multiplier) && m.fast_multiplier > 0)) errors.push(`${id}: "fast_multiplier" must be a positive number`);
    if (m.long_context) {
      const lc = m.long_context;
      if (!(isRate(lc.threshold_tokens) && lc.threshold_tokens > 0)) errors.push(`${id}: long_context.threshold_tokens must be a positive number`);
      for (const f of RATE_FIELDS) if (!isRate(lc[f])) errors.push(`${id}: long_context.${f} must be a non-negative number`);
    }
  }
  if (table.aliases) {
    for (const [a, target] of Object.entries(table.aliases)) {
      if (!table.models[target]) errors.push(`alias "${a}" points at unknown model "${target}"`);
    }
  }
  return errors;
}

/** Load and validate a price table. Throws with a readable message on failure. */
function loadPrices(file) {
  const p = file || process.env.NAKSHA_PRICES || DEFAULT_PRICES_PATH;
  let table;
  try {
    table = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`cannot read price table ${p}: ${e.message}`);
  }
  const errors = validatePriceTable(table);
  if (errors.length) throw new Error(`invalid price table ${p}:\n  - ${errors.join('\n  - ')}`);
  Object.defineProperty(table, '__path', { value: p, enumerable: false });
  return table;
}

function normalizeModelId(id) {
  if (typeof id !== 'string') return '';
  let s = id.trim().toLowerCase();
  s = s.replace(/\[[^\]]*\]$/, '');                 // claude-opus-5-5[1m]
  s = s.replace(/^(?:[a-z]{2,8}\.)?anthropic\./, ''); // us.anthropic.claude-... / anthropic.claude-...
  s = s.replace(/-v\d+(?::\d+)?$/, '');             // ...-v1:0
  s = s.replace(/@.*$/, '');                        // claude-opus-4-5@20251101
  return s;
}

/** Find the price entry for a model id. Returns { id, price } or null. */
function resolveModel(table, modelId) {
  const n = normalizeModelId(modelId);
  if (!n) return null;
  const aliases = table.aliases || {};
  const candidates = [n, n.replace(/-\d{8}$/, '')];
  for (const c of candidates) {
    if (table.models[c]) return { id: c, price: table.models[c] };
    if (aliases[c] && table.models[aliases[c]]) return { id: aliases[c], price: table.models[aliases[c]] };
  }
  return null;
}

/** True for transcript-internal pseudo models such as "<synthetic>" (no API call, no cost). */
function isSyntheticModel(modelId) {
  return typeof modelId === 'string' && /^<.*>$/.test(modelId.trim());
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Normalise an API / transcript `usage` object into plain token counts.
 * Accepts the Messages API shape (input_tokens, output_tokens,
 * cache_creation_input_tokens, cache_read_input_tokens, cache_creation.{ephemeral_5m_input_tokens,
 * ephemeral_1h_input_tokens}, speed).
 */
function normalizeUsage(usage) {
  const u = usage && typeof usage === 'object' ? usage : {};
  const cacheWrite = num(u.cache_creation_input_tokens);
  let cacheWrite1h = num(u.cache_creation_1h_input_tokens); // already-normalised input
  if (u.cache_creation && typeof u.cache_creation === 'object') {
    cacheWrite1h = num(u.cache_creation.ephemeral_1h_input_tokens);
  }
  cacheWrite1h = Math.min(cacheWrite1h, cacheWrite);
  return {
    input_tokens: num(u.input_tokens),
    output_tokens: num(u.output_tokens),
    cache_creation_input_tokens: cacheWrite,
    cache_creation_1h_input_tokens: cacheWrite1h,
    cache_read_input_tokens: num(u.cache_read_input_tokens),
    speed: typeof u.speed === 'string' ? u.speed : undefined,
  };
}

/**
 * Estimate the cost of one usage record.
 * Returns { usd, priced, placeholder, synthetic, model } — `priced` is false when the
 * model is not in the table (usd is then 0 and the caller should report it as unpriced).
 */
function costForUsage(table, modelId, usage) {
  const u = normalizeUsage(usage);
  if (isSyntheticModel(modelId)) return { usd: 0, priced: true, placeholder: false, synthetic: true, model: modelId };
  const hit = resolveModel(table, modelId);
  if (!hit) return { usd: 0, priced: false, placeholder: false, synthetic: false, model: modelId || '(unknown)' };
  let rates = hit.price;
  const promptTokens = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens;
  if (rates.long_context && promptTokens > rates.long_context.threshold_tokens) {
    rates = Object.assign({}, rates, rates.long_context);
  }
  const write5m = u.cache_creation_input_tokens - u.cache_creation_1h_input_tokens;
  const write1hRate = isRate(rates.cache_write_1h) ? rates.cache_write_1h : rates.cache_write;
  let usd = (u.input_tokens * rates.input
    + u.output_tokens * rates.output
    + u.cache_read_input_tokens * rates.cache_read
    + write5m * rates.cache_write
    + u.cache_creation_1h_input_tokens * write1hRate) / PER_MILLION;
  if (u.speed === 'fast' && hit.price.fast_multiplier) usd *= hit.price.fast_multiplier;
  return { usd, priced: true, placeholder: hit.price.placeholder === true, synthetic: false, model: hit.id };
}

/** Where a model's price came from: { source, as_of, placeholder }. */
function priceProvenance(table, modelId) {
  const hit = resolveModel(table, modelId);
  if (!hit) return null;
  return {
    source: hit.price.source || table.source,
    as_of: hit.price.as_of || table.as_of,
    placeholder: hit.price.placeholder === true,
  };
}

module.exports = {
  DEFAULT_PRICES_PATH,
  validatePriceTable,
  loadPrices,
  normalizeModelId,
  resolveModel,
  isSyntheticModel,
  normalizeUsage,
  costForUsage,
  priceProvenance,
};
