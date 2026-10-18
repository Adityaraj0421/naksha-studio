#!/usr/bin/env node
'use strict';
/**
 * naksha-stats.js — estimate what naksha commands cost, from local Claude Code transcripts.
 *
 * Reads the JSONL session transcripts Claude Code keeps on disk
 * (~/.claude/projects/<encoded-project-path>/*.jsonl, plus <session>/subagents/*.jsonl),
 * sums token usage from assistant lines, prices it with scripts/lib/pricing.js, and
 * attributes it to the naksha /command that started each turn. Compares month-to-date
 * spend with the optional `budgets` object in .naksha/project.json.
 *
 * Local only: reads files, prints a report, never sends anything anywhere, never prints
 * message content. Zero dependencies. Always exits 0 except for invalid arguments (2).
 *
 * Usage: node scripts/naksha-stats.js [--all] [--since YYYY-MM-DD] [--until YYYY-MM-DD]
 *          [--session <id>] [--json] [--budget-check [--command /name]]
 *          [--project <dir>] [--logs-dir <dir>]... [--prices <file>]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const pricing = require('./lib/pricing');

const SCHEMA = 'naksha-stats/1';
const COMMANDS_DIR = path.join(__dirname, '..', 'commands');
const DAY_MS = 24 * 60 * 60 * 1000;

const USAGE = `naksha-stats — estimated token cost of naksha commands (local transcripts only)

Usage: node scripts/naksha-stats.js [options]

  --all                 every project on this machine, not just the current one
  --since YYYY-MM-DD    only usage on or after this date (UTC)
  --until YYYY-MM-DD    only usage on or before this date (UTC)
  --session <id>        only one session (a unique prefix of the id is enough)
  --json                machine-readable output
  --budget-check        print only the budget status (for pre-flight checks)
  --command </name>     with --budget-check: also check this command's per-run budget
  --project <dir>       project directory (default: current directory)
  --logs-dir <dir>      transcript root holding per-project folders (repeatable;
                        default: $CLAUDE_CONFIG_DIR/projects, ~/.claude/projects,
                        ~/.config/claude/projects)
  --prices <file>       price table (default: meta/model-prices.json, or $NAKSHA_PRICES)
  --now <ISO date>      treat this as the current time (testing)
  -h, --help            show this help

Costs are estimates at API list prices, not invoices.`;

class ArgError extends Error {}

// ─── Arguments ────────────────────────────────────────────────────────────────

function parseDateArg(flag, v, endOfDay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) throw new ArgError(`${flag} expects YYYY-MM-DD, got "${v || ''}"`);
  const t = Date.parse(`${v}T00:00:00.000Z`);
  if (Number.isNaN(t)) throw new ArgError(`${flag}: invalid date "${v}"`);
  return endOfDay ? t + DAY_MS - 1 : t;
}

function parseArgs(argv) {
  const opts = {
    all: false, since: null, until: null, session: null, json: false, budgetCheck: false,
    command: null, project: null, logsDirs: [], prices: null, now: null, help: false,
  };
  const need = (i, flag) => {
    if (i + 1 >= argv.length || String(argv[i + 1]).startsWith('--')) throw new ArgError(`${flag} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--all': opts.all = true; break;
      case '--json': opts.json = true; break;
      case '--budget-check': opts.budgetCheck = true; break;
      case '-h': case '--help': opts.help = true; break;
      case '--since': opts.since = parseDateArg(a, need(i, a), false); i++; break;
      case '--until': opts.until = parseDateArg(a, need(i, a), true); i++; break;
      case '--session': opts.session = need(i, a); i++; break;
      case '--command': opts.command = normalizeCommandName(need(i, a)); i++; break;
      case '--project': opts.project = need(i, a); i++; break;
      case '--logs-dir': opts.logsDirs.push(need(i, a)); i++; break;
      case '--prices': opts.prices = need(i, a); i++; break;
      case '--now': {
        const t = Date.parse(need(i, a));
        if (Number.isNaN(t)) throw new ArgError(`--now: invalid date "${argv[i + 1]}"`);
        opts.now = t; i++; break;
      }
      default: throw new ArgError(`unknown option "${a}"`);
    }
  }
  return opts;
}

// ─── Discovery ────────────────────────────────────────────────────────────────

/** Claude Code names a project's transcript folder after its path, non-alphanumerics → "-". */
function encodeProjectPath(p) {
  return path.resolve(p).replace(/[^a-zA-Z0-9]/g, '-');
}

