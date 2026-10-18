'use strict';
// Unit tests for scripts/design-lint.js and the PostToolUse lint hook.
// Run: node --test scripts/test/

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const lint = require('../design-lint.js');

const FIXTURES = path.join(__dirname, 'fixtures');
const LINTER = path.join(__dirname, '..', 'design-lint.js');
const HOOK = path.join(__dirname, '..', 'design-lint-hook.sh');
const fx = name => path.join(FIXTURES, name);

// Every run happens in a scratch cwd so the repo's .design-lint.json and
// .naksha/project.json never leak into results and no report lands in the repo.
function tmpdir(project) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha-lint-'));
  if (project) {
    fs.mkdirSync(path.join(dir, '.naksha'));
    fs.writeFileSync(path.join(dir, '.naksha', 'project.json'), JSON.stringify(project));
  }
  return dir;
}

function run(files, opts = {}) {
  const cwd = opts.cwd || tmpdir();
  return lint.lintFiles(files, { cwd, config: { ...lint.DEFAULT_CONFIG, ...(opts.config || {}) }, rules: opts.rules, project: opts.project });
}

function cli(args, opts = {}) {
  const cwd = opts.cwd || tmpdir();
  const env = { ...process.env, ...(opts.env || {}) };
  if (!opts.env || !('CHANGED_FILES' in opts.env)) delete env.CHANGED_FILES;
  const res = spawnSync(process.execPath, [LINTER, ...args], { cwd, env, encoding: 'utf-8' });
  return { ...res, cwd };
}

function fixtureFor(id, kind) {
  return fs.readdirSync(FIXTURES).find(f => f.startsWith(`${id}.${kind}.`));
}

describe('every rule has a positive and a negative fixture', () => {
  for (const id of lint.RULE_IDS) {
    test(`${id}: bad fixture is flagged`, () => {
      const bad = fixtureFor(id, 'bad');
      assert.ok(bad, `missing fixture scripts/test/fixtures/${id}.bad.*`);
      const report = run([fx(bad)], { rules: [id] });
      const hits = report.issues.filter(i => i.rule === id);
      assert.equal(hits.length, 1, `expected ${id} to fire on ${bad}`);
      const ruleDef = lint.RULES.find(r => r.id === id);
      assert.equal(hits[0].severity, ruleDef.severity);
      assert.ok(hits[0].message.length > 0 && hits[0].fix.length > 0, 'message and fix hint are required');
    });
    test(`${id}: good fixture is clean`, () => {
      const good = fixtureFor(id, 'good');
      assert.ok(good, `missing fixture scripts/test/fixtures/${id}.good.*`);
      const report = run([fx(good)], { rules: [id] });
      assert.deepEqual(report.issues.map(i => `${i.rule}: ${i.message}`), []);
    });
  }
});

