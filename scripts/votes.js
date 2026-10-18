#!/usr/bin/env node
'use strict';

// votes.js — local Helpful / Needs-work votes that teach naksha.
//
// Votes live in .naksha/votes.jsonl (append-only, one JSON object per line,
// never sent anywhere). This script appends and reads them, consolidates votes
// on designs and variants (plus existing taste.signals) into evidence-backed
// taste.observations, compares eval-tagged votes against LLM-judge verdicts,
// and writes an opt-in, redacted export that the user can share themselves.
//
// Zero dependencies. Used by commands/naksha-vote.md, commands/naksha-taste.md,
// commands/design-variants.md and dashboard/routes/votes.js.
//
// Usage:
//   node scripts/votes.js append <helpful|needs-work> --kind <design|variant|finding|command_run>
//                         --ref <ref> [--reason "…"] [--command /name] [--role "…"]
//                         [--eval <eval-name>] [--traits "a, b"] [--json]
//   node scripts/votes.js list [--limit 20] [--kind variant] [--json]
//   node scripts/votes.js stats [--json]
//   node scripts/votes.js subjects [--json]
//   node scripts/votes.js consolidate [--json] [--write]
//   node scripts/votes.js calibrate [--results <eval-results.json>] [--json]
//   node scripts/votes.js export [--redact] [--out <file>] [--json]
// Global: --dir <project dir> (default: nearest folder with .naksha/, up to 3 parents, else cwd)
//
// Schema: docs/naksha-memory-schema.md ("v6 Votes") and types/v5.ts (Vote, TasteObservation).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Constants ────────────────────────────────────────────────────────────────

const VERDICTS = ['helpful', 'needs_work'];
const KINDS = ['design', 'variant', 'finding', 'command_run'];
const SOURCES = ['dashboard', 'command', 'cli'];
const TASTE_KINDS = ['design', 'variant'];

const MAX_ACTIVE_VOTES = 1000; // votes.jsonl rotates to votes.1.jsonl at this many lines
const EVIDENCE_CAP = 50;       // evidence ids kept per observation (newest first)
const OBSERVATIONS_CAP = 40;   // observations kept in project.json
const REASON_MAX = 280;
const REF_MAX = 200;
const ROLE_MAX = 60;
const EVAL_MAX = 120;
const TRAITS_MAX = 6;
const TRAIT_MAX_LEN = 40;
const READ_LIMIT_BYTES = 2 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

const ID_RE = /^([vs])_(\d{8}T\d{6}Z)_([hnar])_([a-z0-9]{1,16})$/;

// ─── Small helpers ────────────────────────────────────────────────────────────

