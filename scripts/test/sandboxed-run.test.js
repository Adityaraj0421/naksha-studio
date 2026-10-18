// sandboxed-run.test.js — scripts/lib/sandboxed-run.sh with a stub `srt`.
// Never needs the real srt; run: node --test scripts/test/

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const RUN = path.join(REPO, 'scripts', 'lib', 'sandboxed-run.sh');
const PROFILE = path.join(REPO, 'evals', 'sandbox.json');

// A temp area with an eval dir (path has spaces) and a PATH that holds only
// the tools the helper needs, so a real srt on the machine can't leak in.
function setup(t, { withStubSrt = false } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha sandbox '));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const bin = path.join(base, 'bin');
  fs.mkdirSync(bin);
  for (const tool of ['bash', 'sh', 'node', 'mkdir', 'dirname', 'cat', 'sed', 'rm', 'env', 'printf']) {
    const found = spawnSync('bash', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim();
    if (found && found.startsWith('/')) fs.symlinkSync(found, path.join(bin, tool));
  }
  const log = path.join(base, 'srt-calls.log');
  if (withStubSrt) {
    // Records its argv (one per line) and the env it saw, then runs the command after `--`.
    fs.writeFileSync(path.join(bin, 'srt'), `#!/bin/bash
for a in "$@"; do printf '%s\\n' "$a"; done > "${log}"
printf 'CLAUDE_CONFIG_DIR=%s\\n' "$CLAUDE_CONFIG_DIR" >> "${log}"
while [ $# -gt 0 ] && [ "$1" != "--" ]; do shift; done; shift
exec "$@"
`, { mode: 0o755 });
  }
  const evalDir = path.join(base, 'eval run 1');
  const env = { PATH: bin, HOME: path.join(base, 'home') };
  fs.mkdirSync(env.HOME);
  return { base, bin, log, evalDir, env };
}

function run(args, env, extraEnv = {}) {
  return spawnSync(path.join(env.PATH, 'bash'), [RUN, ...args], { env: { ...env, ...extraEnv }, encoding: 'utf8' });
}

test('profile: srt block has the keys srt requires and only the Anthropic API', () => {
  const p = JSON.parse(fs.readFileSync(PROFILE, 'utf8'));
  assert.deepEqual(Object.keys(p.srt).sort(), ['filesystem', 'network']);
  assert.deepEqual(p.srt.network.allowedDomains, ['api.anthropic.com']);
  assert.ok(Array.isArray(p.srt.network.deniedDomains));
  for (const k of ['denyRead', 'allowWrite', 'denyWrite']) assert.ok(Array.isArray(p.srt.filesystem[k]), k);
  assert.deepEqual(p.srt.filesystem.allowWrite, ['${NAKSHA_EVAL_DIR}']);
  assert.equal(p.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC, '1');
});

test('refuses to run when srt is missing and unsandboxed runs are not allowed', (t) => {
  const s = setup(t);
  const marker = path.join(s.base, 'ran');
  const res = run(['--eval-dir', s.evalDir, '--', 'bash', '-c', `echo > "${marker}"`], s.env);
  assert.equal(res.status, 69, res.stderr);
  assert.match(res.stderr, /srt .* not installed/);
  assert.match(res.stderr, /NAKSHA_ALLOW_UNSANDBOXED=1/);
  assert.equal(fs.existsSync(marker), false, 'command must not run');
});

test('NAKSHA_ALLOW_UNSANDBOXED=1 runs the command with contained env and a warning', (t) => {
  const s = setup(t);
  const res = run(['--eval-dir', s.evalDir, '--', 'bash', '-c', 'printf "%s|%s|%s" "$CLAUDE_CONFIG_DIR" "$TMPDIR" "$1"; exit 7', '_', 'arg with spaces'],
    s.env, { NAKSHA_ALLOW_UNSANDBOXED: '1' });
  assert.equal(res.status, 7, 'exit status passes through');
  assert.match(res.stderr, /UNSANDBOXED/);
  const real = fs.realpathSync(s.evalDir);
  assert.equal(res.stdout, `${real}/.claude-config|${real}/tmp|arg with spaces`);
  assert.ok(fs.statSync(path.join(real, 'tmp')).isDirectory());
});

test('uses srt with a rendered settings file when srt is on PATH', (t) => {
  const s = setup(t, { withStubSrt: true });
  const res = run(['--eval-dir', s.evalDir, '--', 'bash', '-c', 'echo sandboxed "$1"', '_', 'a b'], s.env);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout.trim(), 'sandboxed a b');
  const real = fs.realpathSync(s.evalDir);
  const calls = fs.readFileSync(s.log, 'utf8').split('\n');
  assert.equal(calls[0], '--settings');
  const settingsPath = calls[1];
  assert.equal(settingsPath, path.join(real, '.naksha-sandbox', 'srt-settings.json'));
  assert.equal(calls[2], '--');
  assert.deepEqual(calls.slice(3, 7), ['bash', '-c', 'echo sandboxed "$1"', '_']);
  assert.ok(calls.includes(`CLAUDE_CONFIG_DIR=${real}/.claude-config`));
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.deepEqual(settings.filesystem.allowWrite, [real]);
  assert.deepEqual(settings.network.allowedDomains, ['api.anthropic.com']);
});

test('allowlist additions come only from ANTHROPIC_BASE_URL and NAKSHA_SANDBOX_EXTRA_DOMAINS', (t) => {
  const s = setup(t);
  const res = run(['--eval-dir', s.evalDir, '--print-settings'], s.env, {
    ANTHROPIC_BASE_URL: 'https://llm-gateway.example.com:8443/v1',
    NAKSHA_SANDBOX_EXTRA_DOMAINS: 'fonts.googleapis.com, bad domain;rm -rf, *.example.org',
  });
  assert.equal(res.status, 0, res.stderr);
  const settings = JSON.parse(res.stdout);
  assert.deepEqual(settings.network.allowedDomains,
    ['api.anthropic.com', 'llm-gateway.example.com:8443', 'fonts.googleapis.com', '*.example.org']);
  assert.match(res.stderr, /ignoring invalid domain "bad domain;rm -rf"/);
  assert.match(res.stderr, /\+ fonts\.googleapis\.com/);
});

test('refuses overly broad eval dirs', (t) => {
  const s = setup(t);
  for (const dir of ['/', s.env.HOME, REPO, path.dirname(REPO)]) {
    const res = run(['--eval-dir', dir, '--', 'true'], s.env, { NAKSHA_ALLOW_UNSANDBOXED: '1' });
    assert.equal(res.status, 64, `${dir}: ${res.stderr}`);
    assert.match(res.stderr, /refusing eval dir/);
  }
});

test('usage errors exit 64', (t) => {
  const s = setup(t);
  assert.equal(run(['--', 'true'], s.env).status, 64);
  assert.equal(run(['--eval-dir', s.evalDir], s.env).status, 64);
  assert.equal(run(['--eval-dir', s.evalDir, 'claude'], s.env).status, 64);
});
