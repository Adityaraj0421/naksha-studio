#!/usr/bin/env node
'use strict';
/**
 * Naksha — PostToolUse lint hook worker (called by design-lint-hook.sh).
 *
 * Reads the hook payload from stdin, lints the edited file with design-lint.js
 * and prints one JSON object: a one-line systemMessage for the user plus
 * additionalContext with the top findings so Claude can fix them.
 * Never blocks the tool call, never writes files, always exits 0.
 */

const fs = require('fs');
const path = require('path');

const PASS = { continue: true };
const UI_FILE = /\.(html?|css|scss|jsx|tsx|vue|svelte)$/i;
const MAX_BYTES = 512 * 1024;
const MAX_DETAILS = 5;

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function pickFilePath(input) {
  const ti = (input && input.tool_input) || {};
  const tr = (input && input.tool_response) || {};
  const candidates = [ti.file_path, ti.path, tr.filePath, tr.file_path];
  return candidates.find(c => typeof c === 'string' && c.trim()) || null;
}

function run() {
  const input = readInput();
  const filePath = pickFilePath(input);
  if (!filePath || !UI_FILE.test(filePath)) return PASS;

  const cwd = typeof input.cwd === 'string' && fs.existsSync(input.cwd) ? input.cwd : process.cwd();
  const abs = path.resolve(cwd, filePath);
  let stat;
  try { stat = fs.statSync(abs); } catch { return PASS; }
  if (!stat.isFile() || stat.size > MAX_BYTES) return PASS;

  const lint = require(path.join(__dirname, 'design-lint.js'));
  const config = lint.loadConfig(cwd);
  if (config.hook === false) return PASS;

  const report = lint.lintFiles([abs], { cwd, config });
  if (!report.issues.length) return PASS;

  const name = path.basename(abs);
  const rel = report.filesLinted[0] || name;
  const errors = report.failed;
  const warnings = report.warnings;
  const relArg = /\s/.test(rel) ? `"${rel}"` : rel;
  const ruleList =report.issues.map(i => i.rule).slice(0, 4).join(', ') + (report.issues.length > 4 ? ', …' : '');
  const counts = [errors && `${errors} error${errors === 1 ? '' : 's'}`, warnings && `${warnings} warning${warnings === 1 ? '' : 's'}`]
    .filter(Boolean).join(', ');

  const ordered = [...report.issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  const details = ordered.slice(0, MAX_DETAILS).map(i =>
    `- [${i.severity}] ${i.rule}${i.line ? ` (line ${i.line})` : ''}: ${i.message}. Fix: ${i.fix}`);
  if (ordered.length > MAX_DETAILS) details.push(`- …and ${ordered.length - MAX_DETAILS} more`);

  return {
    continue: true,
    systemMessage: `naksha lint · ${name}: ${counts} (${ruleList}). Run /design-detect ${relArg} for role-by-role fixes.`,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Naksha design-lint (deterministic, non-blocking) found issues in ${rel}:\n${details.join('\n')}\nFix these if they are in scope for the current task.`,
    },
  };
}

try {
  emit(run());
} catch {
  emit(PASS);
}
process.exitCode = 0;