describe('rule details', () => {
  test('rule metadata is complete and ids are unique', () => {
    assert.equal(new Set(lint.RULE_IDS).size, lint.RULE_IDS.length);
    for (const r of lint.RULES) {
      assert.match(r.id, /^[a-z][a-z0-9-]+$/);
      assert.ok(['error', 'warning'].includes(r.severity), `${r.id} severity`);
      for (const key of ['label', 'category', 'role', 'fix']) assert.ok(r[key], `${r.id} needs ${key}`);
    }
  });

  test('contrast-aa reports every failing pair, resolves var() and suggests a passing color', () => {
    const [issue] = run([fx('contrast-aa.bad.css')], { rules: ['contrast-aa'] }).issues;
    assert.equal(issue.count, 4);
    assert.match(issue.message, /#999999 on #ffffff is 2\.85:1/);
    assert.match(issue.message, /\.caption/);
    assert.match(issue.message, /try #[0-9a-f]{6}/);
    assert.deepEqual(issue.lines, [2, 3, 4, 5]);
  });

  test('contrast-aa raises the floor for WCAG AAA projects', () => {
    const file = fx('contrast-aa.good.css');
    const aaa = run([file], { rules: ['contrast-aa'], project: { constraints: { accessibility_target: 'WCAG AAA' } } });
    assert.equal(aaa.settings.contrastMin, 7);
    assert.equal(aaa.issues.length, 1, '#767676 on white passes AA but not AAA');
  });

  test('spacing-grid reads constraints.grid from .naksha/project.json', () => {
    const cwd = tmpdir({ constraints: { grid: '8px' } });
    const report = lint.lintFiles([fx('spacing-grid.good.css')], { cwd, config: { ...lint.DEFAULT_CONFIG }, rules: ['spacing-grid'] });
    assert.equal(report.settings.grid, 8);
    assert.equal(report.issues.length, 1);
    assert.match(report.issues[0].message, /12px/);
  });

  test('hardcoded-color names the matching token', () => {
    const [issue] = run([fx('hardcoded-color.bad.css')], { rules: ['hardcoded-color'] }).issues;
    assert.match(issue.message, /#3b82f6 → var\(--color-brand\)/);
    assert.match(issue.message, /rgb\(17, 24, 39\) → var\(--color-text\)/);
  });

  test('tokens from a stylesheet apply to other files in the same run', () => {
    const dir = tmpdir();
    fs.writeFileSync(path.join(dir, 'tokens.css'), ':root { --ink: #222222; }\n');
    fs.writeFileSync(path.join(dir, 'card.css'), '.card { color: #222222; }\n');
    const report = lint.lintFiles(['tokens.css', 'card.css'], { cwd: dir, config: { ...lint.DEFAULT_CONFIG }, rules: ['hardcoded-color'] });
    assert.equal(report.issues.length, 1);
    assert.equal(report.issues[0].file, 'card.css');
    assert.match(report.issues[0].message, /var\(--ink\)/);
  });

  test('slop-gradient-hero is allowed when the brand lives in that hue band', () => {
    const report = run([fx('slop-gradient-hero.bad.css')], { rules: ['slop-gradient-hero'], project: { brand: { primary: '#6d28d9' } } });
    assert.equal(report.issues.length, 0);
  });

  test('component files: JSX braces, capitalized components and spreads', () => {
    const bad = run([fx('component.bad.jsx')], { rules: ['clickable-div', 'img-alt'] });
    assert.deepEqual(bad.issues.map(i => i.rule).sort(), ['clickable-div', 'img-alt']);
    const good = run([fx('component.good.jsx')], { rules: ['clickable-div', 'img-alt'] });
    assert.deepEqual(good.issues, []);
  });

  test('vue: @click divs and <style> blocks are linted', () => {
    const report = run([fx('component.bad.vue')], { rules: ['clickable-div', 'contrast-aa'] });
    assert.deepEqual(report.issues.map(i => i.rule).sort(), ['clickable-div', 'contrast-aa']);
  });

  test('tailwind class patterns', () => {
    const report = run([fx('tailwind-slop.bad.html')], { rules: ['slop-gradient-hero', 'slop-gradient-text', 'spacing-grid', 'focus-visible'] });
    assert.deepEqual(report.issues.map(i => i.rule).sort(), ['focus-visible', 'slop-gradient-hero', 'slop-gradient-text', 'spacing-grid']);
  });

  test('per-rule overrides in config: off and severity change', () => {
    const off = run([fx('img-alt.bad.html')], { config: { rules: { 'img-alt': 'off' } } });
    assert.ok(!off.issues.some(i => i.rule === 'img-alt'));
    const promoted = run([fx('warnings-only.css')], { rules: ['spacing-grid'], config: { rules: { 'spacing-grid': 'error' } } });
    assert.equal(promoted.issues[0].severity, 'error');
    assert.equal(promoted.exitCode, 1);
  });

  test('legacy group toggles still disable their rules', () => {
    const report = run([fx('contrast-aa.bad.css')], { config: { checkContrast: false } });
    assert.ok(!report.issues.some(i => i.rule === 'contrast-aa'));
  });
});

describe('helpers', () => {
  test('parseColor handles hex, rgb, hsl, named, alpha and var()', () => {
    assert.deepEqual(lint.parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
    assert.deepEqual(lint.parseColor('rgb(0 128 255 / 50%)'), { r: 0, g: 128, b: 255, a: 0.5 });
    assert.deepEqual(lint.parseColor('hsl(0, 0%, 0%)'), { r: 0, g: 0, b: 0, a: 1 });
    assert.equal(lint.parseColor('rebeccapurple').r, 0x66);
    assert.equal(lint.parseColor('currentColor'), null);
    assert.equal(lint.parseColor('var(--x)', new Map([['--x', '#000']])).r, 0);
    assert.equal(lint.parseColor('var(--missing, #ff0000)').r, 255);
  });

  test('contrastRatio matches WCAG reference values', () => {
    assert.equal(lint.contrastRatio(lint.parseColor('#000'), lint.parseColor('#fff')).toFixed(1), '21.0');
    assert.equal(lint.contrastRatio(lint.parseColor('#767676'), lint.parseColor('#fff')).toFixed(2), '4.54');
  });

  test('parseCss handles nesting, at-rules, comments and strings', () => {
    const rules = lint.parseCss('/* c */ @media (min-width: 1px) { .a { color: red; .b { content: "};"; } } }', 0, '', true);
    const a = rules.find(r => r.selector === '.a');
    const b = rules.find(r => r.selector === '.b');
    assert.deepEqual(a.decls.map(d => d.prop), ['color']);
    assert.deepEqual(a.parents, ['@media (min-width: 1px)']);
    assert.equal(b.decls[0].value, '"};"');
  });

  test('ignore patterns support dir/**, dir/ and basename globs', () => {
    assert.ok(lint.matchesIgnore('dist/app.css', 'dist/**'));
    assert.ok(lint.matchesIgnore('a/b/vendor.min.html', '*.min.html'));
    assert.ok(!lint.matchesIgnore('src/app.html', '*.min.html'));
    assert.ok(lint.matchesIgnore('src/x/y.css', 'src/**/*.css'));
  });
});

describe('CLI', () => {
  test('exit 0 on a clean file', () => {
    const res = cli([fx('clean.html')]);
    assert.equal(res.status, 0, res.stdout + res.stderr);
  });

  test('exit 0 when there are only warnings', () => {
    const res = cli([fx('warnings-only.css')]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /spacing-grid/);
  });

  test('exit 1 on errors; a local text run leaves no report file, --report writes one', () => {
    const local = cli([fx('img-alt.bad.html')]);
    assert.equal(local.status, 1);
    assert.ok(!fs.existsSync(path.join(local.cwd, 'design-lint-report.json')), 'no report file left in the user folder');
    const res = cli(['--report', fx('img-alt.bad.html')]);
    assert.equal(res.status, 1);
    const report = JSON.parse(fs.readFileSync(path.join(res.cwd, 'design-lint-report.json'), 'utf-8'));
    assert.ok(report.issues.some(i => i.rule === 'img-alt' && i.check && i.severity === 'error'));
    assert.equal(typeof report.score, 'number');
  });

  test('--json prints parseable JSON and writes no report file', () => {
    const res = cli(['--json', fx('img-alt.bad.html')]);
    assert.equal(res.status, 1);
    const report = JSON.parse(res.stdout);
    assert.equal(report.status, 'issues');
    assert.ok(!fs.existsSync(path.join(res.cwd, 'design-lint-report.json')));
  });

  test('--rules limits the run', () => {
    const res = cli(['--json', '--rules', 'html-lang,viewport-meta', fx('img-alt.bad.html')]);
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout).issues, []);
    const eq = cli(['--json', '--rules=img-alt', fx('img-alt.bad.html')]);
    assert.deepEqual(JSON.parse(eq.stdout).issues.map(i => i.rule), ['img-alt']);
  });

  test('exit 2 on bad usage', () => {
    assert.equal(cli(['--nope']).status, 2);
    assert.equal(cli(['--rules', 'not-a-rule', fx('clean.html')]).status, 2);
    assert.equal(cli(['--rules']).status, 2);
    const missing = cli(['does-not-exist.html']);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /not found/);
  });

  test('--list-rules lists every rule', () => {
    const res = cli(['--list-rules', '--json']);
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout).map(r => r.id), lint.RULE_IDS);
  });

  test('CI mode with no lintable files reports "nothing to lint", not a perfect score', () => {
    const res = cli([], { env: { CHANGED_FILES: '' } });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /nothing to lint/i);
    assert.doesNotMatch(res.stdout, /100\/100/);
    const report = JSON.parse(fs.readFileSync(path.join(res.cwd, 'design-lint-report.json'), 'utf-8'));
    assert.equal(report.status, 'nothing-to-lint');
    assert.equal(report.score, null);
    assert.equal(report.files, 0);
  });

  test('CI mode lints CHANGED_FILES and honors ignorePatterns', () => {
    const cwd = tmpdir();
    fs.copyFileSync(fx('img-alt.bad.html'), path.join(cwd, 'page.html'));
    fs.copyFileSync(fx('vendor.min.html'), path.join(cwd, 'vendor.min.html'));
    fs.writeFileSync(path.join(cwd, '.design-lint.json'), JSON.stringify({ ignorePatterns: ['*.min.html'] }));
    const res = cli(['--json'], { cwd, env: { CHANGED_FILES: 'page.html vendor.min.html deleted.css' } });
    const report = JSON.parse(res.stdout);
    assert.deepEqual(report.filesLinted, ['page.html']);
    assert.ok(report.skipped.some(s => s.file === 'vendor.min.html' && /ignored/.test(s.reason)));
    assert.equal(res.status, 1);
  });
});

