#!/usr/bin/env node
'use strict';

// build-adapters.js — renders the shared sections of every platform adapter
// (Cursor, Windsurf, Gemini CLI, Copilot) and the README team grid from one
// source, so they can't drift.
//
// Sources:
//   adapters/roles.json             canonical role roster
//   adapters/blocks/<block>.md      shared prose blocks
//   meta/stats.json                 knowledge-line count
//
// Each target file marks generated regions with:
//   <!-- naksha:generated <block> — edit adapters/, then run: node scripts/build-adapters.js -->
//   ...generated content...
//   <!-- /naksha:generated <block> -->
// Everything outside the markers stays hand-written and adapter-specific.
//
// Usage:
//   node scripts/build-adapters.js           rewrite adapters in place
//   node scripts/build-adapters.js --check   exit 1 if any adapter is stale (CI)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

// Reference files that are tools or galleries, not roles
const NON_ROLE_REFERENCES = ['deployment', 'figma-creation', 'figma-workflow', 'template-gallery'];

const TARGETS = [
  { file: '.cursor/rules/naksha.mdc', roles: 'table' },
  { file: '.windsurfrules', roles: 'grouped-list' },
  { file: 'GEMINI.md', roles: 'grouped-tables' },
  { file: '.github/copilot-instructions.md', roles: 'use-when' },
  { file: 'README.md', roles: 'readme-grid' },
];

// Normalised to LF so a CRLF checkout (Git for Windows, core.autocrlf) matches the same regions.
const readRaw = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const read = (p) => readRaw(p).replace(/\r\n/g, '\n');
const roster = JSON.parse(read('adapters/roles.json')).roles;
const stats = JSON.parse(read('meta/stats.json'));
const knowledgeFloor = (Math.floor(stats.knowledge_lines / 1000) * 1000).toLocaleString('en-US');

const errors = [];

// --- Roster integrity: every specialist has a reference file, every role file is in the roster ---
const refDir = path.join(ROOT, 'skills/design/references');
const roleRefs = fs.readdirSync(refDir)
  .filter((f) => f.endsWith('.md') && !NON_ROLE_REFERENCES.includes(f.slice(0, -3)))
  .map((f) => `skills/design/references/${f}`);
for (const r of roster) {
  if (!fs.existsSync(path.join(ROOT, r.reference))) errors.push(`roles.json: ${r.name} → missing ${r.reference}`);
}
for (const ref of roleRefs) {
  if (!roster.some((r) => r.reference === ref)) errors.push(`roles.json: ${ref} is a role reference file but no role uses it`);
}
if (stats.roles !== roster.length) {
  errors.push(`meta/stats.json roles=${stats.roles} but adapters/roles.json has ${roster.length}`);
}
// The landing page's team roster is hand-written JS (its own groupings and blurbs),
// so check it lists every role rather than generating it.
const site = read('site/index.html');
for (const r of roster) {
  if (!site.includes(`{r:'${r.name}'`)) errors.push(`site/index.html: team roster is missing ${r.name}`);
}
// Never write adapters from an invalid roster
if (errors.length) {
  for (const e of errors) console.log(`❌ ${e}`);
  process.exit(1);
}

// --- Renderers ---
function groups() {
  const order = [];
  const byGroup = {};
  for (const r of roster) {
    if (!byGroup[r.group]) { byGroup[r.group] = []; order.push(r.group); }
    byGroup[r.group].push(r);
  }
  return order.map((g) => [g, byGroup[g]]);
}

const ROLE_RENDERERS = {
  'table': () => [
    '## Roles',
    '',
    '| Role | Expertise |',
    '|------|-----------|',
    ...roster.map((r) => `| **${r.name}** | ${r.focus} |`),
  ],
  'grouped-list': () => [
    `## The Team (${roster.length} Roles)`,
    ...groups().flatMap(([g, rs]) => ['', `**${g}**`, ...rs.map((r) => `- **${r.name}** — ${r.focus}`)]),
  ],
  'grouped-tables': () => [
    '## The Team',
    ...groups().flatMap(([g, rs]) => [
      '',
      `### ${g} (${rs.length} ${rs.length === 1 ? 'role' : 'roles'})`,
      '| Role | Expertise |',
      '|------|-----------|',
      ...rs.map((r) => `| **${r.name}** | ${r.focus} |`),
    ]),
  ],
  'readme-grid': () => {
    const PER_ROW = 7;
    const cell = (r, first) => [`<td align="center"${first ? ' width="14%"' : ''}>`, '', `**${r.name}**`, '', r.label, '', '</td>'];
    const rows = [];
    for (let i = 0; i < roster.length; i += PER_ROW) {
      const chunk = roster.slice(i, i + PER_ROW);
      const pad = PER_ROW - chunk.length;
      rows.push('<tr>', ...chunk.flatMap((r) => cell(r, i === 0)),
        ...(pad ? [`<td align="center" colspan="${pad}">`, '', '</td>'] : []), '</tr>');
    }
    return ['<table>', ...rows,
      '<tr>', `<td align="center" colspan="${PER_ROW}">`, '', '_The skill loads only the references your task actually needs_', '', '</td>', '</tr>',
      '</table>'];
  },
  'use-when': () => [
    '## The Design Team',
    '',
    `${roster.length} specialist roles and ${knowledgeFloor}+ lines of design knowledge — activate based on task type:`,
    ...groups().flatMap(([g, rs]) => ['', `**${g}**`, ...rs.map((r) => `- **${r.name}** — Use when: ${r.activate}`)]),
  ],
};

function render(block, adapter) {
  if (block === 'roles') return ROLE_RENDERERS[adapter.roles]().join('\n');
  const blockPath = `adapters/blocks/${block}.md`;
  if (!fs.existsSync(path.join(ROOT, blockPath))) throw new Error(`unknown block "${block}" (no ${blockPath})`);
  return read(blockPath).trimEnd();
}

// --- Rewrite marked regions ---
const REGION = /(<!-- naksha:generated ([\w-]+)[^>]*-->\n)[\s\S]*?(\n<!-- \/naksha:generated \2 -->)/g;
const stale = [];

for (const adapter of TARGETS) {
  const before = read(adapter.file);
  let count = 0;
  let after;
  try {
    after = before.replace(REGION, (_, open, block, close) => {
      count++;
      return `${open}${render(block, adapter)}${close}`;
    });
  } catch (e) {
    errors.push(`${adapter.file}: ${e.message}`);
    continue;
  }
  if (count === 0) {
    errors.push(`${adapter.file}: no <!-- naksha:generated … --> regions found`);
    continue;
  }
  if (after !== before) {
    stale.push(adapter.file);
    // Keep the file's own line endings so a Windows checkout doesn't show every line as changed.
    const crlf = readRaw(adapter.file).includes('\r\n');
    if (!CHECK) fs.writeFileSync(path.join(ROOT, adapter.file), crlf ? after.replace(/\n/g, '\r\n') : after);
  }
}

if (errors.length) {
  for (const e of errors) console.log(`❌ ${e}`);
  process.exit(1);
}
if (CHECK && stale.length) {
  for (const f of stale) console.log(`❌ ${f} is out of date with adapters/`);
  console.log('Run: node scripts/build-adapters.js');
  process.exit(1);
}
console.log(CHECK
  ? `✅ build-adapters: ${TARGETS.length} files in sync with adapters/ (${roster.length} roles)`
  : `✅ build-adapters: ${stale.length ? `updated ${stale.join(', ')}` : 'nothing to update'} (${roster.length} roles)`);
