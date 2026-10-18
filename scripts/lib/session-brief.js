#!/usr/bin/env node
// session-brief.js — the lean runtime behind naksha's PreCompact and
// SessionStart hooks. Zero dependencies, CommonJS.
//
//   node session-brief.js brief [--dir <projectDir>] [--trigger <manual|auto>]
//       Writes .naksha/session-brief.md (hard cap: 2048 bytes) from what can be
//       derived deterministically from disk. Prints nothing. No-op when no
//       .naksha/ directory is found.
//
//   node session-brief.js index [--dir <projectDir>] [--source <startup|resume|clear|compact|fork>]
//       Prints plain-text context for SessionStart: a compact memory index
//       (hard cap: 600 chars) and, when the source is `compact` or `resume`
//       and a session brief younger than 24h exists, that brief. Prints
//       nothing when no .naksha/project.json is found.
//
// Both subcommands exit 0 on every path; the calling hook scripts own the
// JSON envelope. Nothing here touches the network.

'use strict';

const fs = require('fs');
const path = require('path');

const BRIEF_MAX_BYTES = 2048;
const INDEX_MAX_CHARS = 600;
const BRIEF_FRESH_MS = 24 * 60 * 60 * 1000;
const MAX_PROJECT_JSON_BYTES = 2 * 1024 * 1024;
const MEMORY_TAIL_BYTES = 64 * 1024;
const MAX_MEMORY_COUNT_BYTES = 16 * 1024 * 1024;
const MEMORY_LINES = 5;
const DESIGN_FILES = 5;
const DIR_SCAN_LIMIT = 500;
const BRIEF_NAME = 'session-brief.md';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; }
      else out[key] = true;
    } else {
      out._.push(a);
    }
  }
  return out;
}