describe('PostToolUse hook', () => {
  function hook(payload, cwd) {
    const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const res = spawnSync('bash', [HOOK], { input, cwd: cwd || tmpdir(), encoding: 'utf-8' });
    assert.equal(res.status, 0, res.stderr);
    return JSON.parse(res.stdout);
  }

  test('lints an edited UI file in a path with spaces and stays non-blocking', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha hook '));
    fs.mkdirSync(path.join(cwd, 'my src'));
    fs.copyFileSync(fx('img-alt.bad.html'), path.join(cwd, 'my src', 'page one.html'));
    const out = hook({ hook_event_name: 'PostToolUse', tool_name: 'Write', cwd, tool_input: { file_path: path.join(cwd, 'my src', 'page one.html') } }, cwd);
    assert.equal(out.continue, true);
    assert.match(out.systemMessage, /img-alt/);
    assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.notEqual(out.decision, 'block');
    assert.ok(!fs.existsSync(path.join(cwd, 'design-lint-report.json')), 'hook must not write files');
  });

  test('ignores non-UI files, clean files, missing files and malformed input', () => {
    assert.deepEqual(hook({ tool_input: { file_path: 'README.md' } }), { continue: true });
    assert.deepEqual(hook({ tool_input: { file_path: fx('clean.html') } }), { continue: true });
    assert.deepEqual(hook({ tool_input: { file_path: '/nope/missing.html' } }), { continue: true });
    assert.deepEqual(hook({ hook_event_name: 'PostToolUse' }), { continue: true });
    assert.deepEqual(hook('not json "x.html"'), { continue: true });
    assert.deepEqual(hook(''), { continue: true });
  });

  test('can be silenced with "hook": false', () => {
    const cwd = tmpdir();
    fs.writeFileSync(path.join(cwd, '.design-lint.json'), JSON.stringify({ hook: false }));
    fs.copyFileSync(fx('img-alt.bad.html'), path.join(cwd, 'a.html'));
    assert.deepEqual(hook({ cwd, tool_input: { file_path: 'a.html' } }, cwd), { continue: true });
  });
});

