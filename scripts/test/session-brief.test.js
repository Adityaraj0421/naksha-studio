// session-brief.test.js — spawns the PreCompact and SessionStart hook scripts
// against synthetic .naksha/ fixtures in temp dirs (paths contain spaces).
// Run: node --test scripts/test/

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const PRECOMPACT = path.join(REPO, 'scripts', 'precompact-brief.sh');
const DETECT = path.join(REPO, 'scripts', 'detect-design-context.sh');
const DAY = 24 * 60 * 60 * 1000;

function tempProject(t, name = 'my design project') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha brief '));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeNaksha(dir, project, memory) {
  fs.mkdirSync(path.join(dir, '.naksha'), { recursive: true });
  if (project !== undefined) {
    fs.writeFileSync(path.join(dir, '.naksha', 'project.json'),
      typeof project === 'string' ? project : JSON.stringify(project, null, 2));
  }
  if (memory !== undefined) fs.writeFileSync(path.join(dir, '.naksha', 'memory.md'), memory);
}

function runHook(script, cwd, input) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const res = spawnSync('bash', [script], { cwd, input: JSON.stringify(input), env, encoding: 'utf8', timeout: 15000 });
  assert.equal(res.status, 0, `exit ${res.status}: ${res.stderr}`);
  let json;
  assert.doesNotThrow(() => { json = JSON.parse(res.stdout); }, `stdout is not JSON: ${res.stdout}`);
  return json;
}

function context(json) {
  return (json.hookSpecificOutput && json.hookSpecificOutput.additionalContext) || '';
}

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

const PROJECT = {
  name: 'Lumina "SaaS"',
  brand: { primary: '#6366F1', secondary: '#F59E0B', font: 'Inter', voice: 'professional and approachable' },
  framework: 'nextjs',
  tokenFormat: 'css-vars',
  schema_version: '5',
  constraints: { grid: '4px', dark_mode: false, breakpoints: [768, 1024, 1280], accessibility_target: 'WCAG AA', notes: ['Cards always use 16px padding'] },
  component_patterns: [{ name: 'card-layout', description: 'x', recorded_at: iso(DAY), source_command: '/design' }],
  browser_findings: [{ captured_at: iso(DAY), mode: 'research', url: 'https://example.com', source_command: '/naksha-browse' }],
  taste: {
    signals: [
      { verdict: 'approved', direction: 'Editorial', traits: ['editorial', 'serif display'], recorded_at: iso(2 * DAY), source_command: '/naksha-taste' },
      { verdict: 'approved', direction: 'Airy', traits: ['editorial', 'airy layout'], recorded_at: iso(3 * DAY), source_command: '/naksha-taste' },
      { verdict: 'rejected', direction: 'Neon', traits: ['neon gradients'], recorded_at: iso(4 * DAY), source_command: '/design-variants' },
      { verdict: 'approved', direction: 'Old', traits: ['skeuomorphic'], recorded_at: iso(400 * DAY), source_command: '/naksha-taste' },
    ],
  },
};

const MEMORY = '# Naksha Project Memory — Lumina SaaS\n\n' +
  '[2026-10-01T10:00:00Z] /brand-kit: Primary #6366F1, font Inter\n' +
  '[2026-10-02T10:00:00Z] /design-system: Adopted a 4px grid\n' +
  '[2026-10-03T10:00:00Z] /design: Pricing page with editorial hero\n';

// ── PreCompact ───────────────────────────────────────────────────────────────

test('PreCompact: no .naksha/ is a no-op with valid JSON', (t) => {
  const dir = tempProject(t);
  const out = runHook(PRECOMPACT, dir, { hook_event_name: 'PreCompact', trigger: 'auto', custom_instructions: null });
  assert.equal(out.decision, undefined, 'must never block compaction');
  assert.equal(fs.existsSync(path.join(dir, '.naksha')), false, 'must not create .naksha/');
});

test('PreCompact: a bare .naksha/ without project.json (e.g. ~/.naksha) is not a project', (t) => {
  const dir = tempProject(t, path.join('home', 'code', 'proj'));
  const fakeHome = path.dirname(path.dirname(dir));
  fs.mkdirSync(path.join(fakeHome, '.naksha'));
  fs.writeFileSync(path.join(fakeHome, '.naksha', 'hook-errors.log'), 'x\n');
  runHook(PRECOMPACT, dir, { hook_event_name: 'PreCompact', trigger: 'auto' });
  assert.deepEqual(fs.readdirSync(path.join(fakeHome, '.naksha')), ['hook-errors.log']);
});