/** Look for .naksha/project.json in dir and up to 3 parents (same rule as the commands). */
function findProjectJson(startDir) {
  let cur = path.resolve(startDir);
  for (let i = 0; i <= 3; i++) {
    const f = path.join(cur, '.naksha', 'project.json');
    if (fs.existsSync(f)) return f;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function defaultLogRoots() {
  const roots = [];
  if (process.env.CLAUDE_CONFIG_DIR) {
    for (const d of process.env.CLAUDE_CONFIG_DIR.split(',')) if (d.trim()) roots.push(path.join(d.trim(), 'projects'));
  }
  roots.push(path.join(os.homedir(), '.claude', 'projects'));
  roots.push(path.join(os.homedir(), '.config', 'claude', 'projects'));
  return [...new Set(roots.map(r => path.resolve(r)))];
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function listJsonl(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listJsonl(p, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

/**
 * Pick transcript files. Returns { files: [{ file, exactDir }], mode }.
 * mode "exact": the folders named after the project, plus folders whose name extends it
 * (sessions started in a subdirectory; kept only if their `cwd` is inside the project);
 * "scan": no such folder, so every folder is read and files are matched to the project by
 * their `cwd` field; "all": --all.
 */
function discoverFiles(roots, projectPaths, all) {
  const encoded = [...new Set(projectPaths.map(encodeProjectPath))];
  const dirs = [];
  for (const root of roots) {
    if (!isDir(root)) continue;
    for (const name of fs.readdirSync(root)) {
      const d = path.join(root, name);
      if (!isDir(d)) continue;
      dirs.push({ dir: d, exact: encoded.includes(name), prefix: encoded.some(e => name.startsWith(e + '-')) });
    }
  }
  const anyExact = dirs.some(d => d.exact);
  const mode = all ? 'all' : (anyExact ? 'exact' : 'scan');
  const chosen = mode === 'exact' ? dirs.filter(d => d.exact || d.prefix) : dirs;
  const files = [];
  for (const d of chosen) for (const f of listJsonl(d.dir)) files.push({ file: f, exactDir: d.exact });
  return { files, mode };
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function normalizeCommandName(name) {
  let n = String(name || '').trim();
  if (n.startsWith('/')) n = n.slice(1);
  if (n.includes(':')) n = n.slice(n.lastIndexOf(':') + 1); // plugin namespace: /naksha:design-reel
  return n ? `/${n}` : null;
}

function loadNakshaCommands(dir = COMMANDS_DIR) {
  try {
    return new Set(fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => `/${f.slice(0, -3)}`));
  } catch {
    return new Set();
  }
}

function messageText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  if (content.some(b => b && b.type === 'tool_result')) return null;
  const parts = content.filter(b => b && b.type === 'text' && typeof b.text === 'string').map(b => b.text);
  return parts.length ? parts.join('\n') : null;
}

/**
 * If this transcript line is a human prompt on the main thread, return
 * { slash: '/name' | null }; otherwise null. Tool results, sidechain (subagent) prompts,
 * meta/expanded command bodies, compaction summaries and local command output are not prompts.
 */
function classifyPrompt(o) {
  if (o.type !== 'user' || o.isSidechain || o.isMeta || o.isCompactSummary || o.toolUseResult !== undefined) return null;
  const m = o.message;
  if (!m || typeof m !== 'object') return null;
  const text = messageText(m.content);
  if (text === null) return null;
  if (/<local-command-(stdout|stderr)>/.test(text)) return null;
  const tag = text.match(/<command-name>\s*([^<\s]+)\s*<\/command-name>/);
  if (tag) return { slash: normalizeCommandName(tag[1]) };
  const typed = text.trimStart().match(/^\/([A-Za-z0-9:_-]+)(?:\s|$)/);
  if (typed) return { slash: normalizeCommandName(typed[1]) };
  return { slash: null };
}

const USAGE_FIELDS = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];

function validUsage(u) {
  if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
  let seen = 0;
  for (const f of USAGE_FIELDS) {
    if (u[f] === undefined || u[f] === null) continue;
    if (typeof u[f] !== 'number' || !Number.isFinite(u[f]) || u[f] < 0) return false;
    seen++;
  }
  return seen > 0;
}

function parseTs(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

function within(p, roots) {
  if (typeof p !== 'string' || !p) return false;
  const r = path.resolve(p);
  return roots.some(root => r === root || r.startsWith(root + path.sep));
}

/** Session id for a line: the line's own sessionId, else derived from the file path. */
function fileSessionId(file) {
  const parent = path.basename(path.dirname(file));
  if (parent === 'subagents') return path.basename(path.dirname(path.dirname(file)));
  return path.basename(file, '.jsonl');
}

/**
 * Parse transcript files defensively. Unknown line types are ignored; lines that are not
 * JSON, or assistant lines whose usage is malformed, are counted as skipped.
 * Assistant messages that Claude Code splits across several lines (one per content block,
 * same message.id + requestId) are merged, keeping the largest value of each counter.
 */
function parseTranscripts(fileInfos, projectPaths) {
  const stats = { files: 0, lines: 0, malformed: 0, invalid_usage: 0, ignored: 0, usage_lines: 0, merged_duplicates: 0 };
  const entries = new Map();
  const prompts = new Map();
  let anon = 0;
  for (const info of fileInfos) {
    let text;
    try { text = fs.readFileSync(info.file, 'utf8'); } catch { continue; }
    stats.files++;
    const fileEntries = [];
    const filePrompts = [];
    let cwdInProject = false;
    const fallbackSession = fileSessionId(info.file);
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      stats.lines++;
      let o;
      try { o = JSON.parse(line); } catch { stats.malformed++; continue; }
      if (!o || typeof o !== 'object' || Array.isArray(o)) { stats.malformed++; continue; }
      if (!cwdInProject && within(o.cwd, projectPaths)) cwdInProject = true;
      const sessionId = typeof o.sessionId === 'string' && o.sessionId ? o.sessionId : fallbackSession;
      const ts = parseTs(o.timestamp);
      if (o.type === 'assistant' && o.message && typeof o.message === 'object' && 'usage' in o.message) {
        const m = o.message;
        if (!validUsage(m.usage)) { stats.invalid_usage++; continue; }
        stats.usage_lines++;
        const id = typeof m.id === 'string' ? m.id : '';
        const req = typeof o.requestId === 'string' ? o.requestId : '';
        const key = id || req ? `${id}|${req}` : `anon-${anon++}`;
        fileEntries.push({ key, sessionId, ts, model: typeof m.model === 'string' ? m.model : '', usage: m.usage });
        continue;
      }
      const p = classifyPrompt(o);
      if (p) {
        const uuid = typeof o.uuid === 'string' && o.uuid ? o.uuid : `${info.file}:${stats.lines}`;
        filePrompts.push({ uuid, sessionId, ts, slash: p.slash });
        continue;
      }
      stats.ignored++;
    }
    const inProject = info.exactDir || cwdInProject;
    for (const e of fileEntries) {
      const prev = entries.get(e.key);
      if (!prev) {
        entries.set(e.key, {
          key: e.key, sessionId: e.sessionId, ts: e.ts, model: e.model, inProject,
          usage: pricing.normalizeUsage(e.usage),
        });
        continue;
      }
      stats.merged_duplicates++;
      const nu = pricing.normalizeUsage(e.usage);
      for (const f of Object.keys(nu)) if (typeof nu[f] === 'number') prev.usage[f] = Math.max(prev.usage[f], nu[f]);
      if (!prev.usage.speed && nu.speed) prev.usage.speed = nu.speed;
      if (!prev.model && e.model) prev.model = e.model;
      if (prev.ts === null || (e.ts !== null && e.ts < prev.ts)) prev.ts = e.ts;
      prev.inProject = prev.inProject || inProject;
    }
    for (const p of filePrompts) {
      if (!prompts.has(p.uuid)) prompts.set(p.uuid, Object.assign(p, { inProject }));
    }
  }
  return { entries: [...entries.values()], prompts: [...prompts.values()], stats };
}

// ─── Attribution & aggregation ────────────────────────────────────────────────

/**
 * Attach to each usage entry the main-thread prompt that started its turn: the latest
 * prompt in the same session at or before the entry's timestamp. Subagent usage is
 * attributed the same way (by session and time).
 */
function attribute(entries, prompts, nakshaCommands) {
  const bySession = new Map();
  for (const p of prompts) {
    if (p.ts === null) continue;
    if (!bySession.has(p.sessionId)) bySession.set(p.sessionId, []);
    bySession.get(p.sessionId).push(p);
  }
  for (const list of bySession.values()) list.sort((a, b) => a.ts - b.ts);
  for (const e of entries) {
    e.command = null;
    e.runId = null;
    e.reason = null;
    const list = bySession.get(e.sessionId);
    if (e.ts === null) { e.reason = 'no_timestamp'; continue; }
    if (!list || !list.length || list[0].ts > e.ts) { e.reason = 'no_prompt_found'; continue; }
    let lo = 0, hi = list.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (list[mid].ts <= e.ts) lo = mid; else hi = mid - 1;
    }
    const p = list[lo];
    if (p.slash && nakshaCommands.has(p.slash)) { e.command = p.slash; e.runId = p.uuid; }
    else e.reason = p.slash ? 'other_slash_command' : 'plain_prompt';
  }
}

function emptyBucket() {
  return { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, cost_usd: 0 };
}

function addTo(bucket, e) {
  for (const f of USAGE_FIELDS) bucket[f] += e.usage[f];
  bucket.cost_usd += e.cost.usd;
}

function priceEntries(entries, table) {
  for (const e of entries) e.cost = pricing.costForUsage(table, e.model, e.usage);
}

function inWindow(ts, since, until) {
  if (since === null && until === null) return true;
  if (ts === null) return false;
  return (since === null || ts >= since) && (until === null || ts <= until);
}

function aggregate(entries, prompts, filter) {
  const keep = e => (filter.all || e.inProject)
    && inWindow(e.ts, filter.since, filter.until)
    && (!filter.session || e.sessionId.startsWith(filter.session));
  const sel = entries.filter(keep);
  const runs = prompts.filter(p => p.slash && filter.nakshaCommands.has(p.slash) && keep(p));
  const commands = new Map();
  const ensure = c => {
    if (!commands.has(c)) commands.set(c, Object.assign({ command: c, runs: 0 }, emptyBucket()));
    return commands.get(c);
  };
  for (const r of runs) ensure(r.slash).runs++;
  const unattributed = Object.assign(emptyBucket(), { reasons: {} });
  const totals = emptyBucket();
  const models = new Map();
  const unpriced = new Map();
  let placeholderUsd = 0;
  const sessions = new Set();
  for (const e of sel) {
    sessions.add(e.sessionId);
    addTo(totals, e);
    if (e.command) addTo(ensure(e.command), e);
    else {
      addTo(unattributed, e);
      unattributed.reasons[e.reason] = (unattributed.reasons[e.reason] || 0) + 1;
    }
    const tokens = USAGE_FIELDS.reduce((s, f) => s + e.usage[f], 0);
    if (!e.cost.priced) {
      const u = unpriced.get(e.model || '(unknown)') || { model: e.model || '(unknown)', entries: 0, tokens: 0 };
      u.entries++; u.tokens += tokens;
      unpriced.set(u.model, u);
    }
    if (e.cost.placeholder) placeholderUsd += e.cost.usd;
    if (!e.cost.synthetic) {
      const name = e.cost.priced ? e.cost.model : (e.model || '(unknown)');
      const m = models.get(name) || Object.assign({ model: name, priced: e.cost.priced, entries: 0 }, emptyBucket());
      m.entries++;
      addTo(m, e);
      models.set(name, m);
    }
  }
  const sorted = [...commands.values()].sort((a, b) => b.cost_usd - a.cost_usd || b.runs - a.runs || a.command.localeCompare(b.command));
  return {
    sessions: sessions.size,
    usage_entries: sel.length,
    commands: sorted,
    unattributed,
    totals,
    models: [...models.values()].sort((a, b) => b.cost_usd - a.cost_usd),
    unpriced_models: [...unpriced.values()],
    placeholder_usd: placeholderUsd,
  };
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

function isPositive(v) { return typeof v === 'number' && Number.isFinite(v) && v > 0; }

/** Validate a budgets object; returns { budgets, problems }. Invalid parts are dropped. */
function readBudgets(raw) {
  const problems = [];
  if (raw === undefined || raw === null) return { budgets: null, problems };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { budgets: null, problems: ['budgets must be an object — ignored'] };
  const b = { monthly_usd: null, per_command_usd: {}, warn_at: 0.8 };
  if (raw.monthly_usd !== undefined) {
    if (isPositive(raw.monthly_usd)) b.monthly_usd = raw.monthly_usd;
    else problems.push('budgets.monthly_usd must be a positive number — ignored');
  }
  if (raw.per_command_usd !== undefined) {
    if (raw.per_command_usd && typeof raw.per_command_usd === 'object' && !Array.isArray(raw.per_command_usd)) {
      for (const [k, v] of Object.entries(raw.per_command_usd)) {
        const name = normalizeCommandName(k);
        if (name && isPositive(v)) b.per_command_usd[name] = v;
        else problems.push(`budgets.per_command_usd["${k}"] must be a positive number — ignored`);
      }
    } else problems.push('budgets.per_command_usd must be an object — ignored');
  }
  if (raw.warn_at !== undefined) {
    if (typeof raw.warn_at === 'number' && raw.warn_at > 0 && raw.warn_at <= 1) b.warn_at = raw.warn_at;
    else problems.push('budgets.warn_at must be a number between 0 and 1 — using 0.8');
  }
  if (b.monthly_usd === null && !Object.keys(b.per_command_usd).length) return { budgets: null, problems };
  return { budgets: b, problems };
}

function statusFor(ratio, warnAt) {
  if (ratio > 1) return 'over';
  if (ratio >= warnAt) return 'warn';
  return 'ok';
}

/**
 * Compare this calendar month's (UTC) spend in the current project with the budgets.
 * Per-command budgets are per run: a command is "warn" when its most expensive run this
 * month reached warn_at × limit, "over" when a run cost more than the limit.
 */
function evaluateBudgets(rawBudgets, entries, prompts, now, nakshaCommands) {
  const { budgets, problems } = readBudgets(rawBudgets);
  const d = new Date(now);
  const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const result = { configured: !!budgets, month, warn_at: budgets ? budgets.warn_at : null, problems, month_spend_usd: 0, monthly: null, per_command: [], unpriced_in_month: 0, messages: [] };
  const monthEntries = entries.filter(e => e.inProject && e.ts !== null && e.ts >= monthStart && e.ts <= now);
  for (const e of monthEntries) {
    result.month_spend_usd += e.cost.usd;
    if (!e.cost.priced) result.unpriced_in_month++;
  }
  if (!budgets) return result;
  if (budgets.monthly_usd !== null) {
    const ratio = result.month_spend_usd / budgets.monthly_usd;
    result.monthly = { limit_usd: budgets.monthly_usd, spend_usd: result.month_spend_usd, ratio, status: statusFor(ratio, budgets.warn_at) };
  }
  const monthRuns = prompts.filter(p => p.inProject && p.slash && nakshaCommands.has(p.slash) && p.ts !== null && p.ts >= monthStart && p.ts <= now);
  for (const [command, limit] of Object.entries(budgets.per_command_usd)) {
    const runs = monthRuns.filter(p => p.slash === command).sort((a, b) => a.ts - b.ts);
    const costs = new Map(runs.map(r => [r.uuid, 0]));
    for (const e of monthEntries) if (e.runId && costs.has(e.runId)) costs.set(e.runId, costs.get(e.runId) + e.cost.usd);
    const values = [...costs.values()];
    const max = values.length ? Math.max(...values) : 0;
    const last = runs.length ? costs.get(runs[runs.length - 1].uuid) : 0;
    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    result.per_command.push({
      command, limit_usd: limit, runs: runs.length, last_run_usd: last, max_run_usd: max, avg_run_usd: avg,
      status: runs.length ? statusFor(max / limit, budgets.warn_at) : 'ok',
    });
  }
  result.messages = budgetMessages(result);
  return result;
}

function pct(r) { return `${Math.round(r * 100)}%`; }

function budgetMessages(b) {
  const out = [];
  if (b.monthly) {
    const m = b.monthly;
    if (m.status === 'over') out.push({ level: 'over', text: `OVER BUDGET: ${b.month} spend ${usd(m.spend_usd)} is ${pct(m.ratio)} of the ${usd(m.limit_usd)} monthly budget` });
    else if (m.status === 'warn') out.push({ level: 'warn', text: `WARN: ${b.month} spend ${usd(m.spend_usd)} is ${pct(m.ratio)} of the ${usd(m.limit_usd)} monthly budget (warning at ${pct(b.warn_at)})` });
  }
  for (const c of b.per_command) {
    if (c.status === 'over') out.push({ level: 'over', command: c.command, text: `OVER BUDGET: a ${c.command} run cost ${usd(c.max_run_usd)} this month, above its ${usd(c.limit_usd)} per-run budget (last run ${usd(c.last_run_usd)})` });
    else if (c.status === 'warn') out.push({ level: 'warn', command: c.command, text: `WARN: ${c.command} runs reach ${usd(c.max_run_usd)} (${pct(c.max_run_usd / c.limit_usd)} of its ${usd(c.limit_usd)} per-run budget; last run ${usd(c.last_run_usd)})` });
  }
  return out;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function usd(v) {
  if (v > 0 && v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

function int(n) { return Math.round(n).toLocaleString('en-US'); }

function table(rows, header) {
  const all = [header, ...rows];
  const widths = header.map((_, i) => Math.max(...all.map(r => String(r[i]).length)));
  const fmt = r => r.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ');
  return [fmt(header), widths.map(w => '-'.repeat(w)).join('  '), ...rows.map(fmt)].join('\n');
}

function bucketRow(name, runs, b) {
  return [name, runs, int(b.input_tokens), int(b.output_tokens), int(b.cache_creation_input_tokens), int(b.cache_read_input_tokens), usd(b.cost_usd)];
}

const REASON_TEXT = {
  plain_prompt: 'turns started by a plain prompt',
  other_slash_command: 'turns started by a non-naksha slash command',
  no_prompt_found: 'no prompt found before the usage (e.g. resumed or trimmed transcript)',
  no_timestamp: 'lines without a timestamp',
};

function renderText(report) {
  const L = [];
  const s = report.scope;
  L.push('naksha stats — estimated cost from local Claude Code transcripts');
  L.push(`Scope: ${s.all ? 'all projects' : s.project}${s.session ? `, session ${s.session}` : ''}`);
  L.push(`Period: ${s.since || 'beginning'} → ${s.until || 'now'} (UTC)`);
  L.push(`Prices: ${report.pricing.source} (as of ${report.pricing.as_of})`);
  const p = report.parse;
  L.push(`Read ${int(p.files)} transcript file(s), ${int(p.lines)} lines; skipped ${int(p.malformed)} malformed and ${int(p.invalid_usage)} with unreadable usage; ${int(report.usage_entries)} API calls in scope across ${int(report.sessions)} session(s).`);
  if (s.discovery === 'scan') L.push('Note: no transcript folder named after this project; matched transcripts by their working directory instead.');
  L.push('');
  if (!report.usage_entries) {
    L.push(p.files ? 'No token usage found for this scope.' : `No Claude Code transcripts found under: ${s.log_dirs.join(', ') || '(none)'}`);
  } else {
    const rows = report.commands.map(c => bucketRow(c.command, c.runs, c));
    rows.push(bucketRow('(unattributed)', '-', report.unattributed));
    rows.push(bucketRow('TOTAL', report.commands.reduce((n, c) => n + c.runs, 0), report.totals));
    L.push(table(rows, ['Command', 'Runs', 'Input', 'Output', 'Cache write', 'Cache read', 'Est. $']));
    const share = report.totals.cost_usd > 0 ? report.unattributed.cost_usd / report.totals.cost_usd : 0;
    L.push('');
    L.push(`Unattributed: ${usd(report.unattributed.cost_usd)} (${pct(share)} of total) — usage not started by a naksha command:`);
    for (const [k, v] of Object.entries(report.unattributed.reasons)) L.push(`  - ${REASON_TEXT[k] || k}: ${int(v)} call(s)`);
    if (report.models.length > 1) {
      L.push('');
      L.push('By model: ' + report.models.map(m => `${m.model} ${m.priced ? usd(m.cost_usd) : '(unpriced)'}`).join(', '));
    }
  }
  if (report.unpriced_models.length) {
    L.push('');
    L.push(`Not priced (missing from the price table, counted as $0): ${report.unpriced_models.map(u => `${u.model} (${int(u.tokens)} tokens)`).join(', ')}`);
  }
  if (report.placeholder_usd > 0) L.push(`Includes ${usd(report.placeholder_usd)} computed from placeholder prices.`);
  L.push('');
  L.push(...renderBudgetLines(report.budgets));
  L.push('');
  L.push('Estimates at API list prices, not an invoice. Subscription plans bill differently.');
  return L.join('\n');
}

function renderBudgetLines(b, onlyCommand) {
  const L = [];
  for (const p of b.problems) L.push(`naksha budget: ${p}`);
  if (!b.configured) {
    L.push(`naksha budget: none set (${b.month} spend so far ${usd(b.month_spend_usd)}) — set one with /naksha-stats budget`);
    return L;
  }
  const msgs = b.messages.filter(m => !onlyCommand || !m.command || m.command === onlyCommand);
  for (const m of msgs) L.push(`naksha budget: ${m.text}`);
  if (b.monthly && b.monthly.status === 'ok') L.push(`naksha budget: OK — ${b.month} spend ${usd(b.monthly.spend_usd)} of ${usd(b.monthly.limit_usd)} (${pct(b.monthly.ratio)})`);
  if (!b.monthly) L.push(`naksha budget: no monthly limit; ${b.month} spend so far ${usd(b.month_spend_usd)}`);
  for (const c of b.per_command) {
    if (c.status !== 'ok' || (onlyCommand && c.command !== onlyCommand)) continue;
    L.push(`naksha budget: OK — ${c.command}: ${c.runs} run(s) this month, max ${usd(c.max_run_usd)} vs ${usd(c.limit_usd)} per run`);
  }
  if (b.unpriced_in_month) L.push(`naksha budget: ${b.unpriced_in_month} call(s) this month used a model missing from the price table and count as $0`);
  return L;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function isoDay(t) { return t === null ? null : new Date(t).toISOString().slice(0, 10); }

function buildReport(opts) {
  const now = opts.now !== null && opts.now !== undefined ? opts.now : Date.now();
  const projectDir = path.resolve(opts.project || process.cwd());
  const projectJson = findProjectJson(projectDir);
  const projectPaths = [projectDir];
  if (projectJson) {
    const root = path.dirname(path.dirname(projectJson));
    if (!projectPaths.includes(root)) projectPaths.push(root);
  }
  const roots = opts.logsDirs.length ? opts.logsDirs.map(d => path.resolve(d)) : defaultLogRoots();
  const table = pricing.loadPrices(opts.prices || undefined);
  const nakshaCommands = opts.nakshaCommands || loadNakshaCommands();

  const { files, mode } = discoverFiles(roots, projectPaths, opts.all);
  const { entries, prompts, stats } = parseTranscripts(files, projectPaths);
  priceEntries(entries, table);
  attribute(entries, prompts, nakshaCommands);
  const agg = aggregate(entries, prompts, { all: opts.all, since: opts.since, until: opts.until, session: opts.session, nakshaCommands });

  let rawBudgets;
  const notes = [];
  if (projectJson) {
    try {
      rawBudgets = JSON.parse(fs.readFileSync(projectJson, 'utf8')).budgets;
    } catch (e) {
      notes.push(`could not read ${projectJson}: ${e.message}`);
    }
  }
  const budgets = evaluateBudgets(rawBudgets, entries, prompts, now, nakshaCommands);

  return Object.assign({
    schema: SCHEMA,
    generated_at: new Date(now).toISOString(),
    scope: {
      project: projectDir, all: opts.all, session: opts.session,
      since: isoDay(opts.since), until: isoDay(opts.until),
      project_json: projectJson, log_dirs: roots.filter(isDir), discovery: mode,
    },
    pricing: { file: table.__path, source: table.source, as_of: table.as_of },
    parse: stats,
  }, agg, { budgets, notes });
}

function run(argv, out = process.stdout, err = process.stderr) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    if (!(e instanceof ArgError)) throw e;
    err.write(`naksha-stats: ${e.message}\n\n${USAGE}\n`);
    return 2;
  }
  if (opts.help) { out.write(USAGE + '\n'); return 0; }
  let report;
  try {
    report = buildReport(opts);
  } catch (e) {
    // Never fail a caller (e.g. a pre-flight check) because stats could not be computed.
    if (opts.json) out.write(JSON.stringify({ schema: SCHEMA, error: e.message }, null, 2) + '\n');
    else out.write(`naksha-stats: ${e.message}\n`);
    return 0;
  }
  if (opts.budgetCheck) {
    if (opts.json) out.write(JSON.stringify({ schema: SCHEMA, budgets: report.budgets }, null, 2) + '\n');
    else out.write(renderBudgetLines(report.budgets, opts.command).join('\n') + '\n');
    return 0;
  }
  out.write((opts.json ? JSON.stringify(report, null, 2) : renderText(report)) + '\n');
  return 0;
}

if (require.main === module) process.exitCode = run(process.argv.slice(2));

module.exports = {
  parseArgs, encodeProjectPath, findProjectJson, discoverFiles, classifyPrompt, normalizeCommandName,
  parseTranscripts, attribute, priceEntries, aggregate, readBudgets, evaluateBudgets, buildReport,
  renderText, renderBudgetLines, run, loadNakshaCommands,
};
