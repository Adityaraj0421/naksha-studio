#!/usr/bin/env node
// memory-apply-hook.js — Stop hook: applies <!-- naksha-memory-update --> blocks to
// .naksha/project.json deterministically (no model call, never blocks the session).
//
// Replaces the old Stop *prompt* hook, which asked the model to apply the blocks and
// could keep a turn from ending (it re-judged its own follow-up wording in a loop).
//
// - Reads the hook input (stdin JSON: transcript_path, cwd, session_id).
// - Scans only transcript lines added since the last run for this session (the byte
//   offset is kept in .naksha/.memory-hook.json), so every block is applied once.
// - Takes blocks only from the assistant's own text, never from tool results or user
//   messages, and ignores blocks inside ``` code fences (docs examples).
// - Validates each block (docs/naksha-memory-schema.md, types/v5.ts MemoryUpdateBlock)
//   and writes project.json atomically (temp file + rename).
// - Problems go to ~/.naksha/hook-errors.log. Always prints valid JSON and exits 0.
//
// Usage: node memory-apply-hook.js < hook-input.json

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const BLOCK_RE = /<!--\s*naksha-memory-update\s*([\s\S]*?)-->/g;
const FENCE_RE = /```[\s\S]*?```/g;
// Top-level ProjectBrain fields a block may write (types/v5.ts).
const ALLOWED_ROOTS = new Set([
  'name', 'brand', 'framework', 'tokenFormat', 'designSystemPath', 'createdAt', 'updatedAt',
  'constraints', 'component_patterns', 'browser_findings', 'taste', 'budgets', 'schema_version',
]);
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SEGMENT_RE = /^[A-Za-z_][\w-]*$/;
const BROWSER_FINDINGS_CAP = 20;
const BROWSER_FINDINGS_MAX_AGE_DAYS = 30;
const LEDGER_SESSIONS_CAP = 50;

function done(summary) {
  const out = { continue: true };
  if (summary) out.systemMessage = summary;
  process.stdout.write(JSON.stringify(out) + '\n');
  process.exit(0);
}

function logError(projectFile, message) {
  try {
    const dir = path.join(os.homedir(), '.naksha');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'hook-errors.log'),
      `[${new Date().toISOString()}] [${projectFile || 'unknown'}] memory-apply-hook: ${message}\n`);
  } catch (_) { /* logging must never break the hook */ }
}

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) { return ''; }
}