function isObj(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/** Collapse whitespace and control characters, trim, and truncate. */
function cleanText(value, max) {
  if (value === undefined || value === null) return '';
  // eslint-disable-next-line no-control-regex
  const s = String(value).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function toMs(ts) {
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  return Number.isFinite(t) ? t : NaN;
}

function nowMs(now) {
  if (now === undefined || now === null) return Date.now();
  const t = toMs(now);
  return Number.isFinite(t) ? t : Date.now();
}

/** 2026-10-18T12:05:01.123Z → 20261018T120501Z */
function compactTs(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
}

/** 20261018T120501Z → ms */
function expandTs(compact) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(compact);
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

function isoSeconds(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** FNV-1a 32-bit, hex — a stable short hash for deterministic signal ids. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Age decay shared with taste.signals: ≤ 90 days = 1, 91–180 days = 0.5, older = 0. */
function ageWeight(ts, now) {
  const t = toMs(ts);
  if (!Number.isFinite(t)) return 0;
  const days = (nowMs(now) - t) / DAY_MS;
  if (days <= 90) return 1;
  if (days <= 180) return 0.5;
  return 0;
}

function normalizeVerdict(v) {
  const s = String(v === undefined || v === null ? '' : v).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'helpful' || s === 'up' || s === 'yes') return 'helpful';
  if (s === 'needs_work' || s === 'needswork' || s === 'down' || s === 'no') return 'needs_work';
  return null;
}

function normalizeTraits(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  const out = [];
  for (const t of list) {
    if (typeof t !== 'string') continue;
    const s = cleanText(t, 200).toLowerCase();
    if (!s || s.length > TRAIT_MAX_LEN) continue;
    if (!out.includes(s)) out.push(s);
  }
  return out.slice(0, TRAITS_MAX);
}

// ─── Ids ──────────────────────────────────────────────────────────────────────
// Ids are self-describing so an observation's evidence stays meaningful after
// the raw vote rotates out or the signal is evicted from taste.signals:
//   vote:   v_<UTC yyyymmddThhmmssZ>_<h|n>_<6 hex random>
//   signal: s_<UTC recorded_at>_<a|r>_<8 hex FNV-1a of direction + traits>

function newVoteId(verdict, ms) {
  return `v_${compactTs(ms)}_${verdict === 'helpful' ? 'h' : 'n'}_${crypto.randomBytes(3).toString('hex')}`;
}

function signalId(signal) {
  if (!isObj(signal)) return null;
  const t = toMs(signal.recorded_at);
  if (!Number.isFinite(t)) return null;
  const pol = signal.verdict === 'approved' ? 'a' : signal.verdict === 'rejected' ? 'r' : null;
  if (!pol) return null;
  const traits = normalizeTraits(signal.traits).join('|');
  return `s_${compactTs(t)}_${pol}_${fnv1a(`${signal.direction || ''}#${traits}`)}`;
}

/** Parse an evidence id → { kind, ms, polarity } or null. */
function parseId(id) {
  const m = ID_RE.exec(typeof id === 'string' ? id : '');
  if (!m) return null;
  const ms = expandTs(m[2]);
  if (!Number.isFinite(ms)) return null;
  return { kind: m[1] === 'v' ? 'vote' : 'signal', ms, polarity: m[3] === 'h' || m[3] === 'a' ? 'helpful' : 'needs_work' };
}

// ─── Paths ────────────────────────────────────────────────────────────────────

function storePaths(projectDir) {
  const dir = path.join(projectDir, '.naksha');
  return {
    dir,
    active: path.join(dir, 'votes.jsonl'),
    archive: path.join(dir, 'votes.1.jsonl'),
    project: path.join(dir, 'project.json'),
  };
}

function findProjectDir(start) {
  let current = path.resolve(start || process.cwd());
  for (let i = 0; i <= 3; i++) {
    try {
      if (fs.statSync(path.join(current, '.naksha')).isDirectory()) return current;
    } catch { /* keep walking */ }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start || process.cwd());
}

function readTextSafe(file, limit = READ_LIMIT_BYTES) {
  try {
    const st = fs.statSync(file);
    if (!st.isFile()) return null;
    if (st.size > limit) {
      const fd = fs.openSync(file, 'r');
      try {
        const buf = Buffer.alloc(limit);
        const n = fs.readSync(fd, buf, 0, limit, 0);
        return buf.slice(0, n).toString('utf8');
      } finally {
        fs.closeSync(fd);
      }
    }
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function readJsonSafe(file) {
  const text = readTextSafe(file);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate untrusted vote input and build the stored vote. id and ts are always
 * assigned here — never taken from input.
 * @returns {{ok: boolean, errors: string[], vote?: object}}
 */
function validateVote(input, opts = {}) {
  const errors = [];
  if (!isObj(input)) return { ok: false, errors: ['vote must be a JSON object'] };

  const verdict = normalizeVerdict(input.verdict);
  if (!verdict) errors.push('verdict must be "helpful" or "needs_work"');

  const s = input.subject;
  const subject = {};
  if (!isObj(s)) {
    errors.push('subject must be an object with kind and ref');
  } else {
    if (!KINDS.includes(s.kind)) errors.push(`subject.kind must be one of ${KINDS.join(', ')}`);
    else subject.kind = s.kind;

    const ref = cleanText(s.ref, REF_MAX + 1);
    if (!ref) errors.push('subject.ref is required');
    else if (ref.length > REF_MAX) errors.push(`subject.ref must be ≤ ${REF_MAX} characters`);
    else subject.ref = ref;

    if (s.command !== undefined && s.command !== null && s.command !== '') {
      const cmd = String(s.command).trim();
      if (!/^\/[a-z0-9][a-z0-9-]{0,63}$/.test(cmd)) errors.push('subject.command must look like "/design-review"');
      else subject.command = cmd;
    }
    if (s.role !== undefined && s.role !== null && s.role !== '') {
      const role = cleanText(s.role, ROLE_MAX + 1);
      if (role.length > ROLE_MAX) errors.push(`subject.role must be ≤ ${ROLE_MAX} characters`);
      else if (role) subject.role = role;
    }
    if (s.eval !== undefined && s.eval !== null && s.eval !== '') {
      const ev = String(s.eval).trim();
      if (ev.length > EVAL_MAX || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(ev)) {
        errors.push('subject.eval must be an eval name (letters, digits, . _ : / -)');
      } else subject.eval = ev;
    }
    if (s.traits !== undefined && s.traits !== null && s.traits !== '') {
      if (!Array.isArray(s.traits) && typeof s.traits !== 'string') errors.push('subject.traits must be an array of strings');
      else {
        const traits = normalizeTraits(s.traits);
        if (traits.length) subject.traits = traits;
      }
    }
  }

  let reason = '';
  if (input.reason !== undefined && input.reason !== null) {
    if (typeof input.reason !== 'string') errors.push('reason must be a string');
    else reason = cleanText(input.reason, REASON_MAX);
  }

  let source = 'cli';
  if (input.source !== undefined && input.source !== null && input.source !== '') {
    if (!SOURCES.includes(input.source)) errors.push(`source must be one of ${SOURCES.join(', ')}`);
    else source = input.source;
  }

  if (errors.length) return { ok: false, errors };

  const ms = nowMs(opts.now);
  const vote = { id: newVoteId(verdict, ms), ts: isoSeconds(ms), verdict };
  if (reason) vote.reason = reason;
  vote.subject = subject;
  vote.source = source;
  return { ok: true, errors: [], vote };
}

/** Minimal shape check for a stored line (lines may be hand-edited or truncated). */
function isStoredVote(v) {
  return isObj(v) && typeof v.id === 'string' && Number.isFinite(toMs(v.ts)) &&
    VERDICTS.includes(v.verdict) && isObj(v.subject) && KINDS.includes(v.subject.kind) &&
    typeof v.subject.ref === 'string' && v.subject.ref.length > 0;
}

// ─── Store ────────────────────────────────────────────────────────────────────

function countLines(file) {
  const text = readTextSafe(file, Infinity);
  if (!text) return 0;
  let n = 0;
  for (const line of text.split('\n')) if (line.trim()) n++;
  return n;
}

/** Rotate votes.jsonl → votes.1.jsonl once it holds max lines (the previous archive is replaced). */
function rotateIfNeeded(projectDir, max = MAX_ACTIVE_VOTES) {
  const p = storePaths(projectDir);
  let size;
  try {
    size = fs.statSync(p.active).size;
  } catch {
    return false;
  }
  // A stored vote line is never shorter than ~120 bytes, so small files skip the line count.
  if (size < max * 100) return false;
  if (countLines(p.active) < max) return false;
  fs.renameSync(p.active, p.archive);
  return true;
}

function appendVote(projectDir, input, opts = {}) {
  const result = validateVote(input, opts);
  if (!result.ok) return result;
  const p = storePaths(projectDir);
  fs.mkdirSync(p.dir, { recursive: true });
  const rotated = rotateIfNeeded(projectDir, opts.maxActive || MAX_ACTIVE_VOTES);
  fs.appendFileSync(p.active, JSON.stringify(result.vote) + '\n', { encoding: 'utf8', flag: 'a' });
  return { ok: true, errors: [], vote: result.vote, rotated };
}

function parseLines(text, out) {
  let skipped = 0;
  if (!text) return skipped;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const v = JSON.parse(line);
      if (isStoredVote(v)) out.push(v);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  return skipped;
}

/** All retained votes (archive + active), oldest first. Malformed lines are skipped and counted. */
function readVotes(projectDir) {
  const p = storePaths(projectDir);
  const votes = [];
  let skipped = parseLines(readTextSafe(p.archive, Infinity), votes);
  skipped += parseLines(readTextSafe(p.active, Infinity), votes);
  votes.sort((a, b) => toMs(a.ts) - toMs(b.ts));
  return { votes, skipped };
}

function subjectKey(subject, byEval = false) {
  return [subject.kind, String(subject.ref).toLowerCase(), byEval ? subject.eval || '' : ''].join('\u0000');
}

/**
 * The latest vote per subject (kind + ref, case-insensitive) wins — changing your
 * mind or double-clicking never counts twice. Calibration passes byEval so one
 * artifact can be rated separately against different evals.
 * Returns { effective, superseded:Set<id> }.
 */
function effectiveVotes(votes, opts = {}) {
  const latest = new Map();
  const superseded = new Set();
  for (const v of votes) {
    const key = subjectKey(v.subject, opts.byEval === true);
    const prev = latest.get(key);
    if (prev) superseded.add(prev.id);
    latest.set(key, v);
  }
  const effective = [...latest.values()].sort((a, b) => toMs(a.ts) - toMs(b.ts));
  return { effective, superseded };
}

function computeStats(votes) {
  const { effective } = effectiveVotes(votes);
  const stats = {
    total_votes: votes.length,
    effective_votes: effective.length,
    helpful: 0,
    needs_work: 0,
    helpful_rate: null,
    by_kind: {},
    by_command: {},
    by_role: {},
    by_eval: {},
    first: votes.length ? votes[0].ts : null,
    last: votes.length ? votes[votes.length - 1].ts : null,
  };
  const bump = (bucket, key, verdict) => {
    if (!key) return;
    if (!bucket[key]) bucket[key] = { helpful: 0, needs_work: 0 };
    bucket[key][verdict]++;
  };
  for (const v of effective) {
    stats[v.verdict]++;
    bump(stats.by_kind, v.subject.kind, v.verdict);
    bump(stats.by_command, v.subject.command, v.verdict);
    bump(stats.by_role, v.subject.role, v.verdict);
    bump(stats.by_eval, v.subject.eval, v.verdict);
  }
  if (effective.length) stats.helpful_rate = round2(stats.helpful / effective.length);
  return stats;
}

// ─── Subjects (what can be voted on) ──────────────────────────────────────────

function decodeEntities(s) {
  return s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" }[e]));
}

/** Pull <title> and <meta name=… content=…> from an HTML string (attribute order tolerant). */
function htmlMeta(html) {
  const out = { title: '', meta: {} };
  if (typeof html !== 'string') return out;
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (t) out.title = cleanText(decodeEntities(t[1]), 140);
  const tagRe = /<meta\b[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const attrs = {};
    const attrRe = /([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = attrRe.exec(m[0]))) attrs[a[1].toLowerCase()] = a[3] !== undefined ? a[3] : a[4];
    if (attrs.name && attrs.content !== undefined) out.meta[attrs.name.toLowerCase()] = cleanText(decodeEntities(attrs.content), 300);
  }
  return out;
}

function mtimeMs(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return NaN;
  }
}

/** naksha-variants/variants.json, validated defensively. */
function readVariantsManifest(projectDir) {
  const m = readJsonSafe(path.join(projectDir, 'naksha-variants', 'variants.json'));
  if (!isObj(m) || !Array.isArray(m.variants)) return null;
  const variants = [];
  for (const v of m.variants) {
    if (!isObj(v)) continue;
    const letter = String(v.letter || '').trim().toUpperCase();
    if (!/^[A-Z]$/.test(letter)) continue;
    const file = typeof v.file === 'string' && /^[\w.-]+\.html$/.test(path.basename(v.file)) ? path.basename(v.file) : `variant-${letter.toLowerCase()}.html`;
    variants.push({
      letter,
      name: cleanText(v.name, 60),
      file,
      rationale: cleanText(v.rationale, 200),
      traits: normalizeTraits(v.traits),
      wildcard: v.wildcard === true,
    });
  }
  const runId = typeof m.run_id === 'string' && /^[\w.:-]{1,64}$/.test(m.run_id) ? m.run_id : '';
  return { run_id: runId, task: cleanText(m.task, 140), created_at: Number.isFinite(toMs(m.created_at)) ? m.created_at : null, variants };
}

/** "B", "variant b", "variant-b.html", "naksha-variants/variant-b.html", "B@run" → { letter, run } */
function parseVariantRef(ref) {
  const s = String(ref || '').trim();
  const [head, run = ''] = s.split('@');
  const m = /(?:^|variant[\s_-]*)([a-z])(?:\.html)?$/i.exec(head.trim());
  return m ? { letter: m[1].toUpperCase(), run } : null;
}

function resolveVariantTraits(ref, manifest) {
  if (!manifest) return [];
  const parsed = parseVariantRef(ref);
  if (!parsed) return [];
  if (parsed.run && manifest.run_id && parsed.run !== manifest.run_id) return [];
  const v = manifest.variants.find((x) => x.letter === parsed.letter);
  return v ? v.traits : [];
}

function readFindings(projectDir) {
  const data = readJsonSafe(path.join(projectDir, 'naksha-review', 'findings.json'));
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.findings) ? data.findings : [];
  const out = [];
  for (const f of list) {
    if (!isObj(f)) continue;
    const id = cleanText(f.id, REF_MAX);
    const title = cleanText(f.title, 140);
    if (!id || !title) continue;
    out.push({
      id,
      title,
      dimension: cleanText(f.dimension, 40),
      severity: cleanText(f.severity, 20),
      owner_role: cleanText(f.owner_role, ROLE_MAX),
      verdict: cleanText(f.verdict, 20),
    });
  }
  return out;
}

/**
 * Recent things a person can vote on: variants (manifest, or variant-*.html as a
 * fallback), design-output.html, and /design-review findings. Each subject carries
 * the latest vote on it, if any. Every read is defensive: missing or malformed
 * files simply contribute nothing.
 */
function recentSubjects(projectDir, opts = {}) {
  const subjects = [];
  const variantsDir = path.join(projectDir, 'naksha-variants');
  const manifest = readVariantsManifest(projectDir);

  if (manifest && manifest.variants.length) {
    const manifestMtime = mtimeMs(path.join(variantsDir, 'variants.json'));
    const when = manifest.created_at || (Number.isFinite(manifestMtime) ? isoSeconds(manifestMtime) : null);
    for (const v of manifest.variants) {
      subjects.push({
        kind: 'variant',
        ref: manifest.run_id ? `${v.letter}@${manifest.run_id}` : v.letter,
        label: `Variant ${v.letter}${v.name ? ` — ${v.name}` : ''}${v.wildcard ? ' (Wildcard)' : ''}`,
        detail: v.rationale || manifest.task || '',
        file: `naksha-variants/${v.file}`,
        traits: v.traits,
        command: '/design-variants',
        updated_at: when,
      });
    }
  } else {
    let files = [];
    try {
      files = fs.readdirSync(variantsDir).filter((f) => /^variant-[a-z]\.html$/i.test(f)).sort();
    } catch { /* no variants */ }
    for (const f of files) {
      const letter = f.slice(8, 9).toUpperCase();
      const file = path.join(variantsDir, f);
      const meta = htmlMeta(readTextSafe(file, 64 * 1024));
      const mt = mtimeMs(file);
      subjects.push({
        kind: 'variant',
        ref: Number.isFinite(mt) ? `${letter}@${compactTs(mt)}` : letter,
        label: meta.title || `Variant ${letter}`,
        detail: meta.meta.description || '',
        file: `naksha-variants/${f}`,
        traits: normalizeTraits(meta.meta['naksha-traits']),
        command: '/design-variants',
        updated_at: Number.isFinite(mt) ? isoSeconds(mt) : null,
      });
    }
  }

  const designFile = path.join(projectDir, 'design-output.html');
  const designHtml = readTextSafe(designFile, 64 * 1024);
  if (designHtml !== null) {
    const meta = htmlMeta(designHtml);
    const mt = mtimeMs(designFile);
    subjects.push({
      kind: 'design',
      ref: Number.isFinite(mt) ? `design-output.html@${compactTs(mt)}` : 'design-output.html',
      label: meta.title || 'design-output.html',
      detail: meta.meta.description || '',
      file: 'design-output.html',
      traits: normalizeTraits(meta.meta['naksha-traits']),
      command: meta.meta['naksha-command'] && /^\/[a-z0-9-]+$/.test(meta.meta['naksha-command']) ? meta.meta['naksha-command'] : '/design',
      updated_at: Number.isFinite(mt) ? isoSeconds(mt) : null,
    });
  }

  const findings = readFindings(projectDir).slice(0, opts.findingsLimit || 20);
  for (const f of findings) {
    subjects.push({
      kind: 'finding',
      ref: f.id,
      label: f.title,
      detail: [f.severity, f.dimension, f.verdict].filter(Boolean).join(' · '),
      role: f.owner_role || undefined,
      command: '/design-review',
      updated_at: null,
    });
  }

  const { effective } = effectiveVotes(opts.votes || readVotes(projectDir).votes);
  const latestByKey = new Map(effective.map((v) => [subjectKey(v.subject), v]));
  for (const s of subjects) {
    const v = latestByKey.get(subjectKey(s));
    s.vote = v ? { id: v.id, verdict: v.verdict, ts: v.ts, reason: v.reason } : null;
  }
  return subjects;
}

// ─── Taste consolidation ──────────────────────────────────────────────────────

/**
 * Evidence items for consolidation: effective votes on designs/variants that
 * carry traits (on the vote, or resolved from naksha-variants/variants.json),
 * plus taste.signals that are not already represented by a vote (signal.vote_id).
 */
function collectEvidence({ votes = [], signals = [], manifest = null } = {}) {
  const { effective, superseded } = effectiveVotes(votes);
  const items = [];
  const voteIds = new Set(votes.map((v) => v.id));
  let skippedNoTraits = 0;

  for (const v of effective) {
    if (!TASTE_KINDS.includes(v.subject.kind)) continue;
    let traits = normalizeTraits(v.subject.traits);
    if (!traits.length && v.subject.kind === 'variant') traits = resolveVariantTraits(v.subject.ref, manifest);
    if (!traits.length) {
      skippedNoTraits++;
      continue;
    }
    if (!parseId(v.id)) continue; // hand-written ids cannot carry decay information
    items.push({ id: v.id, ms: toMs(v.ts), polarity: v.verdict, traits });
  }

  for (const s of Array.isArray(signals) ? signals : []) {
    if (!isObj(s)) continue;
    if (typeof s.vote_id === 'string' && voteIds.has(s.vote_id)) continue; // the vote already counts
    const id = signalId(s);
    if (!id) continue;
    const traits = normalizeTraits(s.traits);
    if (!traits.length) continue;
    items.push({ id, ms: toMs(s.recorded_at), polarity: s.verdict === 'approved' ? 'helpful' : 'needs_work', traits });
  }

  return { items, superseded, skippedNoTraits };
}

function confidenceOf(helpful, needsWork) {
  return round2(Math.abs(helpful - needsWork) / (helpful + needsWork + 2));
}

/**
 * Refine observations with new evidence. Existing observations keep their
 * evidence even after the raw vote/signal is gone (rotation, signal cap);
 * new evidence ids are merged in, superseded votes are dropped, and the
 * weighted counts are recomputed from the evidence ids with the shared age decay.
 *
 * helpful / needs_work = Σ age weight of evidence with that polarity.
 * confidence = |helpful − needs_work| / (helpful + needs_work + 2)   (0 when nothing is active)
 */
function consolidate({ observations = [], items = [], superseded = new Set(), now } = {}) {
  const ms = nowMs(now);
  const stamp = isoSeconds(ms);
  const map = new Map();

  for (const o of Array.isArray(observations) ? observations : []) {
    if (!isObj(o) || typeof o.trait !== 'string') continue;
    const trait = normalizeTraits([o.trait])[0];
    if (!trait) continue;
    const prev = map.get(trait);
    const ids = Array.isArray(o.evidence) ? o.evidence.filter((id) => parseId(id)) : [];
    if (prev) {
      ids.forEach((id) => prev.ids.add(id));
    } else {
      map.set(trait, {
        trait,
        old: new Set(ids),
        ids: new Set(ids),
        first_seen: Number.isFinite(toMs(o.first_seen)) ? o.first_seen : null,
        updated_at: Number.isFinite(toMs(o.updated_at)) ? o.updated_at : null,
      });
    }
  }

  for (const item of items) {
    for (const trait of item.traits) {
      if (!map.has(trait)) map.set(trait, { trait, old: new Set(), ids: new Set(), first_seen: null, updated_at: null });
      map.get(trait).ids.add(item.id);
    }
  }

  const out = [];
  for (const entry of map.values()) {
    for (const id of superseded) entry.ids.delete(id);
    const parsed = [...entry.ids].map((id) => ({ id, p: parseId(id) })).filter((x) => x.p);
    if (!parsed.length) continue;
    parsed.sort((a, b) => b.p.ms - a.p.ms || (a.id < b.id ? -1 : 1));
    const earliest = parsed[parsed.length - 1].p.ms;
    const kept = parsed.slice(0, EVIDENCE_CAP);

    let helpful = 0;
    let needsWork = 0;
    for (const { p } of kept) {
      const w = ageWeight(p.ms, ms);
      if (p.polarity === 'helpful') helpful += w;
      else needsWork += w;
    }

    const evidence = kept.map((x) => x.id);
    const changed = evidence.length !== entry.old.size || evidence.some((id) => !entry.old.has(id));
    const firstSeenMs = Math.min(earliest, Number.isFinite(toMs(entry.first_seen)) ? toMs(entry.first_seen) : Infinity);

    out.push({
      trait: entry.trait,
      helpful: round2(helpful),
      needs_work: round2(needsWork),
      confidence: confidenceOf(helpful, needsWork),
      first_seen: isoSeconds(firstSeenMs),
      updated_at: changed || !entry.updated_at ? stamp : entry.updated_at,
      evidence,
    });
  }

  out.sort((a, b) =>
    (b.helpful + b.needs_work) - (a.helpful + a.needs_work) ||
    b.confidence - a.confidence ||
    (a.trait < b.trait ? -1 : 1));
  return out.slice(0, OBSERVATIONS_CAP);
}

function fmtCount(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "prefers serif display (5 helpful, 1 needs work)" */
function describeObservation(o) {
  const lean = o.helpful > o.needs_work ? 'prefers' : o.needs_work > o.helpful ? 'avoids' : 'mixed on';
  return `${lean} ${o.trait} (${fmtCount(o.helpful)} helpful, ${fmtCount(o.needs_work)} needs work)`;
}

function consolidateProject(projectDir, opts = {}) {
  const project = readJsonSafe(storePaths(projectDir).project);
  const taste = isObj(project) && isObj(project.taste) ? project.taste : {};
  const { votes } = readVotes(projectDir);
  const { items, superseded, skippedNoTraits } = collectEvidence({
    votes,
    signals: Array.isArray(taste.signals) ? taste.signals : [],
    manifest: readVariantsManifest(projectDir),
  });
  const observations = consolidate({ observations: taste.observations, items, superseded, now: opts.now });
  return { project, observations, items: items.length, skippedNoTraits };
}

function memoryBlocks(observations, now) {
  const stamp = isoSeconds(nowMs(now));
  return [
    '<!-- naksha-memory-update',
    JSON.stringify({ type: 'project_json_patch', path: 'taste.observations', value: observations }, null, 2),
    '-->',
    '<!-- naksha-memory-update',
    JSON.stringify({ type: 'project_json_patch', path: 'updatedAt', value: stamp }),
    '-->',
  ].join('\n');
}

/** Direct, atomic write (temp file + rename) for use outside a Claude session. */
function writeObservations(projectDir, observations, now) {
  const file = storePaths(projectDir).project;
  const project = readJsonSafe(file);
  if (!isObj(project)) throw new Error(`no readable .naksha/project.json in ${projectDir} — run /naksha-init first`);
  if (!isObj(project.taste)) project.taste = {};
  project.taste.observations = observations;
  project.updatedAt = isoSeconds(nowMs(now));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(project, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

// ─── Judge calibration ────────────────────────────────────────────────────────

const RESULTS_SHAPE = '[{ "eval": "<eval name>", "assertion": "<optional>", "judge_verdict": "pass" | "fail", "run_id": "<optional>" }]';

/** Accepts a top-level array, or an object with a results array. Unusable rows are counted, not fatal. */
function normalizeResults(data) {
  const rows = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.results) ? data.results : null;
  if (!rows) return { results: [], skipped: 0, error: `expected ${RESULTS_SHAPE}` };
  const results = [];
  let skipped = 0;
  for (const r of rows) {
    if (!isObj(r) || typeof r.eval !== 'string' || !r.eval.trim()) {
      skipped++;
      continue;
    }
    let verdict = typeof r.judge_verdict === 'string' ? r.judge_verdict.trim().toLowerCase() : null;
    if (verdict !== 'pass' && verdict !== 'fail') {
      if (typeof r.pass === 'boolean') verdict = r.pass ? 'pass' : 'fail';
      else if (typeof r.passed === 'boolean') verdict = r.passed ? 'pass' : 'fail';
      else verdict = null;
    }
    if (!verdict) {
      skipped++;
      continue;
    }
    results.push({
      eval: r.eval.trim(),
      assertion: typeof r.assertion === 'string' ? r.assertion : undefined,
      judge_verdict: verdict,
      run_id: typeof r.run_id === 'string' || typeof r.run_id === 'number' ? String(r.run_id) : undefined,
    });
  }
  return { results, skipped, error: null };
}

/**
 * Compare eval-tagged votes with judge verdicts. An eval (or a run of it) counts
 * as "pass" only when none of its assertions failed. A vote whose subject.ref
 * equals a run_id is compared with that run; otherwise with the whole file.
 */
function calibrate({ votes = [], results = [] } = {}) {
  const { effective } = effectiveVotes(votes.filter((v) => v.subject && v.subject.eval), { byEval: true });
  const byEval = new Map();
  for (const r of results) {
    if (!byEval.has(r.eval)) byEval.set(r.eval, { fail: false, runs: new Map() });
    const e = byEval.get(r.eval);
    if (r.judge_verdict === 'fail') e.fail = true;
    if (r.run_id !== undefined) e.runs.set(r.run_id, (e.runs.get(r.run_id) === 'fail' || r.judge_verdict === 'fail') ? 'fail' : 'pass');
  }

  const report = {
    eval_votes: effective.length,
    compared: 0,
    agree: 0,
    disagree: 0,
    disagreement_rate: null,
    lenient: [],   // users said Needs work, judge passed → tighten these evals
    strict: [],    // users said Helpful, judge failed → check for over-strict or flaky assertions
    unmatched: [], // evals people voted on that the results file does not contain
  };
  const lenient = new Map();
  const strict = new Map();
  const unmatched = new Set();
  const add = (map, ev, v) => {
    if (!map.has(ev)) map.set(ev, { eval: ev, votes: 0, reasons: [] });
    const row = map.get(ev);
    row.votes++;
    if (v.reason && row.reasons.length < 3) row.reasons.push(v.reason);
  };

  for (const v of effective) {
    const e = byEval.get(v.subject.eval);
    if (!e) {
      unmatched.add(v.subject.eval);
      continue;
    }
    const judge = e.runs.has(v.subject.ref) ? e.runs.get(v.subject.ref) : e.fail ? 'fail' : 'pass';
    report.compared++;
    const agrees = (v.verdict === 'helpful' && judge === 'pass') || (v.verdict === 'needs_work' && judge === 'fail');
    if (agrees) report.agree++;
    else {
      report.disagree++;
      add(v.verdict === 'needs_work' ? lenient : strict, v.subject.eval, v);
    }
  }
  if (report.compared) report.disagreement_rate = round2(report.disagree / report.compared);
  const byVotes = (a, b) => b.votes - a.votes || (a.eval < b.eval ? -1 : 1);
  report.lenient = [...lenient.values()].sort(byVotes);
  report.strict = [...strict.values()].sort(byVotes);
  report.unmatched = [...unmatched].sort();
  return report;
}

// ─── Redaction & export ───────────────────────────────────────────────────────

const REDACTIONS = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, '[email]'],
  [/\b(?:https?|ftp|file):\/\/[^\s<>"'`)\]]+/gi, '[url]'],
  [/\bwww\.[^\s<>"'`)\]]+/gi, '[url]'],
  [/\b[A-Za-z]:\\[^\s"'`<>]*/g, '[path]'],
  [/(^|[\s("'`=:[{,])~\/[^\s"'`<>)\]]*/g, '$1[path]'],
  [/(^|[\s("'`=:[{,])\.{0,2}(?:\/[^\s/"'`<>)\]]+){2,}\/?/g, '$1[path]'],
  [/\b[\w.-]+(?:\/[\w.-]+)+\.[A-Za-z0-9]{1,8}\b/g, '[path]'],
  [/\b(?:sk|pk|rk|ghp|gho|ghs|xox[abprs])[-_][A-Za-z0-9_-]{10,}\b/g, '[secret]'],
  // long token-like runs that mix letters and digits (API keys, hashes); plain long words are left alone
  [/\b(?=[A-Za-z0-9+/_-]*\d)(?=[A-Za-z0-9+/_-]*[A-Za-z])[A-Za-z0-9+/_-]{32,}={0,2}(?![A-Za-z0-9])/g, '[secret]'],
  [/\+\d[\d\s().-]{7,}\d/g, '[phone]'],
];

/** Scrub emails, URLs, file paths, token-like strings and +international phone numbers. */
function redactText(value) {
  if (typeof value !== 'string') return value;
  let s = value;
  for (const [re, rep] of REDACTIONS) s = s.replace(re, rep);
  return s;
}

function redactVote(v) {
  const out = { id: v.id, ts: v.ts, verdict: v.verdict };
  if (v.reason) out.reason = redactText(v.reason);
  const subject = { kind: v.subject.kind, ref: redactText(v.subject.ref) };
  for (const k of ['command', 'role', 'eval']) if (v.subject[k]) subject[k] = k === 'role' ? redactText(v.subject[k]) : v.subject[k];
  if (Array.isArray(v.subject.traits)) subject.traits = v.subject.traits.slice();
  out.subject = subject;
  if (v.source) out.source = v.source;
  return out;
}

const EXPORT_NOTICE = 'Generated locally by naksha. naksha never sends votes anywhere; sharing this file is up to you.';

function buildExport(votes, opts = {}) {
  const redact = opts.redact === true;
  return {
    format: 'naksha-votes-export',
    version: 1,
    exported_at: isoSeconds(nowMs(opts.now)),
    redacted: redact,
    notice: EXPORT_NOTICE,
    redaction_limits: redact
      ? 'Scrubs emails, URLs, file paths, token-like strings and +international phone numbers from reasons and refs. It cannot recognise names, company or product names, or other personal details written in plain words: read the file before sharing it.'
      : 'Not redacted: reasons and refs are exactly as recorded.',
    count: votes.length,
    votes: redact ? votes.map(redactVote) : votes,
  };
}

function exportVotes(projectDir, opts = {}) {
  const { votes } = readVotes(projectDir);
  const doc = buildExport(votes, opts);
  const stamp = compactTs(nowMs(opts.now)).slice(0, 8);
  const out = opts.out ? path.resolve(opts.out) : path.join(storePaths(projectDir).dir, `votes-export-${stamp}${doc.redacted ? '-redacted' : ''}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  return { file: out, count: doc.count, redacted: doc.redacted };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const BOOLEAN_FLAGS = new Set(['json', 'redact', 'write', 'help']);

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const key = (eq === -1 ? a.slice(2) : a.slice(2, eq)).toLowerCase();
      if (eq !== -1) args.flags[key] = a.slice(eq + 1);
      else if (BOOLEAN_FLAGS.has(key)) args.flags[key] = true;
      else if (i + 1 < argv.length) args.flags[key] = argv[++i];
      else args.flags[key] = '';
    } else if (a === '-h') {
      args.flags.help = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

const HELP = `naksha votes — local Helpful / Needs-work feedback (never sent anywhere)

  append <helpful|needs-work> --kind <design|variant|finding|command_run> --ref <ref>
         [--reason "…"] [--command /name] [--role "…"] [--eval <name>] [--traits "a, b"] [--source cli|command|dashboard]
  list [--limit 20] [--kind <kind>]
  stats
  subjects                 recent designs, variants and findings you can vote on
  consolidate [--write]    votes + taste.signals → taste.observations (prints a naksha-memory-update block;
                           --write updates .naksha/project.json directly instead)
  calibrate [--results <file>]   compare eval-tagged votes with judge verdicts
  export [--redact] [--out <file>]   write a shareable file (local only)

Global: --dir <project dir>   --json   --now <ISO> (testing)`;

function print(obj, asJson, human) {
  process.stdout.write(asJson ? JSON.stringify(obj, null, 2) + '\n' : human() + '\n');
}

function main(argv) {
  const args = parseArgs(argv);
  const cmd = (args._[0] || '').toLowerCase();
  const f = args.flags;
  if (!cmd || f.help || cmd === 'help') {
    process.stdout.write(HELP + '\n');
    return cmd || f.help ? 0 : 2;
  }
  const projectDir = f.dir ? path.resolve(f.dir) : findProjectDir(process.cwd());
  const now = f.now || undefined;
  const asJson = f.json === true;

  switch (cmd) {
    case 'append':
    case 'add':
    case 'vote': {
      const input = {
        verdict: f.verdict || args._[1],
        reason: f.reason,
        source: f.source || 'cli',
        subject: { kind: f.kind, ref: f.ref, command: f.command, role: f.role, eval: f.eval, traits: f.traits },
      };
      const res = appendVote(projectDir, input, { now });
      if (!res.ok) {
        process.stderr.write(`votes: not recorded —\n  ${res.errors.join('\n  ')}\n`);
        if (asJson) process.stdout.write(JSON.stringify({ ok: false, errors: res.errors }) + '\n');
        return 1;
      }
      print({ ok: true, vote: res.vote, rotated: res.rotated }, asJson, () =>
        `Recorded ${res.vote.verdict === 'helpful' ? 'Helpful' : 'Needs work'} on ${res.vote.subject.kind} ${res.vote.subject.ref} (${res.vote.id}) in .naksha/votes.jsonl — stays on this machine.`);
      return 0;
    }
    case 'list': {
      const { votes, skipped } = readVotes(projectDir);
      const kind = f.kind;
      if (kind && !KINDS.includes(kind)) {
        process.stderr.write(`votes: --kind must be one of ${KINDS.join(', ')}\n`);
        return 2;
      }
      const limit = Math.max(1, Math.min(500, parseInt(f.limit, 10) || 20));
      const recent = votes.filter((v) => !kind || v.subject.kind === kind).slice(-limit).reverse();
      print({ votes: recent, total: votes.length, skipped }, asJson, () => {
        if (!recent.length) return 'No votes yet. Vote with /naksha-vote helpful|needs-work <subject> or in the dashboard.';
        return recent.map((v) => `${v.verdict === 'helpful' ? '+ helpful   ' : '- needs work'}  ${v.ts.slice(0, 10)}  ${v.subject.kind} ${v.subject.ref}${v.subject.eval ? ` [eval ${v.subject.eval}]` : ''}${v.reason ? ` — ${v.reason}` : ''}`).join('\n') +
          (skipped ? `\n(${skipped} malformed line(s) skipped)` : '');
      });
      return 0;
    }
    case 'stats': {
      const { votes } = readVotes(projectDir);
      const s = computeStats(votes);
      print(s, asJson, () => {
        if (!s.total_votes) return 'No votes yet.';
        const lines = [`${s.effective_votes} subjects voted (${s.total_votes} votes): ${s.helpful} helpful, ${s.needs_work} needs work · helpful rate ${Math.round(s.helpful_rate * 100)}%`];
        for (const [label, bucket] of [['kind', s.by_kind], ['command', s.by_command], ['role', s.by_role], ['eval', s.by_eval]]) {
          const keys = Object.keys(bucket);
          if (keys.length) lines.push(`  by ${label}: ` + keys.map((k) => `${k} ${bucket[k].helpful}/${bucket[k].needs_work}`).join(' · '));
        }
        return lines.join('\n');
      });
      return 0;
    }
    case 'subjects': {
      const subjects = recentSubjects(projectDir);
      print({ subjects }, asJson, () => subjects.length
        ? subjects.map((s) => `${s.kind.padEnd(8)} ${s.ref}  ${s.label}${s.vote ? `  [voted ${s.vote.verdict}]` : ''}`).join('\n')
        : 'Nothing to vote on yet: no naksha-variants/, design-output.html or naksha-review/findings.json here.');
      return 0;
    }
    case 'consolidate': {
      const res = consolidateProject(projectDir, { now });
      if (f.write) {
        try {
          writeObservations(projectDir, res.observations, now);
        } catch (err) {
          process.stderr.write(`votes: ${err.message}\n`);
          return 1;
        }
      }
      print({ observations: res.observations, evidence_items: res.items, skipped_no_traits: res.skippedNoTraits, written: !!f.write }, asJson, () => {
        const lines = [];
        if (!res.observations.length) lines.push('No observations yet: vote on designs or variants that carry traits, or record taste with /naksha-taste.');
        for (const o of res.observations.slice(0, 10)) lines.push(`  ${describeObservation(o)} · confidence ${o.confidence}`);
        if (res.skippedNoTraits) lines.push(`  (${res.skippedNoTraits} design/variant vote(s) had no traits and were not used)`);
        if (f.write) lines.push('Wrote taste.observations to .naksha/project.json.');
        else if (res.observations.length) lines.push('', memoryBlocks(res.observations, now));
        return lines.join('\n');
      });
      return 0;
    }
    case 'calibrate': {
      const { votes } = readVotes(projectDir);
      const tagged = votes.filter((v) => v.subject.eval).length;
      if (!f.results) {
        const msg = {
          ok: false,
          eval_votes: tagged,
          needed: `Pass --results <file> with judge verdicts shaped like ${RESULTS_SHAPE} (a top-level array, or an object with a "results" array). Votes are matched by subject.eval; a vote whose ref equals a run_id is compared with that run only.`,
        };
        print(msg, asJson, () => `No results file given. ${tagged} vote(s) are tagged with an eval name.\n${msg.needed}`);
        return 0;
      }
      const data = readJsonSafe(path.resolve(f.results));
      if (data === null) {
        process.stderr.write(`votes: could not read JSON from ${f.results}\n`);
        return 1;
      }
      const norm = normalizeResults(data);
      if (norm.error) {
        process.stderr.write(`votes: ${norm.error}\n`);
        return 1;
      }
      const r = calibrate({ votes, results: norm.results });
      r.skipped_results = norm.skipped;
      print(r, asJson, () => {
        if (!r.compared) return `No eval-tagged votes matched the results file (${r.eval_votes} eval vote(s); unmatched evals: ${r.unmatched.join(', ') || 'none'}).`;
        const lines = [`Compared ${r.compared} vote(s) with judge verdicts: ${r.agree} agree, ${r.disagree} disagree · disagreement ${Math.round(r.disagreement_rate * 100)}%`];
        if (r.lenient.length) {
          lines.push('', 'Needs work, but the judge passed — tighten these evals:');
          for (const e of r.lenient) lines.push(`  ${e.eval} (${e.votes})${e.reasons.length ? ` — "${e.reasons.join('"; "')}"` : ''}`);
        }
        if (r.strict.length) {
          lines.push('', 'Helpful, but the judge failed — check for over-strict or flaky assertions:');
          for (const e of r.strict) lines.push(`  ${e.eval} (${e.votes})`);
        }
        if (r.unmatched.length) lines.push('', `Not in results: ${r.unmatched.join(', ')}`);
        return lines.join('\n');
      });
      return 0;
    }
    case 'export': {
      const res = exportVotes(projectDir, { redact: f.redact === true, out: f.out, now });
      print(res, asJson, () => `Wrote ${res.count} vote(s) to ${res.file}${res.redacted ? ' (redacted — read it before sharing; names in plain words are not detected)' : ' (NOT redacted — use --redact before sharing)'}.\nNothing was sent anywhere.`);
      return 0;
    }
    default:
      process.stderr.write(`votes: unknown command "${cmd}"\n\n${HELP}\n`);
      return 2;
  }
}

module.exports = {
  VERDICTS,
  KINDS,
  SOURCES,
  MAX_ACTIVE_VOTES,
  EVIDENCE_CAP,
  OBSERVATIONS_CAP,
  RESULTS_SHAPE,
  EXPORT_NOTICE,
  ageWeight,
  normalizeVerdict,
  normalizeTraits,
  newVoteId,
  signalId,
  parseId,
  storePaths,
  findProjectDir,
  validateVote,
  appendVote,
  rotateIfNeeded,
  readVotes,
  effectiveVotes,
  computeStats,
  htmlMeta,
  readVariantsManifest,
  parseVariantRef,
  resolveVariantTraits,
  readFindings,
  recentSubjects,
  collectEvidence,
  consolidate,
  confidenceOf,
  describeObservation,
  consolidateProject,
  memoryBlocks,
  writeObservations,
  normalizeResults,
  calibrate,
  redactText,
  redactVote,
  buildExport,
  exportVotes,
  parseArgs,
  main,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