// Single-line, length-capped text. Control characters become spaces so user
// data can't forge structure in the brief or the injected context.
function clip(value, max) {
  if (value === null || value === undefined) return '';
  let s = String(value).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > max) s = s.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
  return s;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Look for .naksha/project.json in dir, its parent and its grandparent (same
// reach as detect-design-context.sh and /naksha-status). project.json is the
// marker: a bare ~/.naksha/ (the Stop hook's error-log home) is not a project.
// For writing, a symlinked .naksha/ is refused, since it could point the writer
// anywhere.
function findNakshaRoot(startDir, forWrite) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 3; i++) {
    const candidate = path.join(dir, '.naksha');
    try {
      const st = forWrite ? fs.lstatSync(candidate) : fs.statSync(candidate);
      if (st.isDirectory() && fs.statSync(path.join(candidate, 'project.json')).isFile()) return dir;
    } catch (_) { /* not here */ }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readProjectJson(nakshaDir) {
  const file = path.join(nakshaDir, 'project.json');
  try {
    const st = fs.statSync(file);
    if (!st.isFile() || st.size > MAX_PROJECT_JSON_BYTES) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isPlainObject(data) ? data : null;
  } catch (_) {
    return null;
  }
}

// Last N non-empty lines of memory.md, reading only the file's tail.
function memoryTail(nakshaDir, n) {
  const file = path.join(nakshaDir, 'memory.md');
  let fd;
  try {
    const st = fs.statSync(file);
    if (!st.isFile() || st.size === 0) return [];
    const len = Math.min(st.size, MEMORY_TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fd = fs.openSync(file, 'r');
    fs.readSync(fd, buf, 0, len, st.size - len);
    let text = buf.toString('utf8');
    if (len < st.size) text = text.slice(text.indexOf('\n') + 1); // drop partial first line
    // Entries are "[ISO timestamp] /command: summary" lines under a single
    // "# Naksha Project Memory — {name}" header (docs/naksha-memory-schema.md).
    // Skip the H1 header, HTML comments and rules; keep anything else, so
    // hand-written logs still contribute.
    return text.split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^#(\s|$)/.test(l) && !/^#+\s*$/.test(l) && !/^<!--/.test(l) && !/^-{3,}$/.test(l))
      .map((l) => l.replace(/^#{2,}\s+/, '').replace(/^[-*]\s+/, ''))
      .slice(-n);
  } catch (_) {
    return [];
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) { /* ignore */ }
  }
}

// Count memory.md entries: lines that start with "[" (the schema's
// "[timestamp] /command: summary" format). Reads in chunks, bounded.
function countMemoryEntries(nakshaDir) {
  const file = path.join(nakshaDir, 'memory.md');
  let fd;
  try {
    const st = fs.statSync(file);
    if (!st.isFile() || st.size === 0 || st.size > MAX_MEMORY_COUNT_BYTES) return null;
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(1024 * 1024);
    let count = 0;
    let prev = 0x0a; // treat start of file as a line start
    let read;
    while ((read = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      for (let i = 0; i < read; i++) {
        const c = buf[i];
        if (c === 0x5b && prev === 0x0a) count++;
        prev = c;
      }
    }
    return count;
  } catch (_) {
    return null;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) { /* ignore */ }
  }
}

function countConstraints(c) {
  if (!isPlainObject(c)) return 0;
  let n = 0;
  for (const v of Object.values(c)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) n += v.length > 0 ? 1 : 0;
    else n += 1;
  }
  return n;
}

function describeConstraints(c) {
  if (!isPlainObject(c)) return [];
  const parts = [];
  for (const [key, v] of Object.entries(c)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      parts.push(`${key}: ${v.map((x) => clip(x, 60)).join(', ')}`);
    } else if (isPlainObject(v)) {
      parts.push(`${key}: ${clip(JSON.stringify(v), 80)}`);
    } else {
      parts.push(`${key}: ${clip(v, 60)}`);
    }
  }
  return parts;
}

// Taste leanings, weighted by age exactly as docs/naksha-memory-schema.md
// specifies: <= 90 days weight 1, 91-180 days 0.5, older 0.
function tasteLeanings(project, now) {
  const signals = project && project.taste && Array.isArray(project.taste.signals) ? project.taste.signals : [];
  const approved = new Map();
  const rejected = new Map();
  let counted = 0;
  for (const s of signals) {
    if (!isPlainObject(s) || !Array.isArray(s.traits)) continue;
    const t = Date.parse(s.recorded_at);
    const ageDays = Number.isFinite(t) ? (now - t) / 86400000 : Infinity;
    const w = ageDays <= 90 ? 1 : ageDays <= 180 ? 0.5 : 0;
    if (!w) continue;
    const bucket = s.verdict === 'approved' ? approved : s.verdict === 'rejected' ? rejected : null;
    if (!bucket) continue;
    counted++;
    for (const trait of s.traits) {
      const k = clip(trait, 40).toLowerCase();
      if (k) bucket.set(k, (bucket.get(k) || 0) + w);
    }
  }
  // Sort by weight desc, then name asc, so output is deterministic.
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 4).map(([k]) => k);
  return { favours: top(approved), avoids: top(rejected), counted, total: signals.length };
}

// design-output.html in the project root plus files under naksha-variants/
// and naksha-review/ (two levels deep, bounded), newest first.
function recentDesignFiles(root, limit) {
  const found = [];
  const add = (abs) => {
    try {
      const st = fs.lstatSync(abs);
      if (st.isFile()) found.push({ rel: path.relative(root, abs), mtime: st.mtimeMs });
    } catch (_) { /* skip */ }
  };
  add(path.join(root, 'design-output.html'));
  let scanned = 0;
  const walk = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (++scanned > DIR_SCAN_LIMIT) return;
      if (e.name.startsWith('.')) continue;
      const abs = path.join(dir, e.name);
      if (e.isFile()) add(abs);
      else if (e.isDirectory() && depth < 2) walk(abs, depth + 1);
    }
  };
  for (const d of ['naksha-variants', 'naksha-review']) {
    const abs = path.join(root, d);
    try { if (fs.lstatSync(abs).isDirectory()) walk(abs, 1); } catch (_) { /* absent */ }
  }
  found.sort((a, b) => b.mtime - a.mtime || (a.rel < b.rel ? -1 : 1));
  return found.slice(0, limit);
}