/** .naksha/project.json in dir or up to 3 parents (same rule as the commands). */
function findProjectJson(startDir) {
  let cur = path.resolve(startDir);
  for (let i = 0; i <= 3; i++) {
    const candidate = path.join(cur, '.naksha', 'project.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

/** Text the assistant wrote in one transcript record (not tool results, not user turns). */
function assistantText(record) {
  if (!record || record.type !== 'assistant' || record.isSidechain) return '';
  const content = record.message && record.message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((c) => c && c.type === 'text' && typeof c.text === 'string').map((c) => c.text).join('\n');
}

function extractBlocks(text) {
  const blocks = [];
  const unfenced = text.replace(FENCE_RE, '');
  for (const m of unfenced.matchAll(BLOCK_RE)) blocks.push(m[1].trim());
  return blocks;
}

function validatePath(p) {
  if (typeof p !== 'string' || !p) return 'path must be a non-empty string';
  const segs = p.split('.');
  if (!ALLOWED_ROOTS.has(segs[0])) return `unknown top-level field "${segs[0]}"`;
  for (const s of segs) {
    if (BAD_KEYS.has(s) || !SEGMENT_RE.test(s)) return `invalid path segment "${s}"`;
  }
  return null;
}

function setAtPath(obj, p, value) {
  const segs = p.split('.');
  let cur = obj;
  for (const s of segs.slice(0, -1)) {
    if (typeof cur[s] !== 'object' || cur[s] === null || Array.isArray(cur[s])) cur[s] = {};
    cur = cur[s];
  }
  cur[segs[segs.length - 1]] = value;
}

function applyBlock(project, block) {
  if (block.type === 'project_json_patch') {
    const err = validatePath(block.path);
    if (err) return err;
    if (!('value' in block)) return 'project_json_patch has no value';
    setAtPath(project, block.path, block.value);
    return null;
  }
  if (block.type === 'browser_finding_write') {
    const f = block.finding;
    if (!f || typeof f !== 'object' || Array.isArray(f)) return 'browser_finding_write needs a finding object';
    if (typeof f.url !== 'string' || typeof f.captured_at !== 'string') return 'finding needs url and captured_at strings';
    const cutoff = Date.now() - BROWSER_FINDINGS_MAX_AGE_DAYS * 864e5;
    const kept = (Array.isArray(project.browser_findings) ? project.browser_findings : [])
      .filter((x) => !(x && Date.parse(x.captured_at) < cutoff));
    project.browser_findings = [f, ...kept].slice(0, BROWSER_FINDINGS_CAP);
    return null;
  }
  return `unknown block type "${block.type}"`;
}

function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function main() {
  let input = {};
  try { input = JSON.parse(readStdin() || '{}'); } catch (_) { done(); }
  const transcript = input.transcript_path;
  if (!transcript || !fs.existsSync(transcript)) done();

  const cwd = input.cwd && fs.existsSync(input.cwd) ? input.cwd : process.cwd();
  const projectFile = findProjectJson(cwd);
  const sessionKey = String(input.session_id || transcript);

  // Where this session's transcript was last read up to.
  const ledgerFile = projectFile ? path.join(path.dirname(projectFile), '.memory-hook.json') : null;
  let ledger = { sessions: {} };
  if (ledgerFile) {
    try { ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8')); } catch (_) { /* first run */ }
    if (!ledger || typeof ledger.sessions !== 'object') ledger = { sessions: {} };
  }
  const size = fs.statSync(transcript).size;
  let offset = (ledger.sessions[sessionKey] && ledger.sessions[sessionKey].offset) || 0;
  if (offset > size) offset = 0; // transcript was replaced

  let chunk = '';
  try {
    const fd = fs.openSync(transcript, 'r');
    const buf = Buffer.alloc(size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    chunk = buf.toString('utf8');
  } catch (e) {
    logError(projectFile, `could not read transcript ${transcript}: ${e.message}`);
    done();
  }
  // Only consume complete lines; a partial last line is read next time.
  const lastNl = chunk.lastIndexOf('\n');
  const complete = lastNl >= 0 ? chunk.slice(0, lastNl + 1) : '';
  const newOffset = offset + Buffer.byteLength(complete, 'utf8');

  const blocks = [];
  for (const line of complete.split('\n')) {
    if (!line.trim() || !line.includes('naksha-memory-update')) continue;
    let record;
    try { record = JSON.parse(line); } catch (_) { continue; }
    blocks.push(...extractBlocks(assistantText(record)));
  }

  if (!blocks.length) {
    if (ledgerFile) saveLedger(ledgerFile, ledger, sessionKey, newOffset);
    done();
  }
  if (!projectFile) {
    logError(null, `${blocks.length} memory block(s) found but no .naksha/project.json within 3 levels of ${cwd}; skipped`);
    done();
  }

  let project;
  try {
    project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
  } catch (e) {
    logError(projectFile, `project.json is not valid JSON (${e.message}); ${blocks.length} block(s) not applied`);
    done(); // keep the offset so the blocks are retried once the file is fixed
  }

  let applied = 0;
  const paths = [];
  for (const raw of blocks) {
    let block;
    try { block = JSON.parse(raw); } catch (e) {
      logError(projectFile, `malformed block JSON (${e.message}): ${raw.slice(0, 120)}`);
      continue;
    }
    const err = applyBlock(project, block);
    if (err) { logError(projectFile, `rejected ${block.type || 'block'}: ${err}`); continue; }
    applied++;
    paths.push(block.type === 'browser_finding_write' ? 'browser_findings' : block.path);
  }

  if (applied) {
    try {
      writeAtomic(projectFile, JSON.stringify(project, null, 2) + '\n');
    } catch (e) {
      logError(projectFile, `could not write project.json: ${e.message}`);
      done();
    }
  }
  saveLedger(ledgerFile, ledger, sessionKey, newOffset);
  const uniq = [...new Set(paths)];
  done(applied ? `naksha memory: applied ${applied} update(s) to .naksha/project.json (${uniq.join(', ')})` : null);
}

function saveLedger(file, ledger, key, offset) {
  ledger.sessions[key] = { offset, at: new Date().toISOString() };
  const keys = Object.keys(ledger.sessions);
  if (keys.length > LEDGER_SESSIONS_CAP) {
    keys.sort((a, b) => String(ledger.sessions[a].at).localeCompare(String(ledger.sessions[b].at)));
    for (const k of keys.slice(0, keys.length - LEDGER_SESSIONS_CAP)) delete ledger.sessions[k];
  }
  try { writeAtomic(file, JSON.stringify(ledger) + '\n'); } catch (_) { /* next run rescans; patches are idempotent */ }
}

if (require.main === module) {
  try { main(); } catch (e) { logError(null, `unexpected error: ${e.message}`); done(); }
}

module.exports = { extractBlocks, assistantText, validatePath, applyBlock, findProjectJson };