describe('stylesheets linted on their own (TEST-RESULTS R9, R10)', () => {
  const tokensCss = ':root {\n' + Array.from({ length: 90 }, (_, i) => `  --color-shade-${i}: #${(0x102030 + i * 0x010101).toString(16)};`).join('\n') + '\n  --color-brand: #0b57d0;\n}\n';

  test('hardcoded-color sees tokens from an @import-ed tokens file', () => {
    const cwd = tmpdir();
    fs.writeFileSync(path.join(cwd, 'tokens.css'), tokensCss);
    fs.writeFileSync(path.join(cwd, 'styles.css'), '@import "tokens.css";\n.btn { color: #0b57d0; padding: 8px; }\n');
    const report = lint.lintFiles(['styles.css'], { cwd, project: null });
    const hit = report.issues.find(i => i.rule === 'hardcoded-color');
    assert.ok(hit, JSON.stringify(report.issues));
    assert.match(hit.message, /#0b57d0 → var\(--color-brand\)/);
  });

  test('a page that links tokens.css gets those tokens too; remote imports are ignored', () => {
    const cwd = tmpdir();
    fs.mkdirSync(path.join(cwd, 'css'));
    fs.writeFileSync(path.join(cwd, 'css', 'tokens.css'), tokensCss);
    fs.writeFileSync(path.join(cwd, 'index.html'),
      '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width">' +
      '<link rel="stylesheet" href="https://fonts.example/x.css"><link rel="stylesheet" href="css/tokens.css?v=2">' +
      '<style>.btn { color: #0b57d0; }</style></head><body><main><h1>Hi</h1></main></body></html>');
    const report = lint.lintFiles(['index.html'], { cwd, project: null });
    assert.ok(report.issues.some(i => i.rule === 'hardcoded-color' && /var\(--color-brand\)/.test(i.message)), JSON.stringify(report.issues));
  });

  test('media-queries does not fire on a tokens-only stylesheet', () => {
    const cwd = tmpdir();
    fs.writeFileSync(path.join(cwd, 'tokens.css'), tokensCss);
    assert.ok(tokensCss.length > 2000, 'fixture is big enough to trigger the rule');
    const report = lint.lintFiles(['tokens.css'], { cwd, project: null });
    assert.ok(!report.issues.some(i => i.rule === 'media-queries'), JSON.stringify(report.issues));
    // A real stylesheet of the same size still needs breakpoints.
    fs.writeFileSync(path.join(cwd, 'layout.css'), tokensCss.replace(/--color-shade-(\d+)/g, 'margin-top').replace(':root', '.box'));
    const layout = lint.lintFiles(['layout.css'], { cwd, project: null });
    assert.ok(layout.issues.some(i => i.rule === 'media-queries'));
  });
});

test('outside git and CI, no file arguments lints every UI file in the folder (/design-detect fallback, R8)', () => {
  const cwd = tmpdir();
  fs.copyFileSync(fx('img-alt.bad.html'), path.join(cwd, 'index.html'));
  fs.writeFileSync(path.join(cwd, 'notes.md'), '# not UI');
  const res = cli(['--json'], { cwd });
  const report = JSON.parse(res.stdout);
  assert.equal(report.status, 'issues');
  assert.deepEqual(report.filesLinted, ['index.html']);
  assert.ok(!fs.existsSync(path.join(cwd, 'design-lint-report.json')));
});