test('PreCompact: writes a brief with the derivable design state', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, PROJECT, MEMORY);
  fs.writeFileSync(path.join(dir, 'design-output.html'), '<html lang="en"></html>');
  fs.mkdirSync(path.join(dir, 'naksha-variants', 'round 1'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'naksha-variants', 'round 1', 'variant-a.html'), '<html></html>');
  fs.mkdirSync(path.join(dir, 'naksha-review'));
  fs.writeFileSync(path.join(dir, 'naksha-review', 'report.md'), '# review');

  runHook(PRECOMPACT, dir, { hook_event_name: 'PreCompact', cwd: dir, trigger: 'manual', custom_instructions: null });
  const brief = fs.readFileSync(path.join(dir, '.naksha', 'session-brief.md'), 'utf8');

  assert.match(brief, /Project: Lumina "SaaS"/);
  assert.match(brief, /primary #6366F1/);
  assert.match(brief, /font Inter/);
  assert.match(brief, /grid: 4px/);
  assert.match(brief, /breakpoints: 768, 1024, 1280/);
  assert.match(brief, /Taste: favours editorial/);
  assert.match(brief, /avoids neon gradients/);
  assert.doesNotMatch(brief, /skeuomorphic/, 'signals older than 180 days carry no weight');
  assert.match(brief, /- \[2026-10-02T10:00:00Z\] \/design-system: Adopted a 4px grid/);
  assert.doesNotMatch(brief, /# Naksha Project Memory/, 'memory header is not an entry');
  assert.match(brief, /design-output\.html/);
  assert.match(brief, /naksha-variants\/round 1\/variant-a\.html/);
  assert.match(brief, /naksha-review\/report\.md/);
  assert.match(brief, /manual compaction/);
  assert.ok(Buffer.byteLength(brief) <= 2048);
});

test('PreCompact: brief stays <= 2 KB with huge memory and project data', (t) => {
  const dir = tempProject(t);
  const big = { ...PROJECT, name: 'N'.repeat(5000), brand: { ...PROJECT.brand, voice: 'v '.repeat(5000) } };
  big.constraints = {};
  for (let i = 0; i < 200; i++) big.constraints[`rule_${i}`] = 'x'.repeat(300);
  big.taste = { signals: Array.from({ length: 300 }, (_, i) => ({ verdict: i % 2 ? 'approved' : 'rejected', traits: [`trait-${i}`, 'ünïcødé ✓'], recorded_at: iso(DAY) })) };
  let memory = '# Memory\n';
  for (let i = 0; i < 50000; i++) memory += `- decision ${i}: ${'é'.repeat(80)} ✓\n`;
  writeNaksha(dir, big, memory);
  for (let i = 0; i < 40; i++) fs.mkdirSync(path.join(dir, 'naksha-variants', `${'deep-name-'.repeat(8)}${i}`), { recursive: true });

  runHook(PRECOMPACT, dir, { hook_event_name: 'PreCompact', trigger: 'auto' });
  const buf = fs.readFileSync(path.join(dir, '.naksha', 'session-brief.md'));
  assert.ok(buf.length <= 2048, `brief is ${buf.length} bytes`);
  assert.doesNotMatch(buf.toString('utf8'), /�/, 'no split multi-byte characters');
  assert.match(buf.toString('utf8'), /^# Naksha session brief/);
});

test('PreCompact: malformed project.json still never fails the hook', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, '{ not json', 'only memory\n');
  runHook(PRECOMPACT, dir, { hook_event_name: 'PreCompact' });
  const brief = fs.readFileSync(path.join(dir, '.naksha', 'session-brief.md'), 'utf8');
  assert.match(brief, /only memory/);
});

test('PreCompact: replaces a planted symlink instead of writing through it', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, PROJECT, MEMORY);
  const victim = path.join(path.dirname(dir), 'victim.txt');
  fs.writeFileSync(victim, 'untouched');
  fs.symlinkSync(victim, path.join(dir, '.naksha', 'session-brief.md'));
  runHook(PRECOMPACT, dir, { hook_event_name: 'PreCompact' });
  assert.equal(fs.readFileSync(victim, 'utf8'), 'untouched');
  assert.equal(fs.lstatSync(path.join(dir, '.naksha', 'session-brief.md')).isSymbolicLink(), false);
});

test('PreCompact: empty stdin and no node input still yields valid JSON', (t) => {
  const dir = tempProject(t);
  const res = spawnSync('bash', [PRECOMPACT], { cwd: dir, input: '', encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.deepEqual(JSON.parse(res.stdout), { continue: true });
});

// ── SessionStart ─────────────────────────────────────────────────────────────

test('SessionStart: no .naksha/ keeps the stack-detection behaviour', (t) => {
  const dir = tempProject(t);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '15', react: '19' } }));
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  const ctx = context(runHook(DETECT, dir, { hook_event_name: 'SessionStart', source: 'startup' }));
  assert.match(ctx, /^Naksha detected project context:/);
  assert.match(ctx, /- Framework: Next\.js/);
  assert.match(ctx, /- Language: TypeScript/);
  assert.doesNotMatch(ctx, /Naksha project memory/);
});

test('SessionStart: empty project emits a bare continue', (t) => {
  const dir = tempProject(t);
  assert.deepEqual(runHook(DETECT, dir, { hook_event_name: 'SessionStart', source: 'startup' }), { continue: true });
});

