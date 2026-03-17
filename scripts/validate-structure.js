#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      passed++;
    } else {
      console.log(`❌ ${name}: ${result}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// --- Load data files ---
let stats, plugin;
try {
  stats = JSON.parse(fs.readFileSync(path.join(ROOT, 'meta/stats.json'), 'utf-8'));
} catch (e) {
  console.log(`❌ setup: cannot read meta/stats.json — ${e.message}`);
  process.exit(1);
}
try {
  plugin = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/plugin.json'), 'utf-8'));
} catch (e) {
  console.log(`❌ setup: cannot read .claude-plugin/plugin.json — ${e.message}`);
  process.exit(1);
}

// --- Check 1: Command file count ---
check('command-count', () => {
  const files = fs.readdirSync(path.join(ROOT, 'commands')).filter(f => f.endsWith('.md'));
  if (files.length !== stats.commands) {
    return `commands/ has ${files.length} .md files but meta/stats.json says ${stats.commands}`;
  }
  return true;
});

// --- Check 2: Reference file count ---
check('reference-count', () => {
  const files = fs.readdirSync(path.join(ROOT, 'skills/design/references')).filter(f => f.endsWith('.md'));
  if (files.length !== stats.reference_files) {
    return `skills/design/references/ has ${files.length} .md files but meta/stats.json says ${stats.reference_files}`;
  }
  return true;
});

// --- Check 3: Version consistency ---
check('version-consistency', () => {
  if (stats.version !== plugin.version) {
    return `meta/stats.json version (${stats.version}) !== .claude-plugin/plugin.json version (${plugin.version})`;
  }
  return true;
});

// --- Check 4: Command frontmatter ---
check('command-frontmatter', () => {
  const commandDir = path.join(ROOT, 'commands');
  const files = fs.readdirSync(commandDir).filter(f => f.endsWith('.md'));
  const missing = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(commandDir, file), 'utf-8');
    if (!content.includes('description:')) missing.push(`${file}: missing description:`);
    // Note: allowed-tools: is not checked here because 17/46 existing commands use
    // an older schema without it. The PR template and CONTRIBUTING.md require it for
    // new commands (human-checked), but this script only enforces the universal baseline.
  }
  if (missing.length > 0) return missing.join(' | ');
  return true;
});

// --- Check 5: No empty command files ---
check('no-empty-commands', () => {
  const commandDir = path.join(ROOT, 'commands');
  const files = fs.readdirSync(commandDir).filter(f => f.endsWith('.md'));
  const empty = files.filter(f => fs.statSync(path.join(commandDir, f)).size === 0);
  if (empty.length > 0) return `empty command files: ${empty.join(', ')}`;
  return true;
});

// --- Check 6: Pipeline YAML structure ---
check('pipeline-yaml-structure', () => {
  const pipelineDir = path.join(ROOT, 'skills/design/pipelines');
  if (!fs.existsSync(pipelineDir)) return 'skills/design/pipelines/ directory not found';
  const files = fs.readdirSync(pipelineDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  if (files.length === 0) return 'no pipeline YAML files found in skills/design/pipelines/';
  const invalid = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(pipelineDir, file), 'utf-8');
    if (!content.includes('name:')) invalid.push(`${file}: missing name:`);
    else if (!content.includes('description:')) invalid.push(`${file}: missing description:`);
    else if (!content.includes('steps:')) invalid.push(`${file}: missing steps:`);
    else if (!content.includes('command:')) invalid.push(`${file}: steps missing command: entries`);
  }
  if (invalid.length > 0) return invalid.join(' | ');
  return true;
});

// --- Result ---
if (failed === 0) {
  console.log(`✅ validate-structure: ${passed} checks passed`);
  process.exit(0);
} else {
  console.log(`\n${failed} check(s) failed, ${passed} passed`);
  process.exit(1);
}
