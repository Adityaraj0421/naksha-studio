#!/usr/bin/env node
'use strict';

// scan-transcripts.js — finds naksha invocations in local Claude Code session
// transcripts and prints a compact JSON summary for `/naksha-doctor --transcripts`.
//
// Reads only local files and makes no network calls. Excerpts are capped and
// obvious secrets (emails, API keys, long tokens) are masked before printing.
//
// Usage:
//   node scripts/scan-transcripts.js [path] [--limit N] [--max-chars N] [--subagents] [--include-dev]
//
//   path           a .jsonl file or a directory of them. Default:
//                  ~/.claude/projects/<cwd with every non-alphanumeric char replaced by "-">/
//   --limit N      newest N transcript files (default 20)
//   --max-chars N  cap for each task/output excerpt (default 2000)
//   --subagents    also read <session>/subagents/*.jsonl
//   --include-dev  keep turns that look like work on naksha itself (editing skills/design/ or
//                  commands/, or reading naksha's files from inside the working directory);
//                  these are skipped by default and counted as devTurnsSkipped
//
// The transcript format is not a published contract. Lines that are not JSON,
// and records without a recognisable message, are skipped and counted.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const opts = { target: null, limit: 20, maxChars: 2000, subagents: false, includeDev: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') opts.limit = Math.max(1, parseInt(argv[++i], 10) || 20);
    else if (a === '--max-chars') opts.maxChars = Math.max(200, parseInt(argv[++i], 10) || 2000);
    else if (a === '--subagents') opts.subagents = true;
    else if (a === '--include-dev') opts.includeDev = true;
    else if (!a.startsWith('--') && !opts.target) opts.target = a;
  }
  return opts;
}

function defaultTranscriptDir(cwd) {
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-'));
}

function listTranscripts(target, subagents) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const files = [];
  for (const name of fs.readdirSync(target)) {
    const p = path.join(target, name);
    let s;
    try { s = fs.statSync(p); } catch { continue; }
    if (s.isFile() && name.endsWith('.jsonl')) files.push(p);
    else if (s.isDirectory() && subagents) {
      const sub = path.join(p, 'subagents');
      if (fs.existsSync(sub)) {
        for (const f of fs.readdirSync(sub)) if (f.endsWith('.jsonl')) files.push(path.join(sub, f));
      }
    }
  }
  return files
    .map((f) => ({ f, m: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.m - a.m)
    .map((x) => x.f);
}

// ── naksha vocabulary ────────────────────────────────────────────────────────

function loadVocabulary() {
  const commands = new Set(
    fs.readdirSync(path.join(PLUGIN_ROOT, 'commands')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)),
  );
  const agents = new Set(
    fs.existsSync(path.join(PLUGIN_ROOT, 'agents'))
      ? fs.readdirSync(path.join(PLUGIN_ROOT, 'agents')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
      : [],
  );
  const roster = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'adapters/roles.json'), 'utf-8')).roles;
  const roleByRef = {};
  for (const r of roster) {
    if (r.reference.startsWith('skills/design/references/')) roleByRef[path.basename(r.reference)] = r.name;
  }
  return { commands, agents, roster, roleByRef, keywords: loadRoutingKeywords(roster) };
}

// Keyword hints per role, from two sources: the quoted phrases in SKILL.md's
// Step 3 routing rules, and (for roles those rules don't cover) the phrases in
// the role's roles.json `activate` text. Hints for the doctor to confirm, not a router.
const GROUP_LABELS = {
  'social media': ['Social Media Designer', 'Social Media Strategist', 'Social Media Copywriter'],
  email: ['Email Designer', 'Email Copywriter'],
  'data visualization': ['Data Viz Designer', 'Dashboard Architect'],
};
const GENERIC = new Set(['feature', 'flow', 'report', 'design output']);

function singular(k) {
  return k.length > 4 && /[^s]s$/.test(k) ? k.slice(0, -1) : k;
}

