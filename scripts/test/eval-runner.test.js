'use strict';

// Unit tests for scripts/eval-runner.js. No network: paid tiers are exercised
// either with the gate closed or against a stub `claude` binary.
// Run: node --test scripts/test/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const runner = require('../eval-runner.js');

const REPO = path.join(__dirname, '..', '..');
const createdRoots = [];
test.after(() => {
  for (const dir of createdRoots) fs.rmSync(dir, { recursive: true, force: true });
});

// ─── fixtures ────────────────────────────────────────────────────────────────

const PRICES = {
  as_of: '2026-01-01',
  models: {
    'gen-model': { input: 4, output: 20 },
    'judge-model': { input: 2, output: 10 },
  },
  defaults: { e2e_model: 'gen-model', judge_model: 'judge-model', run_budget_usd: 5 },
  estimates: {
    status: 'placeholder',
    chars_per_token: 4,
    e2e_overhead_tokens: 1000,
    e2e_turns: 2,
    judge_overhead_tokens: 100,
    default_output_tokens: 500,
    judge_output_tokens_base: 50,
    judge_output_tokens_per_assertion: 10,
  },
};

const FIXTURE_TEXT = '# Output\n\n## Layout\nUses a 12-column grid.\n\n## Color\nPrimary navy.\n';

/** Build a throwaway plugin root: commands/, evals/evals.json, evals/fixtures/, evals/prices.json. */
function makeRoot(evals, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha-evaltest-'));
  createdRoots.push(root);
  fs.mkdirSync(path.join(root, 'commands'));
  fs.mkdirSync(path.join(root, 'evals', 'fixtures'), { recursive: true });
  for (const cmd of extra.commands || ['foo', 'bar']) {
    fs.writeFileSync(path.join(root, 'commands', `${cmd}.md`), `---\ndescription: "${cmd}"\n---\n${'x'.repeat(400)}\n`);
  }
  fs.writeFileSync(path.join(root, 'evals', 'fixtures', 'foo-output.md'), FIXTURE_TEXT);
  fs.writeFileSync(path.join(root, 'evals', 'evals.json'), JSON.stringify({ skill_name: 'design', evals }, null, 2));
  fs.writeFileSync(path.join(root, 'evals', 'prices.json'), JSON.stringify(extra.prices || PRICES));
  return root;
}

function baseEvals() {
  return [
    {
      id: 0,
      name: 'foo-basic',
      command: '/foo',
      fixture: 'foo-output.md',
      prompt: 'Design a landing page.',
      expected_output: 'A landing page.',
      assertions: [
        { name: 'has-grid', description: 'Mentions the grid', check: { type: 'contains', value: '12-column' } },
        { name: 'has-hero', description: 'Has a hero section' },
      ],
    },
    {
      id: 1,
      name: 'bar-basic',
      prompt: '/bar make a card',
      assertions: [{ name: 'has-card', description: 'Shows a card' }],
    },
  ];
}

