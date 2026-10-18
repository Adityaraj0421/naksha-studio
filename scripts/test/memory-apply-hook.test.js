// memory-apply-hook.test.js — the deterministic Stop hook that applies
// <!-- naksha-memory-update --> blocks. Run: node --test scripts/test/

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.resolve(__dirname, '..', 'memory-apply-hook.js');

function setup(t, project = { name: 'Lumina', brand: { primary: '#5C50E8' }, schema_version: '5' }) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha memhook '));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const dir = path.join(base, 'my project');
  const home = path.join(base, 'home');
  fs.mkdirSync(path.join(dir, '.naksha'), { recursive: true });
  fs.mkdirSync(home);
  if (project !== null) fs.writeFileSync(path.join(dir, '.naksha', 'project.json'), JSON.stringify(project, null, 2));
  const transcript = path.join(base, 'session.jsonl');
  fs.writeFileSync(transcript, '');
  return { base, dir, home, transcript };
}

const assistant = (text) => JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } }) + '\n';
const toolResult = (text) => JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: text }] } }) + '\n';
const block = (obj) => `<!-- naksha-memory-update\n${JSON.stringify(obj, null, 2)}\n-->`;

function run(s, input = {}) {
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: 'Stop', session_id: 's1', transcript_path: s.transcript, cwd: s.dir, ...input }),
    env: { ...process.env, HOME: s.home, USERPROFILE: s.home },
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout);
}
const project = (s) => JSON.parse(fs.readFileSync(path.join(s.dir, '.naksha', 'project.json'), 'utf8'));
const errors = (s) => {
  const f = path.join(s.home, '.naksha', 'hook-errors.log');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
};

test('applies project_json_patch blocks, creating missing parents', (t) => {
  const s = setup(t);
  fs.appendFileSync(s.transcript, assistant(`Saved.\n${block({ type: 'project_json_patch', path: 'constraints.grid', value: '8px' })}\n${block({ type: 'project_json_patch', path: 'taste.observations', value: [{ trait: 'serif display', helpful: 2 }] })}`));
  const out = run(s);
  const p = project(s);
  assert.equal(p.constraints.grid, '8px');
  assert.equal(p.taste.observations[0].trait, 'serif display');
  assert.equal(p.name, 'Lumina');
  assert.match(out.systemMessage, /applied 2 update/);
  assert.equal(errors(s), '');
});

test('never blocks: output is { continue: true } with no decision field', (t) => {
  const s = setup(t);
  const out = run(s);
  assert.deepEqual(out, { continue: true });
});

test('applies each block once across repeated Stop events (incremental offset)', (t) => {
  const s = setup(t);
  const finding = { captured_at: new Date().toISOString(), mode: 'research', url: 'https://example.com', patterns: [] };
  fs.appendFileSync(s.transcript, assistant(block({ type: 'browser_finding_write', finding })));
  run(s);
  run(s);
  assert.equal(project(s).browser_findings.length, 1);
  // A later turn sets the same value again: that is a new block and must apply.
  fs.appendFileSync(s.transcript, assistant(block({ type: 'project_json_patch', path: 'constraints.grid', value: '4px' })));
  fs.appendFileSync(s.transcript, assistant(block({ type: 'project_json_patch', path: 'constraints.grid', value: '8px' })));
  run(s);
  assert.equal(project(s).constraints.grid, '8px');
  assert.equal(project(s).browser_findings.length, 1);
});

test('ignores blocks in tool results, user text and code fences', (t) => {
  const s = setup(t);
  fs.appendFileSync(s.transcript, toolResult(block({ type: 'project_json_patch', path: 'name', value: 'From a file' })));
  fs.appendFileSync(s.transcript, JSON.stringify({ type: 'user', message: { role: 'user', content: block({ type: 'project_json_patch', path: 'name', value: 'From user' }) } }) + '\n');
  fs.appendFileSync(s.transcript, assistant('Example:\n```html\n' + block({ type: 'project_json_patch', path: 'name', value: 'From docs' }) + '\n```'));
  const out = run(s);
  assert.equal(project(s).name, 'Lumina');
  assert.equal(out.systemMessage, undefined);
});