function loadRoutingKeywords(roster) {
  const map = {};
  const add = (role, kw) => {
    const k = kw.toLowerCase().replace(/[()]/g, '').replace(/^(about|of|for|the|a|an)\s+/, '').trim();
    if (k.length < 3 || GENERIC.has(singular(k))) return;
    (map[role] = map[role] || new Set()).add(k);
  };
  let skill = '';
  try { skill = fs.readFileSync(path.join(PLUGIN_ROOT, 'skills/design/SKILL.md'), 'utf-8'); } catch { /* optional */ }
  const specialists = roster.filter((r) => r.reference.startsWith('skills/design/references/'));
  for (const line of skill.split('\n')) {
    const m = line.match(/^- \*\*(.+?)\*\*[^:]*?\b(?:activate|activates|joins)\b[^:]*:\s*(.+)$/);
    if (!m) continue;
    const label = m[1].replace(/\s+roles?$/i, '').trim().toLowerCase();
    const quoted = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    if (quoted.length === 0) continue;
    const targets = GROUP_LABELS[label] || specialists.filter((r) => r.name.toLowerCase() === label).map((r) => r.name);
    for (const name of targets) for (const q of quoted) add(name, q);
  }
  for (const r of specialists) {
    if (map[r.name]) continue;
    const activate = String(r.activate || '');
    for (const inner of activate.matchAll(/\(([^)]*)\)/g)) inner[1].split(',').forEach((k) => add(r.name, k));
    for (const phrase of activate.replace(/\([^)]*\)/g, '').split(/,|\bor\b|(?<=\w{3})\/(?=\w{3})/)) {
      const words = phrase.trim().split(/\s+/).filter(Boolean);
      if (words.length > 1 && /ing$/i.test(words[0])) words.shift(); // drop the leading verb ("building …")
      const [head, tail] = words.join(' ').split(/\s+(?:with|so|to)\s+/);
      if (head) add(r.name, head);
      if (tail && !/\s/.test(tail)) add(r.name, tail);
    }
  }
  const out = {};
  for (const [k, v] of Object.entries(map)) out[k] = [...v];
  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordRoles(task, keywords) {
  const text = task.toLowerCase();
  const hits = {};
  for (const [role, kws] of Object.entries(keywords)) {
    // "kpi layouts" also matches "KPI layout"; "dashboard" also matches "dashboards"
    const matched = kws.filter((k) => new RegExp(`(^|[^a-z])${escapeRe(singular(k))}(s|es)?([^a-z]|$)`).test(text));
    if (matched.length) hits[role] = matched.slice(0, 5);
  }
  return hits;
}

// ── record helpers ───────────────────────────────────────────────────────────

function blocksOf(rec) {
  const c = rec && rec.message ? rec.message.content : rec ? rec.content : undefined;
  if (typeof c === 'string') return [{ type: 'text', text: c }];
  return Array.isArray(c) ? c.filter((b) => b && typeof b === 'object') : [];
}

function roleOf(rec) {
  return (rec.message && rec.message.role) || rec.type;
}

function textOf(blocks) {
  return blocks.filter((b) => b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n');
}

function cleanTask(text) {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-name>\s*([^<]*?)\s*<\/command-name>\s*(?:<command-args>([\s\S]*?)<\/command-args>)?/g, (_, n, a) => `${n} ${a || ''}`)
    .replace(/<\/?[a-z-]+>/g, '')
    .trim();
}

function redact(text, max) {
  const masked = text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b(?:sk|pk|rk|ghp|gho|ghs|xox[abp]|AKIA)[-_A-Za-z0-9]{12,}\b/g, '[secret]')
    .replace(/\b[A-Za-z0-9+/_-]{40,}={0,2}/g, '[token]');
  return masked.length > max ? masked.slice(0, max) + ` …[+${masked.length - max} chars]` : masked;
}

function commandIn(text, commands) {
  const tag = text.match(/<command-name>\s*\/?(?:[\w-]+:)?([\w-]+)\s*<\/command-name>/);
  if (tag && commands.has(tag[1])) return '/' + tag[1];
  const lead = text.trim().match(/^\/(?:[\w-]+:)?([\w-]+)/);
  if (lead && commands.has(lead[1])) return '/' + lead[1];
  return null;
}

function isPrompt(rec, blocks) {
  if (roleOf(rec) !== 'user' || rec.isMeta) return false;
  if (blocks.some((b) => b.type === 'tool_result')) return false;
  const text = textOf(blocks).trim();
  // interruption notices and local command echoes are not new tasks
  if (/^\[Request interrupted/.test(text) || /^<local-command-(stdout|stderr)>/.test(text)) return false;
  return text.length > 0;
}

// ── scan ─────────────────────────────────────────────────────────────────────

function newTurn(file, rec, text, vocab) {
  return {
    session: rec.sessionId || path.basename(file, '.jsonl'),
    file,
    timestamp: rec.timestamp || null,
    rawTask: text,
    command: commandIn(text, vocab.commands),
    skillInvoked: false,
    agents: new Set(),
    referencesLoaded: new Set(),
    rolesLoaded: new Set(),
    filesWritten: new Set(),
    cwd: typeof rec.cwd === 'string' ? rec.cwd.replace(/\/+$/, '') : '',
    editsPlugin: false,
    pluginFromCwd: false,
    assistantText: [],
  };
}

const WRITE_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];