/** Run main() in-process and capture its output. */
function run(args, env = {}) {
  const out = [];
  const err = [];
  const code = runner.main(args, env, { out: (s) => out.push(s), err: (s) => err.push(s) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

function runJson(args, env = {}) {
  const r = run([...args, '--json'], env);
  return { code: r.code, report: JSON.parse(r.out) };
}

/** A stub `claude` that never touches the network and logs each call. */
function makeFakeClaude(dir, behaviour = {}) {
  const bin = path.join(dir, 'fake-claude.js');
  const log = path.join(dir, 'calls.log');
  const src = `#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const stdin = fs.readFileSync(0, 'utf-8');
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args, cwd: process.cwd(), stdinLength: stdin.length }) + '\\n');
if (args.includes('--json-schema')) {
  const names = [...stdin.matchAll(/^- ([\\w-]+):/gm)].map((m) => m[1]);
  const fail = ${JSON.stringify(behaviour.judgeFail || [])};
  const assertions = names.map((name) => ({ name, pass: !fail.includes(name), reason: 'stub' }));
  process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: '', structured_output: { assertions }, total_cost_usd: ${JSON.stringify(behaviour.judgeCost || 0.002)} }));
} else {
  fs.writeFileSync(path.join(process.cwd(), 'index.html'), '<main>Hello Naksha</main>');
  process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: 'Built index.html with a 12-column grid.', total_cost_usd: 0.01 }));
}
`;
  fs.writeFileSync(bin, src, { mode: 0o755 });
  return { bin, log };
}

function readCalls(log) {
  if (!fs.existsSync(log)) return [];
  return fs.readFileSync(log, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// ─── schema defaults ─────────────────────────────────────────────────────────

test('assertion defaults: prose → judge, check → e2e, weight 1', () => {
  assert.deepEqual(runner.normalizeAssertion({ name: 'a', description: 'd' }), { name: 'a', description: 'd', tier: 'judge', weight: 1, check: null });
  const withCheck = runner.normalizeAssertion({ name: 'b', description: 'd', check: { type: 'contains', value: 'x' } });
  assert.equal(withCheck.tier, 'e2e');
  assert.equal(withCheck.weight, 1);
  const explicit = runner.normalizeAssertion({ name: 'c', description: 'd', tier: 'structural', weight: 0, check: { type: 'file-exists', path: 'x' } });
  assert.equal(explicit.tier, 'structural');
  assert.equal(explicit.weight, 0);
});

test('eval defaults: threshold 1, no budget, command from field or prompt', () => {
  const ev = runner.normalizeEval({ id: 3, name: 'n', prompt: '/design-review check this', assertions: [] });
  assert.equal(ev.threshold, 1);
  assert.equal(ev.budget_usd, null);
  assert.equal(ev.command, 'design-review');
  assert.equal(runner.evalCommand({ command: '/design + /design-framework', prompt: 'x' }), 'design');
  assert.equal(runner.evalCommand({ prompt: 'no command here' }), null);
});

test('existing evals/evals.json validates unchanged (backward compatible)', () => {
  const data = JSON.parse(fs.readFileSync(path.join(REPO, 'evals', 'evals.json'), 'utf-8'));
  const { errors } = runner.validateSpec(data, { root: REPO });
  assert.deepEqual(errors, []);
  const all = data.evals.map(runner.normalizeEval);
  assert.ok(all.every((ev) => ev.threshold === 1 && ev.assertions.every((a) => a.tier === 'judge' && a.weight === 1)));
});

test('validateSpec rejects malformed extension fields', () => {
  const root = makeRoot([]);
  const evals = [
    {
      id: 0,
      name: 'bad',
      command: '/foo',
      prompt: 'x',
      threshold: 1.5,
      budget_usd: 0,
      assertions: [
        { name: 'j', description: 'd', tier: 'judge', check: { type: 'contains', value: 'x' } },
        { name: 'e', description: 'd', tier: 'e2e' },
        { name: 'w', description: 'd', weight: -1 },
        { name: 'r', description: 'd', check: { type: 'regex', value: '(' } },
        { name: 'u', description: 'd', check: { type: 'sniff' } },
        { name: 't', description: 'd', tier: 'paid' },
      ],
    },
  ];
  const { errors } = runner.validateSpec({ evals }, { root });
  const joined = errors.join('\n');
  for (const needle of ['threshold', 'budget_usd', 'judge-tier', 'needs a deterministic', 'weight', 'invalid regex', 'check.type', 'tier must be', '/bar has no eval case']) {
    assert.ok(joined.includes(needle), `expected an error mentioning "${needle}" in:\n${joined}`);
  }
});

test('validateSpec: structural text check needs a fixture or check.file', () => {
  const root = makeRoot([]);
  const evals = [
    { id: 0, name: 'a', command: '/foo', fixture: 'evals/fixtures/foo-output.md', prompt: 'x', assertions: [{ name: 's', description: 'd', tier: 'structural', check: { type: 'contains', value: 'grid' } }] },
    { id: 1, name: 'b', command: '/bar', prompt: 'x', assertions: [{ name: 's', description: 'd', tier: 'structural', check: { type: 'contains', value: 'grid' } }] },
  ];
  const { errors } = runner.validateSpec({ evals }, { root });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /id=1/);
});

// ─── checks ──────────────────────────────────────────────────────────────────

test('runCheck matchers', () => {
  const s = { text: 'Hello World\n```json\n{"a":{"b":[1,{"c":"x"}]}}\n```', baseDir: REPO };
  assert.equal(runner.runCheck({ type: 'contains', value: 'hello' }, s).pass, true);
  assert.equal(runner.runCheck({ type: 'contains', value: 'hello', case_sensitive: true }, s).pass, false);
  assert.equal(runner.runCheck({ type: 'contains', value: 'nope', not: true }, s).pass, true);
  assert.equal(runner.runCheck({ type: 'regex', value: '^hello\\s+world' }, s).pass, true);
  assert.equal(runner.runCheck({ type: 'regex', value: '^hello', flags: '' }, s).pass, false);
  assert.equal(runner.runCheck({ type: 'json-path', path: '$.a.b[1].c', equals: 'x' }, s).pass, true);
  assert.equal(runner.runCheck({ type: 'json-path', path: 'a.b[0]', equals: 2 }, s).pass, false);
  assert.equal(runner.runCheck({ type: 'json-path', path: 'a.z' }, s).pass, false);
  assert.equal(runner.runCheck({ type: 'file-exists', path: 'evals/evals.json' }, s).pass, true);
  assert.equal(runner.runCheck({ type: 'file-exists', path: '../outside.txt' }, s).pass, false);
  assert.equal(runner.runCheck({ type: 'contains', value: 'Naksha', file: 'README.md' }, s).pass, true);
  assert.equal(runner.runCheck({ type: 'contains', value: 'x' }, { text: null, baseDir: REPO }).pass, null);
  assert.deepEqual(runner.parseJsonPath('$.a["b c"][2]'), ['a', 'b c', 2]);
});

// ─── threshold / weight math ─────────────────────────────────────────────────

test('scoreEval: weighted score against threshold', () => {
  const graded = [{ weight: 3, pass: true }, { weight: 1, pass: false }];
  assert.equal(runner.scoreEval(graded).score, 0.75);
  assert.equal(runner.scoreEval(graded).passed, false, 'default threshold 1.0 needs every weighted assertion');
  assert.equal(runner.scoreEval(graded, 0.75).passed, true);
  assert.equal(runner.scoreEval(graded, 0.8).passed, false);
  assert.equal(runner.scoreEval([{ weight: 1, pass: true }, { weight: 5, pass: null }]).passed, true, 'ungraded assertions are excluded');
  assert.equal(runner.scoreEval([{ weight: 0, pass: false }]).passed, null, 'zero total weight is not graded');
  assert.equal(runner.scoreEval([{ pass: true }, { pass: false }], 0.5).passed, true, 'weight defaults to 1');
  // 0.1 + 0.2 floating point should still meet a 0.3/0.3 = 1.0 threshold
  assert.equal(runner.scoreEval([{ weight: 0.1, pass: true }, { weight: 0.2, pass: true }]).passed, true);
  assert.equal(runner.scoreEval([{ weight: 0.7, pass: true }, { weight: 0.3, pass: false }], 0.7).passed, true);
});

test('structural tier grades checks against fixtures with weights and threshold', () => {
  const evals = baseEvals();
  evals[0].assertions.push({ name: 'no-lorem', description: 'No placeholder copy', check: { type: 'contains', value: 'lorem', not: true }, weight: 2 });
  evals[0].assertions.push({ name: 'mentions-pricing', description: 'Mentions pricing', check: { type: 'contains', value: 'pricing' } });
  const root = makeRoot(evals);
  let r = runJson(['--evals', path.join(root, 'evals', 'evals.json')]);
  assert.equal(r.code, 1, 'one of four weight units fails at threshold 1.0');
  assert.equal(r.report.evals[0].score, 0.75);

  evals[0].threshold = 0.75;
  fs.writeFileSync(path.join(root, 'evals', 'evals.json'), JSON.stringify({ evals }));
  r = runJson(['--evals', path.join(root, 'evals', 'evals.json')]);
  assert.equal(r.code, 0);
  assert.equal(r.report.evals[0].passed, true);
  assert.ok(r.report.evals[0].results.every((x) => x.mode === 'fixture-replay'));
});

test('structural tier on the real repo passes', () => {
  assert.equal(run([]).code, 0);
});

// ─── dry-run cost estimate and budgets ───────────────────────────────────────

test('cost math uses the pinned price table', () => {
  assert.equal(runner.costUsd(1e6, 1e6, { input: 4, output: 20 }), 24);
  assert.equal(runner.costUsd(250000, 0, { input: 2, output: 10 }), 0.5);
  assert.throws(() => runner.priceFor(PRICES, 'unknown-model'), /no price for model/);
  assert.equal(runner.estimateTokens('abcdefghi', 4), 3);
});

test('dry run estimates tokens and $ per eval', () => {
  const root = makeRoot(baseEvals());
  const ctx = { root, prices: PRICES };
  const [foo, bar] = baseEvals().map(runner.normalizeEval);

  // judge on foo: candidate is the fixture, no generation
  const fooJudge = runner.estimateJudge(foo, 'judge-model', runner.estimateTokens(FIXTURE_TEXT, 4), ctx);
  const expectedIn = 100 + runner.estimateTokens(runner.buildJudgePrompt(foo, ''), 4) + runner.estimateTokens(FIXTURE_TEXT, 4);
  assert.equal(fooJudge.input_tokens, expectedIn);
  assert.equal(fooJudge.output_tokens, 50 + 10 * 1, 'only judge-tier assertions are graded by the judge');

  // generation on bar: (overhead + prompt + command file) × turns, default output
  const gen = runner.estimateGeneration(bar, 'gen-model', ctx);
  const cmdTokens = runner.estimateTokens(fs.readFileSync(path.join(root, 'commands', 'bar.md'), 'utf-8'), 4);
  assert.equal(gen.input_tokens, (1000 + runner.estimateTokens('/bar make a card', 4) + cmdTokens) * 2);
  assert.equal(gen.output_tokens, 500);
  assert.equal(gen.usd, runner.costUsd(gen.input_tokens, 500, PRICES.models['gen-model']));

  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--dry-run']);
  assert.equal(r.code, 0);
  assert.equal(r.report.plan.length, 2);
  const barPlan = r.report.plan.find((p) => p.id === 1);
  assert.equal(barPlan.candidate, 'live');
  assert.deepEqual(barPlan.steps.map((s) => s.kind), ['generate', 'judge']);
  const total = r.report.plan.reduce((s, p) => s + p.usd, 0);
  assert.ok(Math.abs(r.report.estimate_usd - total) < 1e-5);
  assert.ok(r.report.estimate_usd > 0);
});

test('structural dry run costs $0', () => {
  const root = makeRoot(baseEvals());
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--dry-run']);
  assert.equal(r.code, 0);
  assert.equal(r.report.estimate_usd, 0);
  assert.equal(r.report.plan[0].assertions[0].mode, 'fixture-replay');
});

test('dry run refuses (exit 3) when the estimate exceeds --budget', () => {
  const root = makeRoot(baseEvals());
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--dry-run', '--budget', '0.0001']);
  assert.equal(r.code, 3);
  assert.match(r.report.budget_violations.join('\n'), /run budget/);
});

test("dry run refuses (exit 3) when an eval's budget_usd is exceeded", () => {
  const evals = baseEvals();
  evals[1].budget_usd = 0.0001;
  const root = makeRoot(evals);
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--dry-run', '--budget', '100']);
  assert.equal(r.code, 3);
  assert.match(r.report.budget_violations[0], /eval 1 .* budget_usd/);
});

test('unknown --model is a usage error, not a guessed price', () => {
  const root = makeRoot(baseEvals());
  assert.equal(run(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--dry-run', '--model', 'mystery']).code, 2);
});

test('--filter matches id, command and name; no match is a usage error', () => {
  const root = makeRoot(baseEvals());
  const file = path.join(root, 'evals', 'evals.json');
  assert.deepEqual(runJson(['--evals', file, '--tier', 'judge', '--dry-run', '--filter', '/bar']).report.plan.map((p) => p.id), [1]);
  assert.deepEqual(runJson(['--evals', file, '--tier', 'judge', '--dry-run', '--filter', '0']).report.plan.map((p) => p.id), [0]);
  assert.deepEqual(runJson(['--evals', file, '--tier', 'judge', '--dry-run', '--filter', 'FOO-bas']).report.plan.map((p) => p.id), [0]);
  assert.equal(run(['--evals', file, '--filter', 'zzz']).code, 2);
});

test('bad arguments exit 2', () => {
  assert.equal(run(['--tier', 'nope']).code, 2);
  assert.equal(run(['--budget', '-1']).code, 2);
  assert.equal(run(['--wat']).code, 2);
});

// ─── paid-tier gating ────────────────────────────────────────────────────────

test('paidGate needs NAKSHA_EVALS_PAID=1 and ANTHROPIC_API_KEY', () => {
  assert.equal(runner.paidGate({}).allowed, false);
  assert.equal(runner.paidGate({ NAKSHA_EVALS_PAID: '1' }).allowed, false);
  assert.equal(runner.paidGate({ ANTHROPIC_API_KEY: 'k' }).allowed, false);
  assert.equal(runner.paidGate({ NAKSHA_EVALS_PAID: 'true', ANTHROPIC_API_KEY: 'k' }).allowed, false);
  assert.equal(runner.paidGate({ NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: '  ' }).allowed, false);
  assert.equal(runner.paidGate({ NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: 'k' }).allowed, true);
});

for (const tier of ['e2e', 'judge']) {
  test(`${tier} tier without the env prints the plan, exits 0 and never calls claude`, () => {
    const evals = baseEvals();
    const root = makeRoot(evals);
    const fake = makeFakeClaude(root);
    for (const env of [{}, { NAKSHA_EVALS_PAID: '1' }, { ANTHROPIC_API_KEY: 'k' }]) {
      const r = run(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', tier], { ...env, NAKSHA_EVALS_CLAUDE_BIN: fake.bin });
      assert.equal(r.code, 0);
      assert.match(r.out, /paid tier not executed/);
      assert.match(r.out, /fake-claude\.js -p --/);
    }
    assert.deepEqual(readCalls(fake.log), []);
  });
}

test('dry run never executes even with the env set', () => {
  const root = makeRoot(baseEvals());
  const fake = makeFakeClaude(root);
  const env = { NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: 'k', NAKSHA_EVALS_CLAUDE_BIN: fake.bin };
  assert.equal(run(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--dry-run'], env).code, 0);
  assert.deepEqual(readCalls(fake.log), []);
});

test('gated-open run refuses before executing when over budget', () => {
  const root = makeRoot(baseEvals());
  const fake = makeFakeClaude(root);
  const env = { NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: 'k', NAKSHA_EVALS_CLAUDE_BIN: fake.bin };
  assert.equal(run(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--budget', '0.0001'], env).code, 3);
  assert.deepEqual(readCalls(fake.log), []);
});

// ─── orchestration against a stub claude (no network) ────────────────────────

test('e2e tier: runs claude -p in a temp dir and applies checks to output and files', () => {
  const evals = baseEvals();
  evals[0].assertions = [
    { name: 'mentions-grid', description: 'Mentions the grid', check: { type: 'contains', value: '12-column grid' } },
    { name: 'wrote-html', description: 'Writes index.html', check: { type: 'file-exists', path: 'index.html' } },
    { name: 'html-greets', description: 'Page greets', check: { type: 'contains', value: 'hello naksha', file: 'index.html' } },
    { name: 'judged', description: 'Prose-only, not part of e2e' },
  ];
  const root = makeRoot(evals);
  const fake = makeFakeClaude(root);
  const env = { NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: 'k', NAKSHA_EVALS_CLAUDE_BIN: fake.bin };
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'e2e', '--budget', '2'], env);
  assert.equal(r.code, 0, JSON.stringify(r.report, null, 2));
  assert.equal(r.report.evals.length, 1, 'only evals with e2e checks run');
  assert.equal(r.report.evals[0].results.length, 3);
  assert.equal(r.report.spent_usd, 0.01, 'spend comes from total_cost_usd');

  const calls = readCalls(fake.log);
  assert.equal(calls.length, 1);
  const { args, cwd } = calls[0];
  assert.ok(args.includes('-p') && args.includes('--plugin-dir') && args.includes(root));
  assert.equal(args[args.indexOf('--model') + 1], 'gen-model');
  assert.equal(args[args.indexOf('--max-budget-usd') + 1], '2');
  assert.match(path.basename(cwd), /^naksha-eval-0-/);
  assert.equal(path.resolve(path.dirname(cwd)), path.resolve(os.tmpdir()));
  assert.equal(fs.existsSync(cwd), false, 'temp workdir is removed without --keep-workdirs');
});

test('judge tier: grades fixture with a judge prompt and scores verdicts', () => {
  const evals = baseEvals();
  evals[0].assertions = [
    { name: 'has-hero', description: 'Has a hero section', weight: 3 },
    { name: 'has-footer', description: 'Has a footer', weight: 1 },
  ];
  evals[0].threshold = 0.75;
  const root = makeRoot(evals);
  const fake = makeFakeClaude(root, { judgeFail: ['has-footer', 'has-card'] });
  const env = { NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: 'k', NAKSHA_EVALS_CLAUDE_BIN: fake.bin };
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--budget', '2'], env);
  const foo = r.report.evals.find((e) => e.id === 0);
  const bar = r.report.evals.find((e) => e.id === 1);
  assert.equal(foo.score, 0.75);
  assert.equal(foo.passed, true);
  assert.equal(bar.passed, false);
  assert.equal(r.code, 1);

  const calls = readCalls(fake.log);
  // foo: judge only (fixture). bar: generate (no fixture) then judge.
  assert.equal(calls.length, 3);
  const judgeCalls = calls.filter((c) => c.args.includes('--json-schema'));
  assert.equal(judgeCalls.length, 2);
  for (const c of judgeCalls) {
    assert.ok(c.args.includes('--bare'));
    assert.equal(c.args[c.args.indexOf('--tools') + 1], '');
    assert.equal(c.args[c.args.indexOf('--model') + 1], 'judge-model');
  }
});

test('a fixture derived from the command sizes estimates but is never graded', () => {
  const evals = baseEvals();
  delete evals[0].fixture;
  const root = makeRoot(evals);
  const ev = runner.normalizeEval(evals[0]);
  assert.equal(runner.resolveFixture(ev, root), null);
  assert.equal(runner.sizingFixture(ev, root), path.join(root, 'evals', 'fixtures', 'foo-output.md'));
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--dry-run']);
  const foo = r.report.plan.find((p) => p.id === 0);
  assert.equal(foo.candidate, 'live');
  assert.equal(foo.steps[0].output_tokens, runner.estimateTokens(FIXTURE_TEXT, 4));
  // and the structural tier has nothing to replay against
  assert.equal(runJson(['--evals', path.join(root, 'evals', 'evals.json')]).report.evals.length, 0);
});

test('validateSpec: a missing explicit fixture is an error', () => {
  const evals = baseEvals();
  evals[0].fixture = 'nope-output.md';
  const { errors } = runner.validateSpec({ evals }, { root: makeRoot([]) });
  assert.match(errors.join('\n'), /fixture nope-output\.md not found/);
});

test('run stops with exit 3 once reported spend exhausts the run budget', () => {
  const root = makeRoot(baseEvals());
  const fake = makeFakeClaude(root, { judgeCost: 9 });
  const env = { NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: 'k', NAKSHA_EVALS_CLAUDE_BIN: fake.bin };
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--budget', '5'], env);
  assert.equal(r.code, 3);
  assert.equal(r.report.evals[1].skipped, 'run budget exhausted');
  assert.equal(readCalls(fake.log).length, 1);
});

test('a missing claude binary fails the eval without charging the estimate', () => {
  const root = makeRoot(baseEvals());
  const env = { NAKSHA_EVALS_PAID: '1', ANTHROPIC_API_KEY: 'k', NAKSHA_EVALS_CLAUDE_BIN: path.join(root, 'no-such-claude') };
  const r = runJson(['--evals', path.join(root, 'evals', 'evals.json'), '--tier', 'judge', '--filter', '0'], env);
  assert.equal(r.code, 1);
  assert.match(r.report.evals[0].error, /judge failed/);
  assert.equal(r.report.spent_usd, 0);
});

test('judge prompt lists only judge-tier assertions and fences the candidate', () => {
  const ev = runner.normalizeEval(baseEvals()[0]);
  const prompt = runner.buildJudgePrompt(ev, 'CANDIDATE TEXT');
  assert.match(prompt, /- has-hero: Has a hero section/);
  assert.doesNotMatch(prompt, /has-grid/);
  assert.match(prompt, /<candidate_output>\nCANDIDATE TEXT\n<\/candidate_output>/);
});

test('e2e prompt is prefixed with the eval command when the prompt lacks one', () => {
  assert.equal(runner.e2ePrompt(runner.normalizeEval(baseEvals()[0])), '/foo Design a landing page.');
  assert.equal(runner.e2ePrompt(runner.normalizeEval(baseEvals()[1])), '/bar make a card');
});