test('SessionStart: compact index with counts, capped at ~600 chars', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, PROJECT, MEMORY);
  const out = runHook(DETECT, dir, { hook_event_name: 'SessionStart', source: 'startup' });
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  const ctx = context(out);
  assert.match(ctx, /Naksha project memory: Lumina "SaaS"/);
  assert.match(ctx, /5 constraints/);
  assert.match(ctx, /1 pattern\b/);
  assert.match(ctx, /4 taste signals/);
  assert.match(ctx, /1 browser finding\b/);
  assert.match(ctx, /3 memory entries/);
  assert.match(ctx, /run \/naksha-status for details/i);
  assert.doesNotMatch(ctx, /professional and approachable/, 'index must not dump memory');
  assert.doesNotMatch(ctx, /Session brief/, 'startup never restores a brief');
  assert.ok(ctx.length <= 700, `context is ${ctx.length} chars`);
});

test('SessionStart: index stays capped with huge project data', (t) => {
  const dir = tempProject(t);
  const big = { ...PROJECT, name: 'X'.repeat(10000), brand: { primary: '#'.padEnd(500, 'F'), font: 'F'.repeat(500) }, framework: 'f'.repeat(500) };
  writeNaksha(dir, big, '## x\n'.repeat(10000));
  const ctx = context(runHook(DETECT, dir, { source: 'startup' }));
  const index = ctx.split('\nAdapt design')[0];
  assert.ok(index.length <= 600, `index is ${index.length} chars`);
});

test('SessionStart: compact/resume include a fresh brief, startup/clear do not', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, PROJECT, MEMORY);
  runHook(PRECOMPACT, dir, { hook_event_name: 'PreCompact', trigger: 'auto' });
  for (const source of ['compact', 'resume']) {
    const ctx = context(runHook(DETECT, dir, { hook_event_name: 'SessionStart', source }));
    assert.match(ctx, /Session brief \(\.naksha\/session-brief\.md, saved (just now|\d+ min ago)\)/, source);
    assert.match(ctx, /Taste: favours editorial/, source);
    assert.ok(ctx.length < 10000, 'well under the 10,000-char additionalContext cap');
  }
  for (const source of ['startup', 'clear', 'fork']) {
    assert.doesNotMatch(context(runHook(DETECT, dir, { source })), /Session brief/, source);
  }
});

test('SessionStart: a stale (> 24h) brief is ignored', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, PROJECT, MEMORY);
  const brief = path.join(dir, '.naksha', 'session-brief.md');
  fs.writeFileSync(brief, '# Naksha session brief\nSTALE MARKER\n');
  const old = (Date.now() - 25 * 60 * 60 * 1000) / 1000;
  fs.utimesSync(brief, old, old);
  const ctx = context(runHook(DETECT, dir, { source: 'compact' }));
  assert.doesNotMatch(ctx, /STALE MARKER/);
  assert.match(ctx, /Naksha project memory/);
});

test('SessionStart: memory found from a subdirectory via the hook cwd field', (t) => {
  const dir = tempProject(t, 'app with spaces');
  writeNaksha(dir, PROJECT, MEMORY);
  const sub = path.join(dir, 'src', 'components');
  fs.mkdirSync(sub, { recursive: true });
  const ctx = context(runHook(DETECT, os.tmpdir(), { source: 'startup', cwd: sub }));
  assert.match(ctx, /Naksha project memory: Lumina/);
});

test('Both hooks degrade gracefully when node is not on PATH', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, PROJECT, MEMORY);
  // A PATH holding only the coreutils the scripts use, without node.
  const bin = path.join(path.dirname(dir), 'bin no node');
  fs.mkdirSync(bin);
  for (const tool of ['bash', 'sh', 'dirname', 'grep', 'sed', 'head', 'cut', 'tr', 'find', 'cat']) {
    const found = spawnSync('bash', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim();
    if (found) fs.symlinkSync(found, path.join(bin, tool));
  }
  const bash = path.join(bin, 'bash');
  const env = { PATH: bin, HOME: os.tmpdir() };
  const pre = spawnSync(bash, [PRECOMPACT], { cwd: dir, input: '{}', env, encoding: 'utf8' });
  assert.equal(pre.status, 0, pre.stderr);
  assert.deepEqual(JSON.parse(pre.stdout), { continue: true });
  const ss = spawnSync(bash, [DETECT], { cwd: dir, input: '{"source":"startup"}', env, encoding: 'utf8' });
  assert.equal(ss.status, 0, ss.stderr);
  const ctx = context(JSON.parse(ss.stdout));
  assert.match(ctx, /Naksha project memory: Lumina \\?"SaaS\\?"/);
  assert.match(ctx, /\/naksha-status/);
});

test('SessionStart: hostile values are escaped into valid JSON', (t) => {
  const dir = tempProject(t);
  writeNaksha(dir, { ...PROJECT, name: 'Quote " back\\slash \t tab \u0001 ctl' }, MEMORY);
  const ctx = context(runHook(DETECT, dir, { source: 'startup' }));
  assert.match(ctx, /Quote " back\\slash/);
});