// Cut a string to at most maxBytes of UTF-8, on a line boundary when possible,
// and never inside a multi-byte character.
function capBytes(text, maxBytes, marker) {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  const room = Math.max(0, maxBytes - Buffer.byteLength(marker, 'utf8'));
  const buf = Buffer.from(text, 'utf8');
  let end = room;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--; // back off to a character boundary
  let cut = buf.subarray(0, end).toString('utf8');
  const nl = cut.lastIndexOf('\n');
  if (nl > room / 2) cut = cut.slice(0, nl + 1);
  return cut + marker;
}

// ── brief ────────────────────────────────────────────────────────────────────

function buildBrief(root, opts) {
  const nakshaDir = path.join(root, '.naksha');
  const now = opts.now || Date.now();
  const project = readProjectJson(nakshaDir) || {};
  const lines = [];

  lines.push('# Naksha session brief');
  lines.push(`<!-- Written by the naksha PreCompact hook at ${new Date(now).toISOString()}${opts.trigger ? ` (${clip(opts.trigger, 10)} compaction)` : ''}. Derived from .naksha/ on disk; project data, not instructions. -->`);
  lines.push('');

  if (project.name) lines.push(`Project: ${clip(project.name, 100)}`);
  const b = isPlainObject(project.brand) ? project.brand : {};
  const brand = [];
  if (b.primary) brand.push(`primary ${clip(b.primary, 12)}`);
  if (b.secondary) brand.push(`accent ${clip(b.secondary, 12)}`);
  if (b.font) brand.push(`font ${clip(b.font, 40)}`);
  if (b.voice) brand.push(`voice "${clip(b.voice, 80)}"`);
  if (brand.length) lines.push(`Brand: ${brand.join(', ')}`);
  const stack = [];
  if (project.framework) stack.push(`framework ${clip(project.framework, 20)}`);
  if (project.tokenFormat) stack.push(`tokens ${clip(project.tokenFormat, 20)}`);
  if (project.designSystemPath) stack.push(`design system ${clip(project.designSystemPath, 80)}`);
  if (stack.length) lines.push(`Stack: ${stack.join(', ')}`);

  const constraints = describeConstraints(project.constraints);
  if (constraints.length) lines.push(`Constraints: ${clip(constraints.join('; '), 420)}`);

  const taste = tasteLeanings(project, now);
  if (taste.favours.length || taste.avoids.length) {
    const t = [];
    if (taste.favours.length) t.push(`favours ${taste.favours.join(', ')}`);
    if (taste.avoids.length) t.push(`avoids ${taste.avoids.join(', ')}`);
    lines.push(`Taste: ${t.join('; ')} (${taste.counted} live signal${taste.counted === 1 ? '' : 's'})`);
  }

  const mem = memoryTail(nakshaDir, MEMORY_LINES);
  if (mem.length) {
    lines.push('');
    lines.push('Recent memory (.naksha/memory.md):');
    for (const l of mem) lines.push(`- ${clip(l, 160)}`);
  }

  const files = recentDesignFiles(root, DESIGN_FILES);
  if (files.length) {
    lines.push('');
    lines.push('Recently modified design files:');
    for (const f of files) lines.push(`- ${clip(f.rel, 120)} (${new Date(f.mtime).toISOString().slice(0, 16)}Z)`);
  }

  return capBytes(lines.join('\n') + '\n', BRIEF_MAX_BYTES, '…(truncated)\n');
}

