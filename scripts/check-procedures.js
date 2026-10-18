#!/usr/bin/env node
'use strict';
// check-procedures.js — structural checks for skills/design/procedures/.
// Procedures are reusable step files that commands pull in with
// "Read and follow ${CLAUDE_PLUGIN_ROOT}/skills/design/procedures/<name>.md".
//   1. every procedures/ path referenced from commands, agents, SKILL.md or another
//      procedure exists on disk
//   2. every procedures/*.md is referenced by at least one command
//   3. every procedures/*.md has a "# " title and its fenced ```json blocks parse
//      (callers and dashboards parse those result blocks, so the examples must be valid)
//   4. every procedures/*.js is a single function expression that compiles, and is
//      referenced by a procedure (no orphan helpers)
// Usage: node scripts/check-procedures.js [--root <repo dir>]
// Exit: 0 when clean, 1 when any check fails.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootIdx = process.argv.indexOf('--root');
const ROOT = rootIdx > 0 ? path.resolve(process.argv[rootIdx + 1]) : path.join(__dirname, '..');
const PROC_DIR = path.join(ROOT, 'skills/design/procedures');
const REF = /skills\/design\/procedures\/([A-Za-z0-9._-]+)/g;

const listMd = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => path.join(dir, f)) : []);
const rel = (p) => path.relative(ROOT, p);
const problems = [];

console.log('═══════════════════════════════════════');
console.log('  check-procedures');
console.log('═══════════════════════════════════════');

const procFiles = fs.existsSync(PROC_DIR) ? fs.readdirSync(PROC_DIR).filter((f) => !f.startsWith('.')) : [];
const commandFiles = listMd(path.join(ROOT, 'commands'));
const sources = [
  ...commandFiles,
  ...listMd(path.join(ROOT, 'agents')),
  path.join(ROOT, 'skills/design/SKILL.md'),
  ...procFiles.filter((f) => f.endsWith('.md')).map((f) => path.join(PROC_DIR, f)),
].filter((f) => fs.existsSync(f));

// 1. referenced paths exist; collect who references what
const referencedBy = {}; // procedure file name -> Set of referencing files
for (const src of sources) {
  const text = fs.readFileSync(src, 'utf-8');
  for (const m of text.matchAll(REF)) {
    const name = m[1].replace(/[.]+$/, ''); // drop sentence-ending dots
    (referencedBy[name] = referencedBy[name] || new Set()).add(src);
    if (!fs.existsSync(path.join(PROC_DIR, name))) {
      problems.push(`${rel(src)} references skills/design/procedures/${name}, which does not exist`);
    }
  }
}

for (const file of procFiles) {
  const full = path.join(PROC_DIR, file);
  const refs = [...(referencedBy[file] || [])];
  if (file.endsWith('.md')) {
    // 2. used by at least one command
    if (!refs.some((r) => commandFiles.includes(r))) {
      problems.push(`skills/design/procedures/${file} is not referenced by any command in commands/`);
    }
    // 3. title + valid JSON examples
    const text = fs.readFileSync(full, 'utf-8');
    if (!/^# \S/m.test(text)) problems.push(`skills/design/procedures/${file} has no "# " title`);
    let n = 0;
    for (const m of text.matchAll(/```json\n([\s\S]*?)```/g)) {
      n++;
      try { JSON.parse(m[1]); } catch (e) {
        problems.push(`skills/design/procedures/${file}: json block ${n} does not parse (${e.message})`);
      }
    }
  } else if (file.endsWith('.js')) {
    // 4. compiles as one function expression, and some procedure uses it
    const src = fs.readFileSync(full, 'utf-8');
    try {
      const fn = new vm.Script(`(${src})`, { filename: file }).runInNewContext({});
      if (typeof fn !== 'function') problems.push(`skills/design/procedures/${file} is not a function expression`);
    } catch (e) {
      problems.push(`skills/design/procedures/${file} does not compile as a function expression (${e.message})`);
    }
    if (!refs.some((r) => r.startsWith(PROC_DIR))) {
      problems.push(`skills/design/procedures/${file} is not referenced by any procedure`);
    }
  }
}

const mdCount = procFiles.filter((f) => f.endsWith('.md')).length;
if (problems.length) {
  for (const p of problems) console.log(`  FAIL  ${p}`);
  console.log('');
  console.log(`check-procedures: FAIL (${problems.length} problem(s))`);
  process.exit(1);
}
for (const file of procFiles) {
  const users = [...(referencedBy[file] || [])].map(rel).join(', ');
  console.log(`  PASS  ${file} ← ${users}`);
}
console.log('');
console.log(`check-procedures: PASS (${mdCount} procedure(s), ${procFiles.length - mdCount} helper(s))`);
