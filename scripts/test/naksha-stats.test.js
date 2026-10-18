'use strict';
// Tests for scripts/naksha-stats.js and scripts/lib/pricing.js.
// Run: node --test scripts/test/
// Fixtures under fixtures/usage/ are synthetic; no real transcript data.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Keep the tests away from the real parse cache in ~/.naksha/cache/.
process.env.NAKSHA_STATS_CACHE = '';

const pricing = require('../lib/pricing');
const stats = require('../naksha-stats');

const FIX = path.join(__dirname, 'fixtures', 'usage');
const SCRIPT = path.join(__dirname, '..', 'naksha-stats.js');
const NOW = '2026-10-20T12:00:00Z';

const TMP_DIRS = [];
function tmpDir(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  TMP_DIRS.push(d);
  return d;
}
test.after(() => { for (const d of TMP_DIRS) fs.rmSync(d, { recursive: true, force: true }); });

function close(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg || 'value'}: expected ${expected}, got ${actual}`);
}

/** Lay out a fake ~/.claude/projects tree plus a project dir in a temp folder. */
function setup(projectJson) {
  const tmp = tmpDir('naksha-stats-');
  const projectDir = path.join(tmp, 'app');
  fs.mkdirSync(projectDir, { recursive: true });
  if (projectJson !== undefined) {
    fs.mkdirSync(path.join(projectDir, '.naksha'));
    fs.writeFileSync(path.join(projectDir, '.naksha', 'project.json'), JSON.stringify(projectJson));
  }
  const logs = path.join(tmp, 'projects');
  fs.cpSync(path.join(FIX, 'app'), path.join(logs, stats.encodeProjectPath(projectDir)), { recursive: true });
  fs.cpSync(path.join(FIX, 'other'), path.join(logs, '-tmp-naksha-fixture-elsewhere'), { recursive: true });
  return { tmp, projectDir, logs };
}

function runCli(args) {
  let out = '', err = '';
  const code = stats.run(args, { write: s => { out += s; } }, { write: s => { err += s; } });
  return { code, out, err };
}

function report(env, extra = []) {
  const r = runCli(['--json', '--project', env.projectDir, '--logs-dir', env.logs, '--now', NOW, ...extra]);
  assert.equal(r.code, 0);
  return JSON.parse(r.out);
}

const row = (rep, cmd) => rep.commands.find(c => c.command === cmd);

// ─── pricing ──────────────────────────────────────────────────────────────────

test('shipped price table is valid and cites its source', () => {
  const table = pricing.loadPrices();
  assert.deepEqual(pricing.validatePriceTable(table), []);
  assert.match(table.source, /^https:\/\//);
  assert.match(table.as_of, /^\d{4}-\d{2}-\d{2}$/);
});

test('validatePriceTable reports missing fields', () => {
  const errs = pricing.validatePriceTable({ models: { m: { input: 1, output: -1 } }, aliases: { x: 'nope' } });
  assert.ok(errs.some(e => /source/.test(e)));
  assert.ok(errs.some(e => /m: "output"/.test(e)));
  assert.ok(errs.some(e => /m: "cache_read"/.test(e)));
  assert.ok(errs.some(e => /alias "x"/.test(e)));
});

test('model ids are normalised across providers and date suffixes', () => {
  const table = pricing.loadPrices();
  assert.equal(pricing.resolveModel(table, 'claude-opus-5-5').id, 'claude-opus-5-5');
  assert.equal(pricing.resolveModel(table, 'claude-opus-5-5[1m]').id, 'claude-opus-5-5');
  assert.equal(pricing.resolveModel(table, 'us.anthropic.claude-sonnet-4-5-20250929-v1:0').id, 'claude-sonnet-4-5');
  assert.equal(pricing.resolveModel(table, 'claude-opus-4-5@20251101').id, 'claude-opus-4-5');
  assert.equal(pricing.resolveModel(table, 'claude-3-5-haiku-20241022').id, 'claude-3-5-haiku');
  assert.equal(pricing.resolveModel(table, 'claude-opus-4-0').id, 'claude-opus-4');
  assert.equal(pricing.resolveModel(table, 'gpt-something'), null);
});

test('cost includes input, output, cache read, 5-minute and 1-hour cache writes', () => {
  const table = { source: 's', as_of: 'd', models: { m: { input: 4, output: 20, cache_read: 0.2, cache_write: 5, cache_write_1h: 8 } } };
  const c = pricing.costForUsage(table, 'm', {
    input_tokens: 200, output_tokens: 300, cache_read_input_tokens: 3000, cache_creation_input_tokens: 1500,
    cache_creation: { ephemeral_5m_input_tokens: 500, ephemeral_1h_input_tokens: 1000 },
  });
  // 200*4 + 300*20 + 3000*0.2 + 500*5 + 1000*8 = 800 + 6000 + 600 + 2500 + 8000
  close(c.usd, 17900 / 1e6, 'usd');
  assert.equal(c.priced, true);
  // Without the split, all cache writes use the 5-minute rate.
  close(pricing.costForUsage(table, 'm', { cache_creation_input_tokens: 1000 }).usd, 5000 / 1e6, 'no split');
});

test('fast mode, long-context tiers, placeholders, synthetic and unknown models', () => {
  const table = pricing.loadPrices();
  close(pricing.costForUsage(table, 'claude-opus-5-5', { output_tokens: 1e6, speed: 'fast' }).usd, 40, 'fast');
  close(pricing.costForUsage(table, 'claude-haiku-5-5', { input_tokens: 100000 }).usd, 0.01, 'haiku at threshold');
  close(pricing.costForUsage(table, 'claude-haiku-5-5', { input_tokens: 100001 }).usd, 100001 * 0.5 / 1e6, 'haiku above threshold');
  assert.equal(pricing.costForUsage(table, '<synthetic>', { input_tokens: 5 }).synthetic, true);
  const unknown = pricing.costForUsage(table, 'claude-unknown-9', { input_tokens: 5 });
  assert.equal(unknown.priced, false);
  assert.equal(unknown.usd, 0);
  const ph = { source: 's', as_of: 'd', models: { p: { input: 1, output: 1, cache_read: 1, cache_write: 1, placeholder: true } } };
  assert.equal(pricing.costForUsage(ph, 'p', { input_tokens: 1 }).placeholder, true);
});

// ─── parsing ──────────────────────────────────────────────────────────────────

test('encodes project paths the way Claude Code names transcript folders', () => {
  if (process.platform === 'win32') {
    // e.g. ~/.claude/projects/C--Users-me-Desktop-naksha-studio
    assert.equal(stats.encodeProjectPath('C:\\Users\\me\\Desktop\\naksha-studio'), 'C--Users-me-Desktop-naksha-studio');
    assert.equal(stats.encodeProjectPath('C:\\a\\b.c_d e'), 'C--a-b-c-d-e');
    return;
  }
  assert.equal(stats.encodeProjectPath('/home/user/naksha-studio'), '-home-user-naksha-studio');
  assert.equal(stats.encodeProjectPath('/a/b.c_d e'), '-a-b-c-d-e');
});

test('parser skips malformed lines, counts invalid usage, merges split messages', () => {
  const files = [
    { file: path.join(FIX, 'app', 'sess-0001.jsonl'), exactDir: true },
    { file: path.join(FIX, 'app', 'sess-0001', 'subagents', 'agent-fixture1.jsonl'), exactDir: true },
  ];
  const { entries, prompts, stats: s } = stats.parseTranscripts(files, ['/nowhere']);
  assert.equal(s.files, 2);
  assert.equal(s.malformed, 2);
  assert.equal(s.invalid_usage, 1);
  assert.equal(s.merged_duplicates, 1);
  assert.equal(s.usage_lines, 10);
  const a = entries.find(e => e.key === 'msg_A|req_A');
  assert.equal(a.usage.output_tokens, 500, 'keeps the final output count of a split message');
  assert.equal(a.usage.input_tokens, 1000, 'does not double-count input');
  // Prompts: /design-reel, plain, /compact, /naksha:pipeline, typed /design-reel. Not: meta, tool result, stdout, sidechain.
  assert.deepEqual(prompts.map(p => p.slash), ['/design-reel', null, '/compact', '/pipeline', '/design-reel']);
});

test('classifyPrompt recognises command tags, namespaces and typed commands', () => {
  const user = content => ({ type: 'user', message: { role: 'user', content } });
  assert.deepEqual(stats.classifyPrompt(user('<command-name>/naksha-studio:design-reel</command-name>')), { slash: '/design-reel' });
  assert.deepEqual(stats.classifyPrompt(user('/design-score now')), { slash: '/design-score' });
  assert.deepEqual(stats.classifyPrompt(user('/tmp/file is broken')), { slash: null });
  assert.equal(stats.classifyPrompt(Object.assign(user('x'), { isSidechain: true })), null);
  assert.equal(stats.classifyPrompt(user([{ type: 'tool_result', content: 'x' }])), null);
});

// ─── report, attribution, filters ─────────────────────────────────────────────

test('attributes cost to naksha commands, including subagent usage', () => {
  const env = setup();
  const rep = report(env);
  const reel = row(rep, '/design-reel');
  const pipe = row(rep, '/pipeline');
  assert.equal(reel.runs, 3);
  // run 1: msg_A 0.024 + msg_B 0.0154 + subagent msg_S 0.0015; run 2: $2; september run: $1
  close(reel.cost_usd, 3.0409, '/design-reel');
  assert.equal(pipe.runs, 1);
  close(pipe.cost_usd, 2, '/pipeline');
  close(rep.unattributed.cost_usd, 0.0036, 'unattributed');
  assert.deepEqual(rep.unattributed.reasons, { plain_prompt: 1, other_slash_command: 1 });
  close(rep.totals.cost_usd, 5.0445, 'total');
  assert.equal(rep.commands[0].command, '/design-reel', 'sorted by cost');
  assert.deepEqual(rep.unpriced_models.map(u => u.model), ['claude-unknown-9']);
  assert.equal(rep.parse.malformed, 2);
  assert.equal(rep.scope.discovery, 'exact');
  assert.equal(rep.sessions, 2);
});

test('commands Claude runs through the Skill tool count as runs and get their usage', () => {
  const tmp = tmpDir('naksha-stats-skill-');
  const projectDir = path.join(tmp, 'app');
  fs.mkdirSync(projectDir);
  const dir = path.join(tmp, 'projects', stats.encodeProjectPath(projectDir));
  fs.mkdirSync(dir, { recursive: true });
  const base = { cwd: projectDir, sessionId: 'sess-skill', isSidechain: false };
  const ts = s => `2026-10-08T08:00:${String(s).padStart(2, '0')}.000Z`;
  const usage = { input_tokens: 1000000, output_tokens: 0 };
  const call = (s, id, skill) => ({
    ...base, type: 'assistant', timestamp: ts(s), requestId: `req_${id}`,
    message: { id: `msg_${id}`, model: 'claude-opus-5-5', usage, content: skill ? [{ type: 'tool_use', id: `toolu_${id}`, name: 'Skill', input: { skill } }] : [{ type: 'text', text: 'ok' }] },
  });
  const lines = [
    { ...base, type: 'user', timestamp: ts(0), uuid: 'u1', message: { role: 'user', content: 'build me a landing page' } },
    call(1, 'a', null), // plain prompt → unattributed ($4)
    call(2, 'b', 'naksha:naksha-init'), // → /naksha-init ($4 + $4)
    call(3, 'c', null),
    call(4, 'd', 'naksha:design-review'), // → /design-review ($4 × 3)
    call(5, 'e', null),
    call(6, 'f', 'other-plugin:thing'), // not a naksha command: no new run
    { ...base, type: 'assistant', isSidechain: true, timestamp: ts(7), message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'naksha:design' } }] } },
    { ...base, type: 'user', timestamp: ts(8), uuid: 'u2', message: { role: 'user', content: '<command-name>/naksha:design-qa</command-name>' } },
    call(9, 'g', 'naksha:design-qa'), // typed, then loaded through Skill: still one run
  ];
  fs.writeFileSync(path.join(dir, 'sess-skill.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  const rep = report({ projectDir, logs: path.join(tmp, 'projects') });
  assert.equal(row(rep, '/naksha-init').runs, 1);
  close(row(rep, '/naksha-init').cost_usd, 8, '/naksha-init');
  assert.equal(row(rep, '/design-review').runs, 1);
  close(row(rep, '/design-review').cost_usd, 12, '/design-review keeps the turn after a non-naksha skill');
  assert.equal(row(rep, '/design-qa').runs, 1);
  assert.equal(row(rep, '/design'), undefined, 'subagent Skill calls do not start runs');
  close(rep.unattributed.cost_usd, 4, 'only the plain-prompt call is unattributed');
});

test('--since, --until, --session and --all filters', () => {
  const env = setup();
  const oct = report(env, ['--since', '2026-10-01']);
  assert.equal(row(oct, '/design-reel').runs, 2);
  close(oct.totals.cost_usd, 4.0445, 'october');
  const sept = report(env, ['--until', '2026-09-30']);
  close(sept.totals.cost_usd, 1, 'september');
  const sess = report(env, ['--session', 'sess-0002']);
  assert.equal(sess.sessions, 1);
  close(sess.totals.cost_usd, 1, 'session');
  const all = report(env, ['--all']);
  close(all.totals.cost_usd, 9.0445, 'all projects');
  assert.equal(all.scope.discovery, 'all');
});

test('falls back to matching transcripts by cwd when no folder matches', () => {
  const tmp = tmpDir('naksha-stats-scan-');
  fs.cpSync(path.join(FIX, 'app'), path.join(tmp, 'renamed-folder'), { recursive: true });
  fs.cpSync(path.join(FIX, 'other'), path.join(tmp, 'other-folder'), { recursive: true });
  const r = runCli(['--json', '--project', '/tmp/naksha-fixture/app', '--logs-dir', tmp, '--now', NOW]);
  const rep = JSON.parse(r.out);
  assert.equal(rep.scope.discovery, 'scan');
  close(rep.totals.cost_usd, 5.0445, 'scan total excludes the other project');
});

test('includes sessions started in a project subdirectory, not look-alike projects', () => {
  const env = setup();
  const line = (cwd, id) => JSON.stringify({
    type: 'assistant', isSidechain: false, cwd, sessionId: `sess-${id}`, requestId: `req_${id}`,
    timestamp: '2026-10-08T08:00:00.000Z',
    message: { id: `msg_${id}`, model: 'claude-opus-5-5', usage: { input_tokens: 1000000, output_tokens: 0 } },
  }) + '\n';
  const enc = stats.encodeProjectPath(env.projectDir);
  fs.mkdirSync(path.join(env.logs, `${enc}-sub`));
  fs.writeFileSync(path.join(env.logs, `${enc}-sub`, 'sess-sub.jsonl'), line(path.join(env.projectDir, 'sub'), 'sub'));
  fs.mkdirSync(path.join(env.logs, `${enc}-2`));
  fs.writeFileSync(path.join(env.logs, `${enc}-2`, 'sess-two.jsonl'), line(`${env.projectDir}-2`, 'two'));
  const rep = report(env);
  assert.equal(rep.scope.discovery, 'exact');
  close(rep.totals.cost_usd, 5.0445 + 4, 'subdirectory session counted once, look-alike excluded');
});

test('text output has the table, totals, unattributed note and skipped count', () => {
  const env = setup();
  const r = runCli(['--project', env.projectDir, '--logs-dir', env.logs, '--now', NOW]);
  assert.equal(r.code, 0);
  assert.match(r.out, /Command\s+Runs\s+Input\s+Output\s+Cache write\s+Cache read\s+Est\. \$/);
  assert.match(r.out, /\/design-reel\s+3\s/);
  assert.match(r.out, /TOTAL\s+4\s.*\$5\.04/);
  assert.match(r.out, /skipped 2 malformed and 1 with unreadable usage/);
  assert.match(r.out, /Unattributed: \$0\.0036/);
  assert.match(r.out, /Not priced.*claude-unknown-9/);
  assert.match(r.out, /naksha budget: none set/);
  assert.match(r.out, /not an invoice/);
});

// ─── budgets ──────────────────────────────────────────────────────────────────

test('monthly budget: warn at warn_at, over beyond 100%', () => {
  const warn = report(setup({ name: 'f', budgets: { monthly_usd: 5, warn_at: 0.8 } })).budgets;
  assert.equal(warn.month, '2026-10');
  close(warn.month_spend_usd, 4.0445, 'month spend excludes September');
  assert.equal(warn.monthly.status, 'warn');
  assert.match(warn.messages[0].text, /^WARN: 2026-10 spend \$4\.04 is 81% of the \$5\.00 monthly budget/);

  const over = report(setup({ name: 'f', budgets: { monthly_usd: 4 } })).budgets;
  assert.equal(over.monthly.status, 'over');
  assert.equal(over.warn_at, 0.8, 'default warn_at');
  assert.match(over.messages[0].text, /^OVER BUDGET/);

  const ok = report(setup({ name: 'f', budgets: { monthly_usd: 50 } })).budgets;
  assert.equal(ok.monthly.status, 'ok');
  assert.deepEqual(ok.messages, []);
});

test('per-command budgets are per run and accept names with or without a slash', () => {
  const b = report(setup({ name: 'f', budgets: { per_command_usd: { '/design-reel': 1.5, pipeline: 2.4, '/design-score': 1 } } })).budgets;
  const reel = b.per_command.find(c => c.command === '/design-reel');
  assert.equal(reel.status, 'over');
  assert.equal(reel.runs, 2);
  close(reel.max_run_usd, 2, 'max run');
  close(reel.last_run_usd, 2, 'last run');
  close(reel.avg_run_usd, 2.0409 / 2, 'avg run');
  assert.equal(b.per_command.find(c => c.command === '/pipeline').status, 'warn');
  assert.equal(b.per_command.find(c => c.command === '/design-score').status, 'ok');
  assert.equal(b.monthly, null);
});

test('invalid budget values are reported and ignored', () => {
  const { budgets, problems } = stats.readBudgets({ monthly_usd: -3, warn_at: 7, per_command_usd: { '/x': 'a lot' } });
  assert.equal(budgets, null);
  assert.equal(problems.length, 3);
  assert.equal(stats.readBudgets(undefined).budgets, null);
  assert.equal(stats.readBudgets({ monthly_usd: 10, warn_at: 2 }).budgets.warn_at, 0.8);
});

test('--budget-check prints short status lines and filters by --command', () => {
  const env = setup({ name: 'f', budgets: { monthly_usd: 5, per_command_usd: { '/design-reel': 1.5, '/pipeline': 2.4 } } });
  const base = ['--budget-check', '--project', env.projectDir, '--logs-dir', env.logs, '--now', NOW];
  const reel = runCli([...base, '--command', '/design-reel']);
  assert.equal(reel.code, 0);
  assert.match(reel.out, /naksha budget: WARN: 2026-10 spend/);
  assert.match(reel.out, /naksha budget: OVER BUDGET: a \/design-reel run cost \$2\.00/);
  assert.doesNotMatch(reel.out, /\/pipeline/);
  const none = runCli(['--budget-check', '--project', setup().projectDir, '--logs-dir', env.logs, '--now', NOW]);
  assert.match(none.out, /naksha budget: none set/);
});

// ─── CLI behaviour ────────────────────────────────────────────────────────────

test('CLI exits 0, also when there are no transcripts; bad args exit 2', () => {
  const empty = tmpDir('naksha-stats-empty-');
  const ok = spawnSync(process.execPath, [SCRIPT, '--logs-dir', empty, '--project', empty], { encoding: 'utf8' });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /No Claude Code transcripts found/);
  const json = spawnSync(process.execPath, [SCRIPT, '--json', '--logs-dir', empty, '--project', empty], { encoding: 'utf8' });
  assert.equal(json.status, 0);
  assert.equal(JSON.parse(json.stdout).schema, 'naksha-stats/1');
  const bad = spawnSync(process.execPath, [SCRIPT, '--since', 'yesterday'], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--since expects YYYY-MM-DD/);
});

test('a broken price table does not crash the CLI', () => {
  const tmp = tmpDir('naksha-stats-prices-');
  const bad = path.join(tmp, 'prices.json');
  fs.writeFileSync(bad, '{"models": {}}');
  const r = runCli(['--prices', bad, '--logs-dir', tmp, '--project', tmp]);
  assert.equal(r.code, 0);
  assert.match(r.out, /invalid price table/);
});

test('parse cache: unchanged transcripts are reused, grown ones re-read, no message text stored', () => {
  const env = setup();
  const cacheFile = path.join(env.tmp, 'cache', 'stats.json');
  process.env.NAKSHA_STATS_CACHE = cacheFile;
  try {
    const first = report(env);
    assert.equal(first.parse.cached_files, 0);
    assert.ok(fs.existsSync(cacheFile));
    const second = report(env);
    assert.equal(second.parse.cached_files, second.parse.files, 'every file came from the cache');
    assert.deepEqual(second.commands, first.commands);
    assert.deepEqual(second.totals, first.totals);
    // Grow one transcript: only that file is re-read, and its new usage is counted.
    const sess = path.join(env.logs, stats.encodeProjectPath(env.projectDir), 'sess-0002.jsonl');
    fs.appendFileSync(sess, JSON.stringify({
      type: 'assistant', sessionId: 'sess-0002', cwd: env.projectDir, requestId: 'req_new', timestamp: '2026-10-09T08:00:00.000Z',
      message: { id: 'msg_new', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'SECRET-REPLY-TEXT' }], usage: { input_tokens: 1000000, output_tokens: 0 } },
    }) + '\n');
    const third = report(env);
    assert.equal(third.parse.cached_files, third.parse.files - 1);
    close(third.totals.cost_usd, first.totals.cost_usd + 4, 'appended usage is counted');
    assert.doesNotMatch(fs.readFileSync(cacheFile, 'utf8'), /SECRET-REPLY-TEXT/);
    // --no-cache ignores it.
    assert.equal(report(env, ['--no-cache']).parse.cached_files, 0);
  } finally {
    process.env.NAKSHA_STATS_CACHE = '';
  }
});