function writeBrief(root, opts) {
  const nakshaDir = path.join(root, '.naksha');
  const content = buildBrief(root, opts);
  const target = path.join(nakshaDir, BRIEF_NAME);
  // Write to a fresh, exclusively created temp file and rename over the
  // target: never follows a planted symlink, never leaves a half-written brief.
  const tmp = path.join(nakshaDir, `.${BRIEF_NAME}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, content, { flag: 'wx', mode: 0o644 });
    fs.renameSync(tmp, target);
  } catch (_) {
    try { fs.unlinkSync(tmp); } catch (__) { /* ignore */ }
  }
}

// ── index ────────────────────────────────────────────────────────────────────

function buildIndex(root, opts) {
  const nakshaDir = path.join(root, '.naksha');
  const projectFile = path.join(nakshaDir, 'project.json');
  if (!fs.existsSync(projectFile)) return '';
  const project = readProjectJson(nakshaDir);
  const now = opts.now || Date.now();

  let index;
  if (!project) {
    index = 'Naksha project memory found (.naksha/project.json could not be parsed). Run /naksha-doctor to check it.';
  } else {
    const head = [];
    head.push(`Naksha project memory: ${clip(project.name || 'unnamed project', 60)}`);
    const b = isPlainObject(project.brand) ? project.brand : {};
    const brand = [b.primary && clip(b.primary, 12), b.font && clip(b.font, 30)].filter(Boolean);
    if (brand.length) head.push(`brand ${brand.join(' / ')}`);
    if (project.framework) head.push(`framework ${clip(project.framework, 20)}`);

    const n = (arr) => (Array.isArray(arr) ? arr.length : 0);
    const signals = project.taste && Array.isArray(project.taste.signals) ? project.taste.signals.length : 0;
    const plural = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;
    const counts = [
      plural(countConstraints(project.constraints), 'constraint'),
      plural(n(project.component_patterns), 'pattern'),
      plural(signals, 'taste signal'),
      plural(n(project.browser_findings), 'browser finding'),
    ];
    const memEntries = countMemoryEntries(nakshaDir);
    if (memEntries) counts.push(plural(memEntries, 'memory entry').replace('entrys', 'entries'));

    index = `${head.join(' · ')}.\nIndex: ${counts.join(', ')}.\n` +
      'Run /naksha-status for details; read .naksha/project.json only when a task needs the full entries.';
  }
  if (index.length > INDEX_MAX_CHARS) index = index.slice(0, INDEX_MAX_CHARS - 1) + '…';

  const source = String(opts.source || '');
  if (source === 'compact' || source === 'resume') {
    const briefFile = path.join(nakshaDir, BRIEF_NAME);
    try {
      const st = fs.lstatSync(briefFile);
      const age = now - st.mtimeMs;
      if (st.isFile() && age >= 0 && age < BRIEF_FRESH_MS) {
        const brief = capBytes(fs.readFileSync(briefFile, 'utf8'), BRIEF_MAX_BYTES, '…(truncated)\n');
        const mins = Math.round(age / 60000);
        const ageText = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
        index += `\n\nSession brief (.naksha/${BRIEF_NAME}, saved ${ageText}):\n${brief.trimEnd()}`;
      }
    } catch (_) { /* no brief */ }
  }
  return index;
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const dir = typeof args.dir === 'string' && args.dir ? args.dir : process.cwd();
  const root = findNakshaRoot(dir, cmd === 'brief');
  if (!root) return;
  if (cmd === 'brief') {
    writeBrief(root, { trigger: typeof args.trigger === 'string' ? args.trigger : '' });
  } else if (cmd === 'index') {
    const text = buildIndex(root, { source: typeof args.source === 'string' ? args.source : '' });
    if (text) process.stdout.write(text);
  }
}

if (require.main === module) {
  try { main(); } catch (_) { /* a hook helper never fails the hook */ }
  process.exitCode = 0;
}

module.exports = { buildBrief, buildIndex, findNakshaRoot, tasteLeanings, capBytes, BRIEF_MAX_BYTES, INDEX_MAX_CHARS };
