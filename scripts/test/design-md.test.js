'use strict';

// Tests for scripts/design-md.js. Run: node --test scripts/test/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const dm = require('../design-md.js');

const SCRIPT = path.join(__dirname, '..', 'design-md.js');
const FIX = path.join(__dirname, 'fixtures', 'design-md');
const SYSTEM = path.join(FIX, 'project', '.naksha', 'design-system');
const read = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');
const parse = (f) => dm.parseDesignMd(read(f));
const cli = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: FIX, encoding: 'utf8' });
const tmpDirs = [];
const tmpDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'design-md-')); tmpDirs.push(d); return d; };
test.after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
const rules = (report, severity) => report.findings.filter((f) => !severity || f.severity === severity).map((f) => `${f.rule}:${f.path}`);

// Normalises cosmetic differences that a round-trip may legitimately change.
function comparable(model) {
  const m = JSON.parse(JSON.stringify({ name: model.name, colors: model.colors, typography: model.typography, rounded: model.rounded, spacing: model.spacing, components: model.components }));
  for (const [k, v] of Object.entries(m.colors)) if (/^#[0-9a-f]{6}$/i.test(v)) m.colors[k] = v.toLowerCase();
  for (const t of Object.values(m.typography)) {
    for (const k of ['fontWeight', 'lineHeight']) if (typeof t[k] === 'string' && /^[\d.]+$/.test(t[k])) t[k] = Number(t[k]);
  }
  return m;
}

// Minimal DTCG 2025.10 conformance check for the parts design-md.js emits
// (rules from the format TR and the community group's conformance test suite).
function dtcgProblems(doc) {
  const problems = [];
  const tokens = new Map();
  const isDim = (v) => v && typeof v.value === 'number' && ['px', 'rem'].includes(v.unit) && Object.keys(v).length === 2;
  const isAlias = (v) => (typeof v === 'string' && /^\{[^{}]+\}$/.test(v)) || (v && typeof v.$ref === 'string');
  const walk = (node, segs, type) => {
    const t = node.$type || type;
    for (const [k, child] of Object.entries(node)) {
      if (k.startsWith('$') && k !== '$root') continue;
      const p = segs.concat(k === '$root' ? [] : [k]);
      if (/[{}.]/.test(k)) problems.push(`${p.join('.')}: invalid name`);
      if (child === null || typeof child !== 'object') { problems.push(`${p.join('.')}: not an object`); continue; }
      if ('$value' in child) {
        if (Object.keys(child).some((c) => !c.startsWith('$'))) problems.push(`${p.join('.')}: token has children`);
        tokens.set(p.join('.'), { type: child.$type || t, value: child.$value, path: p.join('.') });
      } else walk(child, p, t);
    }
  };
  walk(doc, [], undefined);
  for (const tok of tokens.values()) {
    const { type, value: v, path: p } = tok;
    if (isAlias(v)) {
      if (typeof v === 'string' && !tokens.has(v.slice(1, -1))) problems.push(`${p}: dangling alias ${v}`);
      continue;
    }
    if (type === 'color') {
      if (v.colorSpace !== 'srgb' || v.components.length !== 3 || v.components.some((c) => c < 0 || c > 1)) problems.push(`${p}: bad colour components`);
      if (v.alpha !== undefined && (v.alpha < 0 || v.alpha > 1)) problems.push(`${p}: bad alpha`);
      if (v.hex !== undefined && !/^#[0-9a-f]{6}$/i.test(v.hex)) problems.push(`${p}: hex must be 6 digits`);
    } else if (type === 'dimension') {
      if (!isDim(v)) problems.push(`${p}: bad dimension ${JSON.stringify(v)}`);
    } else if (type === 'number') {
      if (typeof v !== 'number') problems.push(`${p}: bad number`);
    } else if (type === 'typography') {
      for (const f of ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight']) if (v[f] === undefined) problems.push(`${p}: typography missing ${f}`);
      for (const f of ['fontSize', 'letterSpacing']) if (v[f] !== undefined && !isAlias(v[f]) && !isDim(v[f])) problems.push(`${p}: typography ${f} not a dimension`);
      if (!isAlias(v.lineHeight) && typeof v.lineHeight !== 'number') problems.push(`${p}: lineHeight must be a number`);
      if (!isAlias(v.fontWeight) && !(v.fontWeight >= 1 && v.fontWeight <= 1000)) problems.push(`${p}: bad fontWeight`);
    } else problems.push(`${p}: no resolvable $type (${type})`);
  }
  return problems;
}

// ── YAML subset ──────────────────────────────────────────────────────────────

test('yaml: scalars, quoting, comments and block scalars', () => {
  const y = dm.parseYaml([
    'a: "#1A1C1E"   # trailing comment',
    "b: 'it''s'",
    'c: 600',
    'd: -0.02em',
    'e: Public Sans',
    'f: ~',
    'g: [x, "y, z", 3]',
    'h: |',
    '  line one',
    '  # kept',
    'i: >-',
    '  folded',
    '  text',
    'list:',
    '  - spacing',
    '  - section: rounded',
    '    reason: none',
  ].join('\n'));
  assert.deepEqual(y, {
    a: '#1A1C1E', b: "it's", c: 600, d: '-0.02em', e: 'Public Sans', f: null,
    g: ['x', 'y, z', 3], h: 'line one\n# kept\n', i: 'folded text',
    list: ['spacing', { section: 'rounded', reason: 'none' }],
  });
});

test('yaml: rejects what the subset does not support', () => {
  assert.throws(() => dm.parseYaml('a: &anchor 1'), /not supported/);
  assert.throws(() => dm.parseYaml('a: 1\na: 2'), /duplicate key "a"/);
  assert.throws(() => dm.parseYaml('a:\n\t- x'), /tabs/);
  assert.throws(() => dm.parseYaml('a: one\n  two'), /multi-line plain scalars/);
  assert.throws(() => dm.parseYaml('a: [[1]]'), /nested flow/);
});

test('yaml: an unquoted # colour becomes an error, not a silent null', () => {
  const report = dm.lintModel(dm.parseDesignMd('---\nname: X\ncolors:\n  primary: #ff0000\n---\n'));
  assert.ok(rules(report, 'error').includes('unquoted-hex:colors.primary'));
});

// ── parse ────────────────────────────────────────────────────────────────────

test('parse: front matter tokens and canonical sections', () => {
  const { model, sections } = parse('basic.md');
  assert.equal(model.name, 'Harbor Ledger');
  assert.equal(model.colors.primary, '#1F3A5F');
  assert.equal(model.typography['headline-lg'].fontWeight, 600);
  assert.equal(model.typography['label-sm'].fontWeight, '500');
  assert.equal(model.spacing['grid-columns'], 12);
  assert.equal(model.components.chip.padding, '4px 12px');
  assert.deepEqual(sections.map((s) => s.canonical), ['Overview', 'Colors', 'Typography', 'Layout', 'Elevation & Depth', 'Shapes', 'Components', "Do's and Don'ts"]);
});

test('parse: interleaved yaml blocks merge; nested fences and groups handled', () => {
  const { model, sections } = parse('interleaved.md');
  assert.equal(model.colors.primary, 'oklch(0.45 0.09 160)', 'the ```yaml inside a ````markdown fence is ignored');
  assert.equal(model.colors['background.light'], '#f4f7f2', 'nested colour groups flatten to dotted names');
  assert.equal(model.spacing['1.5'], '6px');
  assert.equal(model.rounded.DEFAULT, '0.5rem');
  assert.equal(model.typography.caption.fontFamily, 'Atkinson Hyperlegible');
  assert.ok(!sections.some((s) => s.heading === 'Not a section'), 'headings inside fences are not sections');
  assert.equal(sections.find((s) => s.heading === 'Brand & Style').canonical, 'Overview');
});

test('parse: a top-level key defined in two blocks is rejected (CLI exit 1)', () => {
  assert.throws(() => parse('duplicate-key.md'), /"colors" is defined in both front matter and yaml block 1/);
  const r = cli('parse', 'duplicate-key.md');
  assert.equal(r.status, 1);
});

test('parse: CLI prints normalized JSON with resolved colours', () => {
  const r = cli('parse', 'interleaved.md', '--resolve');
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.spec, 'DESIGN.md alpha');
  assert.equal(out.resolved.colors.ink.hex, '#14201a', 'references resolve through to the literal');
  assert.match(out.resolved.colors.primary.hex, /^#[0-9a-f]{6}$/);
});

// ── colour + contrast math ─────────────────────────────────────────────────

test('colour: CSS colour syntaxes convert to sRGB', () => {
  const hex = (s) => dm.parseColor(s).hex;
  assert.equal(hex('#abc'), '#aabbcc');
  assert.equal(hex('rebeccapurple'), '#663399');
  assert.equal(hex('rgb(255 0 0 / 50%)'), '#ff0000');
  assert.equal(dm.parseColor('rgba(0, 0, 0, 0.25)').alpha, 0.25);
  assert.equal(hex('hsl(120, 100%, 25%)'), '#008000');
  assert.equal(hex('hwb(0 0% 0%)'), '#ff0000');
  assert.equal(hex('oklch(0.627955 0.257683 29.2339)'), '#ff0000');
  assert.equal(hex('lab(50% 0 0)'), '#777777');
  assert.equal(dm.parseColor('color-mix(in srgb, red, blue)'), null);
  assert.equal(dm.parseColor('not-a-colour'), null);
});

test('contrast: WCAG 2 ratios match reference values', () => {
  const c = (s) => dm.parseColor(s);
  assert.equal(dm.contrastRatio(c('#000'), c('#fff')).toFixed(2), '21.00');
  assert.equal(dm.contrastRatio(c('#767676'), c('#fff')).toFixed(2), '4.54');
  assert.equal(dm.contrastRatio(c('#777777'), c('#fff')).toFixed(2), '4.48');
  const glass = dm.pairContrast(c('#fff'), c('rgba(255,255,255,0.2)'));
  assert.equal(glass.translucent, true);
  assert.equal(glass.ratio.toFixed(2), '1.00', 'worst case is over a white backdrop');
});

// ── lint ───────────────────────────────────────────────────────────────────

test('lint: a well-formed document is clean', () => {
  const report = dm.lintModel(parse('basic.md'));
  assert.deepEqual(report.summary, { errors: 0, warnings: 0, infos: 0 });
  assert.equal(cli('lint', 'basic.md').status, 0);
});

test('lint: WCAG AA contrast on declared pairs, large text and naming pairs', () => {
  const report = dm.lintModel(parse('low-contrast.md'));
  const all = rules(report);
  assert.ok(rules(report, 'error').includes('contrast-ratio:components.caption-muted'), '3.03:1 body text fails AA');
  assert.ok(!all.includes('contrast-ratio:components.hero-title'), 'the same colours pass at 32px bold (large text, 3:1)');
  assert.ok(!all.includes('contrast-ratio:components.body-mid'), '5.0:1 passes AA');
  assert.ok(rules(report, 'warning').includes('contrast-ratio:components.glass-panel'), 'translucent pairs warn instead of fail');
  assert.ok(rules(report, 'warning').includes('contrast-ratio:colors.on-surface'), 'on-X colours are checked against X');
  const msg = report.findings.find((f) => f.path === 'components.caption-muted').message;
  assert.match(msg, /#949494 on #ffffff is 3\.03:1/);
});

test('lint: --level AAA tightens thresholds', () => {
  const report = dm.lintModel(parse('low-contrast.md'), { level: 'AAA' });
  assert.ok(rules(report, 'error').includes('contrast-ratio:components.body-mid'));
  assert.ok(rules(report, 'error').includes('contrast-ratio:components.hero-title'));
  assert.equal(cli('lint', 'low-contrast.md').status, 1);
});

test('lint: structural problems are reported with rules and lines', () => {
  const report = dm.lintModel(parse('invalid.md'));
  const errors = rules(report, 'error');
  const warnings = rules(report, 'warning');
  for (const r of ['unquoted-hex:colors.accent', 'invalid-color:colors.highlight', 'invalid-dimension:typography.body.fontSize', 'invalid-font-weight:typography.body.fontWeight', 'broken-ref:components.button.textColor', 'duplicate-section:## Colors']) {
    assert.ok(errors.includes(r), `expected error ${r}`);
  }
  for (const r of ['unknown-key:colours', 'unquoted-ref:components.link.textColor', 'unknown-typography-property:typography.body.textTransform', 'unknown-component-property:components.button.borderColor', 'section-order:## Overview']) {
    assert.ok(warnings.includes(r), `expected warning ${r}`);
  }
  assert.equal(report.findings.find((f) => f.rule === 'broken-ref').line, 18);
  const r = cli('lint', 'invalid.md', '--json');
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).summary.errors, errors.length);
});

test('lint: --strict fails on warnings', () => {
  const file = path.join(tmpDir(), 'DESIGN.md');
  fs.writeFileSync(file, '---\nname: W\ncolors:\n  brand: "#000000"\ntypography:\n  b:\n    fontSize: 16px\n---\n');
  assert.equal(cli('lint', file).status, 0);
  assert.equal(cli('lint', file, '--strict').status, 1);
});

// ── export ─────────────────────────────────────────────────────────────────

test('export dtcg: DTCG 2025.10 structure', () => {
  const notes = [];
  const out = dm.toDtcg(parse('basic.md').model, notes);
  assert.equal(out.$schema, 'https://www.designtokens.org/schemas/2025.10/format.json');
  assert.equal(out.colors.$type, 'color');
  assert.deepEqual(out.colors.primary.$value, { colorSpace: 'srgb', components: [0.1216, 0.2275, 0.3725], hex: '#1f3a5f' });
  assert.deepEqual(out.rounded.md.$value, { value: 8, unit: 'px' });
  assert.deepEqual(out.spacing['grid-columns'], { $type: 'number', $value: 12 });
  const h = out.typography['headline-lg'];
  assert.equal(h.$type, 'typography');
  assert.deepEqual(h.$value.letterSpacing, { value: -0.32, unit: 'px' }, 'em letter-spacing converts via the font size');
  assert.equal(h.$value.lineHeight, 1.2);
  assert.deepEqual(out.typography['body-md'].$value.fontFamily, ['Inter', 'sans-serif']);
  assert.equal(out.typography['body-md'].$value.lineHeight, 1.5, '24px line height on 1rem becomes a 1.5 multiplier');
  assert.equal(out.components['button-primary'].backgroundColor.$value, '{colors.primary}', 'references stay DTCG aliases');
  assert.deepEqual(out.components.chip.$extensions['naksha.design-md'].unmapped, { padding: '4px 12px' });
  const names = JSON.stringify(out).match(/"[^"]*\.[^"]*":/g) || [];
  assert.deepEqual(names.filter((n) => !n.startsWith('"naksha.')), [], 'no token or group name contains a period');
});

test('export dtcg: output passes the DTCG conformance rules it touches', () => {
  for (const f of ['basic.md', 'interleaved.md', 'low-contrast.md', 'invalid.md']) {
    let model;
    try { model = parse(f).model; } catch { continue; }
    assert.deepEqual(dtcgProblems(dm.toDtcg(model, [])), [], f);
  }
  const fromCss = dm.fromTokensFile(read('tokens.css'), 'tokens.css', {}, []);
  assert.deepEqual(dtcgProblems(dm.toDtcg(fromCss, [])), [], 'tokens.css → DESIGN.md → DTCG');
});

test('export dtcg: partial typography is completed with recorded defaults', () => {
  const notes = [];
  const out = dm.toDtcg(parse('interleaved.md').model, notes);
  const caption = out.typography.caption;
  assert.equal(caption.$value.fontWeight, 400);
  assert.deepEqual(caption.$extensions['naksha.design-md'].defaulted, ['fontWeight', 'letterSpacing']);
  assert.ok(notes.some((n) => /typography\.caption: DTCG requires fontWeight, letterSpacing/.test(n)));
});

test('export dtcg: aliases to values DTCG cannot hold are kept, not left dangling', () => {
  const md = '---\nname: M\ncolors:\n  primary: "#000000"\n  mix: color-mix(in srgb, red, blue)\n  alias: "{colors.mix}"\n---\n';
  const model = dm.parseDesignMd(md).model;
  const out = dm.toDtcg(model, []);
  assert.deepEqual(dtcgProblems(out), []);
  assert.deepEqual(out.colors.$extensions['naksha.design-md'].unmapped, { mix: 'color-mix(in srgb, red, blue)', alias: '{colors.mix}' });
  const back = dm.fromDtcg(JSON.parse(JSON.stringify(out)), [], 'M');
  assert.equal(back.colors.mix, 'color-mix(in srgb, red, blue)');
  assert.equal(back.colors.alias, '{colors.mix}');
});

test('export dtcg: nested names become groups, $root resolves collisions', () => {
  const out = dm.toDtcg(parse('interleaved.md').model);
  assert.ok(out.colors.background.light.$value.hex);
  assert.equal(out.colors.ink.$value, '{colors.background.dark}');
  assert.ok(out.spacing['1'] && out.spacing['1']['5'], '"1.5" nests as 1 → 5');
  assert.equal(out.colors.primary.$extensions['naksha.design-md'].css, 'oklch(0.45 0.09 160)', 'original wide-gamut value is preserved');
});

test('export css: custom properties with var() references', () => {
  const css = dm.toCss(parse('basic.md').model);
  assert.match(css, /^\/\* Design tokens for Harbor Ledger/);
  assert.match(css, /--color-primary: #1F3A5F;/);
  assert.match(css, /--typography-body-md-font-family: Inter, sans-serif;/);
  assert.match(css, /--typography-headline-lg-font-family: "Source Serif 4";/);
  assert.match(css, /--button-primary-background-color: var\(--color-primary\);/);
  assert.match(css, /--button-primary-font-size: var\(--typography-label-sm-font-size\);/);
  assert.match(dm.toCss(parse('basic.md').model, { prefix: 'hl' }), /--hl-card-padding: var\(--hl-spacing-md\);/);
});

test('export tailwind: v4 @theme and v3 theme.extend', () => {
  const v4 = dm.toTailwindV4(parse('interleaved.md').model);
  assert.match(v4, /@theme \{/);
  assert.match(v4, /--color-background-light: #f4f7f2;/);
  assert.match(v4, /--color-ink: var\(--color-background-dark\);/);
  assert.match(v4, /--text-caption: 0\.875rem;/);
  assert.match(v4, /--text-caption--line-height: 1\.4;/);
  assert.match(v4, /--radius: 0\.5rem;/, 'rounded.DEFAULT maps to the bare --radius');
  const v3 = JSON.parse(dm.toTailwindV3(parse('basic.md').model));
  assert.deepEqual(v3.theme.extend.fontSize['label-sm'], ['12px', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '500' }]);
  assert.deepEqual(v3.theme.extend.fontFamily['body-md'], ['Inter', 'sans-serif']);
  assert.equal(v3.theme.extend.spacing['grid-columns'], undefined, 'unitless spacing is not a Tailwind spacing value');
  const r = cli('export', '--to', 'tailwind', 'basic.md');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /--text-headline-lg--letter-spacing: -0\.01em;/);
});

test('export: bad target is a usage error (exit 2); a missing file is exit 2', () => {
  assert.equal(cli('export', '--to', 'scss', 'basic.md').status, 2);
  assert.equal(cli('lint', 'does-not-exist.md').status, 2);
  assert.equal(cli('frobnicate').status, 2);
});

// ── round-trips ────────────────────────────────────────────────────────────

for (const f of ['basic.md', 'interleaved.md', 'low-contrast.md']) {
  test(`round-trip: ${f} → DTCG → DESIGN.md keeps every token`, () => {
    const a = parse(f).model;
    const dtcg = JSON.parse(JSON.stringify(dm.toDtcg(a)));
    const back = dm.parseDesignMd(dm.toDesignMd(dm.fromDtcg(dtcg, [], a.name))).model;
    assert.deepEqual(comparable(back), comparable(a));
  });
  test(`round-trip: ${f} → DESIGN.md writer → parse is lossless`, () => {
    const a = parse(f).model;
    assert.deepEqual(comparable(dm.parseDesignMd(dm.toDesignMd(a)).model), comparable(a));
  });
}

test('round-trip: CSS → DESIGN.md → CSS keeps values', () => {
  const md = dm.toDesignMd(dm.fromTokensFile(read('tokens.css'), 'tokens.css', {}, []));
  const css = dm.toCss(dm.parseDesignMd(md).model);
  assert.match(css, /--color-brand: #4f46e5;/);
  assert.match(css, /--color-text-primary: var\(--color-ink\);/);
  assert.match(css, /--rounded-md: 6px;/);
});

// ── from-tokens ──────────────────────────────────────────────────────────

test('from-tokens: CSS custom properties are classified into token groups', () => {
  const notes = [];
  const m = dm.fromTokensFile(read('tokens.css'), 'tokens.css', { name: 'Lumen Desk' }, notes);
  assert.equal(m.name, 'Lumen Desk');
  assert.equal(m.colors.brand, '#4f46e5');
  assert.equal(m.colors['text-primary'], '{colors.ink}');
  assert.equal(m.colors.primary, '{colors.brand}', 'a primary alias is added when the source has none');
  assert.equal(m.spacing['0'], '0px');
  assert.deepEqual(m.typography.sm, { fontSize: '0.875rem', lineHeight: 1.25 });
  assert.equal(m.typography.sans.fontFamily, 'Inter, system-ui, sans-serif');
  assert.deepEqual(m.components['btn-primary'], { backgroundColor: '{colors.brand}', textColor: '{colors.paper}' });
  assert.equal(m.components.btn.padding, '0.5rem 1rem', 'padding-x/-y collapse into padding');
  assert.equal(m.components.card.rounded, '{rounded.md}');
  assert.ok(notes.some((n) => /2 custom properties outside a top-level :root/.test(n)), 'dark-mode overrides are reported, not merged');
  const md = dm.toDesignMd(m, { source: 'tokens.css' });
  assert.match(md, /## Elevation & Depth\n\n- \*\*shadow-sm\*\*/);
  assert.equal(dm.lintModel(dm.parseDesignMd(md)).summary.errors, 0);
});

test('from-tokens: generic DTCG files map types, aliases and $root', () => {
  const notes = [];
  const m = dm.fromTokensFile(read('tokens.dtcg.json'), 'tokens.dtcg.json', {}, notes);
  assert.equal(m.name, 'tokens');
  assert.equal(m.description, 'Orchard Kit tokens');
  assert.equal(m.colors['brand-500'], '#226644');
  assert.equal(m.colors.scrim, '#00000080');
  assert.equal(m.colors.highlight, 'oklch(0.8 0.12 95)');
  assert.equal(m.colors.text, '{colors.brand-500}', 'aliases are rewritten to DESIGN.md paths');
  assert.equal(m.rounded.small, '4px', 'radius groups map to rounded');
  assert.equal(m.spacing.inset, '12px', '$root takes the group name');
  assert.equal(m.spacing['inset-wide'], '24px');
  assert.deepEqual(m.typography.body, { fontFamily: 'Work Sans, Helvetica, sans-serif', fontSize: '16px', fontWeight: 600, lineHeight: 1.5, letterSpacing: '0px' });
  assert.ok(notes.some((n) => /shadow\.card: DTCG type "shadow"/.test(n)));
});

test('from-tokens: CLI writes a DESIGN.md that lints clean', () => {
  const out = path.join(tmpDir(), 'MASTER.md');
  const r = cli('from-tokens', 'tokens.dtcg.json', '--name', 'Orchard Kit', '--out', out);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(out, 'utf8'), /^---\nversion: alpha\nname: Orchard Kit\n/);
  assert.equal(cli('lint', out).status, 0);
});

// ── MASTER.md + page overrides ───────────────────────────────────────────

test('resolve: page override > MASTER.md > brand defaults', () => {
  const sys = dm.resolveSystem({ dir: SYSTEM, page: 'checkout' });
  assert.equal(sys.model.colors.accent, '#0F766E', 'page wins over master');
  assert.equal(sys.model.colors.ink, '#1C1917', 'master fills what the page leaves out');
  assert.equal(sys.model.colors.primary, '#7C2D12', 'brand default fills a gap in both');
  assert.equal(sys.model.rounded.md, '4px');
  assert.deepEqual(sys.model.components['button-primary'], { backgroundColor: '{colors.primary}', textColor: '{colors.on-primary}', rounded: '{rounded.md}', padding: '16px' }, 'component properties merge one by one');
  assert.equal(sys.model.components['promo-badge'], undefined, 'null in a page override removes a token');
  assert.equal(sys.provenance['colors.accent'], 'page');
  assert.equal(sys.provenance['colors.primary'], 'brand');
  assert.equal(sys.provenance['components.button-primary'], 'page+master');
});

test('resolve: master alone, unknown page, and --no-brand', () => {
  const master = dm.resolveSystem({ dir: SYSTEM });
  assert.equal(master.model.colors.accent, '#B45309');
  assert.equal(dm.resolveSystem({ dir: SYSTEM, page: 'unknown-page' }).sources.page, null, 'a missing override falls back to MASTER.md');
  assert.equal(dm.resolveSystem({ dir: SYSTEM, brand: false }).model.colors.primary, undefined);
});

test('resolve: CLI output, merged lint, and page-name validation', () => {
  const r = cli('resolve', '--dir', SYSTEM, '--page', 'checkout');
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.precedence, ['page override', 'MASTER.md', 'brand defaults (.naksha/project.json)']);
  assert.equal(out.brandFont, 'Inter');
  const md = cli('resolve', '--dir', SYSTEM, '--page', 'checkout', '--format', 'md');
  assert.match(md.stdout, /<!-- from pages\/checkout\.md; replaces the MASTER\.md section -->\nCheckout trades copper/);
  assert.equal(cli('lint', '--dir', SYSTEM, '--page', 'checkout').status, 0, 'merged system is valid');
  assert.equal(cli('lint', path.join(SYSTEM, 'MASTER.md')).status, 1, 'MASTER.md alone has a dangling {colors.primary}');
  assert.equal(cli('resolve', '--dir', SYSTEM, '--page', '../secrets').status, 2);
  assert.equal(cli('resolve', '--dir', path.join(FIX, 'nope')).status, 2);
  const css = cli('export', '--to', 'css', '--dir', SYSTEM, '--page', 'checkout');
  assert.match(css.stdout, /--color-accent: #0F766E;/);
});