function absorb(turn, blocks, vocab) {
  for (const b of blocks) {
    if (b.type === 'text' && typeof b.text === 'string') turn.assistantText.push(b.text);
    if (b.type !== 'tool_use') continue;
    const input = b.input && typeof b.input === 'object' ? b.input : {};
    const name = String(b.name || '');
    const fp = String(input.file_path || input.path || input.notebook_path || '');
    if (name === 'Skill') {
      const s = String(input.skill || input.name || input.command || '');
      if (/(^|:)design$|naksha/i.test(s)) turn.skillInvoked = true;
      // "naksha:design" is the orchestrator skill; any other naksha name is a command run through Skill
      const sub = s.split(':').pop();
      if (sub !== 'design' && vocab.commands.has(sub)) turn.command = turn.command || '/' + sub;
    }
    if (name === 'Task' || name === 'Agent') {
      const t = String(input.subagent_type || input.agent || '').split(':').pop();
      if (vocab.agents.has(t)) turn.agents.add(t);
    }
    if (fp) {
      const ref = fp.match(/skills\/design\/references\/([\w.-]+\.md)/);
      const pluginFile = /skills\/design\/(SKILL\.md$|references\/)/.test(fp);
      if (/skills\/design\/SKILL\.md$/.test(fp)) turn.skillInvoked = true;
      // An installed plugin lives outside the project; reading naksha's own files
      // from inside the working directory means someone is developing naksha.
      if (pluginFile && turn.cwd && fp.startsWith(turn.cwd + '/')) turn.pluginFromCwd = true;
      if (ref && !WRITE_TOOLS.includes(name)) {
        turn.referencesLoaded.add(ref[1]);
        if (vocab.roleByRef[ref[1]]) turn.rolesLoaded.add(vocab.roleByRef[ref[1]]);
      }
      if (WRITE_TOOLS.includes(name)) {
        turn.filesWritten.add(fp);
        if (/(^|\/)(skills\/design|commands)\//.test(fp)) turn.editsPlugin = true;
      }
    }
  }
}

function finish(turn, vocab, opts) {
  const isNaksha = turn.command || turn.skillInvoked || turn.agents.size || turn.referencesLoaded.size;
  if (!isNaksha) return null;
  const output = turn.assistantText.join('\n').trim();
  const task = cleanTask(turn.rawTask);
  const rolesNamed = {};
  for (const r of vocab.roster) {
    const n = (output.match(new RegExp(`\\b${escapeRe(r.name)}\\b`, 'g')) || []).length;
    if (n) rolesNamed[r.name] = n;
  }
  const hints = keywordRoles(task, vocab.keywords);
  const loaded = [...turn.rolesLoaded];
  return {
    session: turn.session,
    file: turn.file,
    timestamp: turn.timestamp,
    command: turn.command,
    task: redact(task, opts.maxChars),
    rolesLoaded: loaded,
    rolesNamed,
    referencesLoaded: [...turn.referencesLoaded],
    agents: [...turn.agents],
    keywordRoles: hints,
    keywordRolesNotLoaded: Object.keys(hints).filter((r) => !loaded.includes(r)),
    filesWritten: [...turn.filesWritten],
    development: turn.editsPlugin || turn.pluginFromCwd,
    outputChars: output.length,
    output: redact(output, opts.maxChars),
  };
}

function scanFile(file, vocab, opts, counts) {
  const invocations = [];
  let turn = null;
  const close = () => {
    if (!turn) return;
    const inv = finish(turn, vocab, opts);
    if (inv && inv.development && !opts.includeDev) counts.devTurnsSkipped++;
    else if (inv) invocations.push(inv);
    turn = null;
  };
  let data;
  try { data = fs.readFileSync(file, 'utf-8'); } catch { counts.filesUnreadable++; return invocations; }
  for (const line of data.split('\n')) {
    if (!line.trim()) continue;
    counts.lines++;
    let rec;
    try { rec = JSON.parse(line); } catch { counts.unparseable++; continue; }
    if (!rec || typeof rec !== 'object') { counts.unparseable++; continue; }
    const blocks = blocksOf(rec);
    const role = roleOf(rec);
    if ((role !== 'user' && role !== 'assistant') || blocks.length === 0) { counts.ignored++; continue; }
    counts.messages++;
    if (isPrompt(rec, blocks)) {
      close();
      turn = newTurn(file, rec, textOf(blocks), vocab);
    } else if (turn && role === 'assistant') {
      absorb(turn, blocks, vocab);
    } else if (turn && role === 'user') {
      const t = textOf(blocks);
      if (rec.isMeta && t && !turn.command) turn.command = commandIn(t, vocab.commands);
    }
  }
  close();
  return invocations;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const target = path.resolve(opts.target || defaultTranscriptDir(process.cwd()));
  const counts = { files: 0, filesUnreadable: 0, lines: 0, unparseable: 0, ignored: 0, messages: 0, devTurnsSkipped: 0 };
  const report = { target, counts, invocations: [] };
  if (!fs.existsSync(target)) {
    report.error = `no transcripts found at ${target} — pass a .jsonl file or a directory`;
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    process.exit(2);
  }
  const vocab = loadVocabulary();
  const files = listTranscripts(target, opts.subagents).slice(0, opts.limit);
  counts.files = files.length;
  for (const f of files) report.invocations.push(...scanFile(f, vocab, opts, counts));
  counts.invocations = report.invocations.length;
  counts.sessionsWithNaksha = new Set(report.invocations.map((i) => i.session)).size;
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

module.exports = { scanFile, loadVocabulary, keywordRoles, cleanTask, redact };

if (require.main === module) main();
