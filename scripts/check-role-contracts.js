#!/usr/bin/env node
'use strict';

// check-role-contracts.js — every specialist role reference must end its
// guidance with a "## Quality Contract" section holding three non-empty
// subsections: Red flags, Excuses to reject, Evidence of done.
//
// The roster comes from adapters/roles.json, so a new role is covered as soon
// as it is added there. Leadership roles that live in SKILL.md are skipped.
//
// Usage:
//   node scripts/check-role-contracts.js          # human-readable report, exit 1 on problems
//   node scripts/check-role-contracts.js --json   # parsed contracts as JSON (used by /naksha-doctor --transcripts)
//
// Also exported for scripts/validate-structure.js.

const fs = require('fs');
const path = require('path');

const ROOT_DEFAULT = path.join(__dirname, '..');

// key: name used in JSON output; heading: exact subsection title; min/max: item count bounds
const SUBSECTIONS = [
  { key: 'redFlags', heading: 'Red flags', min: 3, max: 5 },
  { key: 'excuses', heading: 'Excuses to reject', min: 2, max: 4 },
  { key: 'evidence', heading: 'Evidence of done', min: 3, max: 5 },
];

function roleReferences(root) {
  const roster = JSON.parse(fs.readFileSync(path.join(root, 'adapters/roles.json'), 'utf-8'));
  return roster.roles
    .filter((r) => typeof r.reference === 'string' && r.reference.startsWith('skills/design/references/'))
    .map((r) => ({ name: r.name, reference: r.reference }));
}

function isTableSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
}

function tableCells(line) {
  return line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

// Items are list entries ("- x", "* x", "1. x") or table body rows. A table's
// first row is its header and is not counted. Excuse rows need two filled cells.
function parseItems(lines) {
  const items = [];
  let tableRow = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('|')) tableRow = 0;
    const bullet = line.match(/^(?:[-*]|\d+\.)\s+(?:\[[ xX]\]\s+)?(.*\S)\s*$/);
    if (bullet) {
      items.push({ kind: 'bullet', text: bullet[1], cells: [bullet[1]] });
    } else if (line.startsWith('|')) {
      tableRow++;
      if (tableRow === 1 || isTableSeparator(line)) continue;
      const cells = tableCells(line);
      if (cells.some(Boolean)) items.push({ kind: 'table', text: cells.filter(Boolean).join(' — '), cells });
    }
  }
  return items;
}

// Returns { found, duplicate, sections: { key: { present, items } } }
function parseContract(text) {
  const lines = text.split(/\r?\n/);
  const starts = [];
  let inFence = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) inFence = !inFence;
    if (!inFence && /^## Quality Contract\s*$/.test(l)) starts.push(i);
  });
  const result = { found: starts.length > 0, duplicate: starts.length > 1, sections: {} };
  for (const s of SUBSECTIONS) result.sections[s.key] = { present: false, items: [] };
  if (!result.found) return result;

  let end = lines.length;
  for (let i = starts[0] + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { end = i; break; }
  }
  const body = lines.slice(starts[0] + 1, end);

  let current = null;
  let buffer = [];
  const flush = () => {
    if (current) {
      result.sections[current.key].present = true;
      result.sections[current.key].items = parseItems(buffer);
    }
    buffer = [];
  };
  for (const line of body) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      flush();
      current = SUBSECTIONS.find((s) => s.heading.toLowerCase() === h[1].toLowerCase()) || null;
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return result;
}

// An excuse needs its rebuttal: a second filled table cell, or for a list
// item, a separator such as " — ", " → " or a colon after the quoted excuse.
function hasRebuttal(item) {
  if (item.kind === 'table') return item.cells.filter(Boolean).length >= 2;
  return /\s(?:—|–|->|→)\s+\S/.test(item.text) || /^["“].+?["”]\s*[:—–]\s*\S/.test(item.text);
}

function checkRoleContracts(root = ROOT_DEFAULT) {
  const problems = [];
  const contracts = {};
  let roles;
  try {
    roles = roleReferences(root);
  } catch (e) {
    return { checked: 0, problems: [`cannot read adapters/roles.json — ${e.message}`], contracts };
  }
  for (const role of roles) {
    const file = path.join(root, role.reference);
    const rel = role.reference;
    if (!fs.existsSync(file)) {
      problems.push(`${rel}: file missing (listed for ${role.name} in adapters/roles.json)`);
      continue;
    }
    const parsed = parseContract(fs.readFileSync(file, 'utf-8'));
    if (!parsed.found) {
      problems.push(`${rel}: no "## Quality Contract" section`);
      continue;
    }
    if (parsed.duplicate) problems.push(`${rel}: more than one "## Quality Contract" section`);
    const entry = { role: role.name, file: rel };
    for (const s of SUBSECTIONS) {
      const sec = parsed.sections[s.key];
      entry[s.key] = sec.items.map((it) => it.text);
      if (!sec.present) {
        problems.push(`${rel}: Quality Contract is missing "### ${s.heading}"`);
      } else if (sec.items.length === 0) {
        problems.push(`${rel}: "### ${s.heading}" is empty`);
      } else if (sec.items.length < s.min || sec.items.length > s.max) {
        problems.push(`${rel}: "### ${s.heading}" has ${sec.items.length} items (expected ${s.min}–${s.max})`);
      }
      if (s.key === 'excuses') {
        const noRebuttal = sec.items.filter((it) => !hasRebuttal(it));
        if (noRebuttal.length > 0) problems.push(`${rel}: ${noRebuttal.length} excuse(s) without a rebuttal`);
      }
    }
    contracts[role.name] = entry;
  }
  return { checked: roles.length, problems, contracts };
}

module.exports = { checkRoleContracts, parseContract, SUBSECTIONS };

if (require.main === module) {
  const root = ROOT_DEFAULT;
  const { checked, problems, contracts } = checkRoleContracts(root);
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(contracts, null, 2) + '\n');
    process.exit(problems.length ? 1 : 0);
  }
  console.log('═══════════════════════════════════════');
  console.log('  check-role-contracts');
  console.log('═══════════════════════════════════════');
  console.log('');
  if (problems.length === 0) {
    console.log(`  PASS  ${checked} role references have a complete Quality Contract`);
    console.log('');
    console.log('check-role-contracts: PASS');
    process.exit(0);
  }
  for (const p of problems) console.log(`  FAIL  ${p}`);
  console.log('');
  console.log(`check-role-contracts: FAIL (${problems.length} problem(s) across ${checked} role references)`);
  process.exit(1);
}