test('rejects unknown fields and prototype paths, logs them, applies the rest', (t) => {
  const s = setup(t);
  fs.appendFileSync(s.transcript, assistant([
    block({ type: 'project_json_patch', path: 'secrets.token', value: 'x' }),
    block({ type: 'project_json_patch', path: 'constraints.__proto__.polluted', value: true }),
    block({ type: 'mystery', path: 'name' }),
    '<!-- naksha-memory-update\n{ not json }\n-->',
    block({ type: 'project_json_patch', path: 'budgets.monthly_usd', value: 20 }),
  ].join('\n')));
  run(s);
  const p = project(s);
  assert.equal(p.budgets.monthly_usd, 20);
  assert.equal(p.secrets, undefined);
  assert.equal({}.polluted, undefined);
  const log = errors(s);
  assert.match(log, /unknown top-level field "secrets"/);
  assert.match(log, /invalid path segment "__proto__"/);
  assert.match(log, /unknown block type "mystery"/);
  assert.match(log, /malformed block JSON/);
});

test('browser_finding_write prepends, caps at 20 and drops entries older than 30 days', (t) => {
  const old = { captured_at: '2020-01-01T00:00:00Z', url: 'https://old.example' };
  const recent = Array.from({ length: 20 }, (_, i) => ({ captured_at: new Date(Date.now() - i * 1000).toISOString(), url: `https://r${i}.example` }));
  const s = setup(t, { name: 'Lumina', browser_findings: [...recent.slice(0, 5), old, ...recent.slice(5)] });
  fs.appendFileSync(s.transcript, assistant(block({ type: 'browser_finding_write', finding: { captured_at: new Date().toISOString(), url: 'https://new.example' } })));
  run(s);
  const f = project(s).browser_findings;
  assert.equal(f.length, 20);
  assert.equal(f[0].url, 'https://new.example');
  assert.ok(!f.some((x) => x.url === 'https://old.example'));
});

test('no project.json: logs that blocks were skipped, creates nothing', (t) => {
  const s = setup(t, null);
  fs.appendFileSync(s.transcript, assistant(block({ type: 'project_json_patch', path: 'name', value: 'X' })));
  run(s);
  assert.ok(!fs.existsSync(path.join(s.dir, '.naksha', 'project.json')));
  assert.match(errors(s), /no \.naksha\/project\.json/);
});

test('invalid project.json is left alone and the blocks are retried once it is fixed', (t) => {
  const s = setup(t);
  const file = path.join(s.dir, '.naksha', 'project.json');
  fs.writeFileSync(file, '{ broken');
  fs.appendFileSync(s.transcript, assistant(block({ type: 'project_json_patch', path: 'constraints.grid', value: '8px' })));
  run(s);
  assert.equal(fs.readFileSync(file, 'utf8'), '{ broken');
  assert.match(errors(s), /not valid JSON/);
  fs.writeFileSync(file, '{"name":"Lumina"}');
  run(s);
  assert.equal(project(s).constraints.grid, '8px');
});

test('missing transcript or empty input is a silent no-op', (t) => {
  const s = setup(t);
  assert.deepEqual(run(s, { transcript_path: path.join(s.base, 'nope.jsonl') }), { continue: true });
  const res = spawnSync(process.execPath, [HOOK], { input: '', encoding: 'utf8', env: { ...process.env, HOME: s.home, USERPROFILE: s.home } });
  assert.equal(res.status, 0);
  assert.deepEqual(JSON.parse(res.stdout), { continue: true });
});

test('finds project.json from a subdirectory cwd', (t) => {
  const s = setup(t);
  const sub = path.join(s.dir, 'src', 'components');
  fs.mkdirSync(sub, { recursive: true });
  fs.appendFileSync(s.transcript, assistant(block({ type: 'project_json_patch', path: 'updatedAt', value: '2026-10-18T00:00:00Z' })));
  run(s, { cwd: sub });
  assert.equal(project(s).updatedAt, '2026-10-18T00:00:00Z');
});
