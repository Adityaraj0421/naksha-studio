'use strict';
// The dashboard follows the naksha-studio brand (site/index.html, site/favicon.svg)
// and the strict CSP (no inline styles). These checks keep both from drifting.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { REPO } = require('./helpers');

const PUBLIC = path.join(REPO, 'dashboard', 'public');
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

test('the dashboard favicon is the site favicon', () => {
  const norm = (s) => s.replace(/\r\n/g, '\n').trim();
  assert.equal(norm(read(PUBLIC, 'favicon.svg')), norm(read(REPO, 'site', 'favicon.svg')));
});

test('no inline styles or injected <style> elements (the CSP allows style-src \'self\' only)', () => {
  const files = ['index.html', 'app.js', ...fs.readdirSync(path.join(PUBLIC, 'panels')).map((f) => path.join('panels', f))];
  for (const f of files) {
    const src = read(PUBLIC, f);
    assert.doesNotMatch(src, /createElement\(\s*['"]style['"]\s*\)/, `${f} creates a <style> element`);
    assert.doesNotMatch(src, /<style[\s>]/i, `${f} contains a <style> block`);
    assert.doesNotMatch(src, /\sstyle\s*=\s*["']/i, `${f} has an inline style attribute`);
    assert.doesNotMatch(src, /setAttribute\(\s*['"]style['"]/, `${f} sets a style attribute`);
    assert.doesNotMatch(src, /\.cssText\s*=/, `${f} assigns cssText`);
  }
});

test('style.css uses the site brand: iris accent, surfaces, ink and type families', () => {
  const css = read(PUBLIC, 'style.css').toUpperCase();
  for (const hex of ['#5C50E8', '#3A30B8', '#8E86F4', '#5247DE', '#070810', '#ECEEF5', '#11141E', '#FFFFFF', '#F3F4FA', '#14162A']) {
    assert.ok(css.includes(hex), `missing brand colour ${hex}`);
  }
  for (const family of ['"NEWSREADER"', '"INTER"', '"JETBRAINS MONO"']) assert.ok(css.includes(family), `missing ${family}`);
});

test('the header carries the site mark and the lowercase naksha-studio wordmark', () => {
  const html = read(PUBLIC, 'index.html');
  const site = read(REPO, 'site', 'index.html');
  assert.match(html, /<polyline class="mk-stroke" points="33,32 49,48 33,64"\/>/);
  assert.ok(site.includes('points="33,32 49,48 33,64"'), 'the site mark changed; update the dashboard header to match');
  assert.match(html, /class="wordmark"><span>naksha<span class="hy">-<\/span>studio<\/span>/);
});

// WCAG AA for the text tokens, read straight from style.css in both themes.
function tokens(css, selector) {
  const start = css.indexOf(selector + ' {');
  assert.ok(start >= 0, `no ${selector} block`);
  const body = css.slice(start, css.indexOf('}', start));
  const out = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}
function ratio(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('text tokens meet 4.5:1 on every surface in light and dark', () => {
  const css = read(PUBLIC, 'style.css');
  const light = tokens(css, ':root');
  const dark = { ...light, ...tokens(css, ':root[data-theme="dark"]') };
  for (const [mode, t] of [['light', light], ['dark', dark]]) {
    for (const fg of ['ink', 'ink-2', 'ink-3', 'accent-ink']) {
      for (const bg of ['bg', 'surface', 'surface-2']) {
        assert.ok(t[fg] && t[bg], `${mode}: --${fg} / --${bg} must be hex`);
        const r = ratio(t[fg], t[bg]);
        assert.ok(r >= 4.5, `${mode}: --${fg} ${t[fg]} on --${bg} ${t[bg]} is ${r.toFixed(2)}:1`);
      }
    }
    // Iris is a fill/border colour; as a non-text UI colour it needs 3:1, and white text on it 4.5:1.
    assert.ok(ratio(t['brand-iris'], t.bg) >= 3, `${mode}: iris on --bg below 3:1`);
    assert.ok(ratio(t['on-accent'], t['brand-iris']) >= 4.5, `${mode}: --on-accent on iris below 4.5:1`);
  }
});

test('the prefers-color-scheme dark block matches the explicit dark theme', () => {
  const css = read(PUBLIC, 'style.css');
  assert.deepEqual(tokens(css, '  :root:not([data-theme="light"])'), tokens(css, ':root[data-theme="dark"]'));
});
