import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRole, clampCaption, normalizeBeats, MAX_CAPTION } from '../src/normalize.mjs';

test('resolveRole maps varied extractor labels to canonical roles', () => {
  assert.equal(resolveRole('Layout', '').role, 'UI Designer');
  assert.equal(resolveRole('UI visual', 'Visual').role, 'UI Designer');
  assert.equal(resolveRole('Product/UX strategy', '').role, 'Product Designer');
  assert.equal(resolveRole('Color', '').role, 'UI Designer');
  assert.equal(resolveRole('Design system', 'Tokens').role, 'Design System Lead');
  assert.equal(resolveRole('', 'Copy').role, 'Content Designer');
  assert.equal(resolveRole('Motion', '').role, 'Motion Designer');
  assert.equal(resolveRole('Accessibility', '').role, 'UX Researcher');
});

test('resolveRole falls back for unknown labels', () => {
  assert.equal(resolveRole('Quantum Whisperer', 'Vibes').role, 'Design');
});

test('clampCaption truncates over the cap on a word boundary', () => {
  const long = 'I rebuilt the entire information hierarchy of this settings page so the primary action is unmistakable and the eye lands on it';
  const out = clampCaption(long);
  assert.ok(out.length <= MAX_CAPTION, `len ${out.length} <= ${MAX_CAPTION}`);
  assert.ok(out.endsWith('…'));
  assert.ok(!/\s…$/.test(out), 'no space before ellipsis');
});

test('clampCaption leaves short captions untouched and collapses whitespace', () => {
  assert.equal(clampCaption('  Times out,  Inter in  '), 'Times out, Inter in');
});

test('normalizeBeats dedupes by canonical role (one beat per role)', () => {
  const res = normalizeBeats([
    { role: 'Product/UX strategy', fn: '', caption: 'first strategy line' },
    { role: 'Product/UX strategy', fn: '', caption: 'second strategy line' },
    { role: 'UI visual', fn: 'Visual', caption: 'visual line' },
    { role: 'Content', fn: 'Copy', caption: 'copy line' },
  ]);
  assert.equal(res.ok, true);
  assert.equal(res.scenes.length, 3);
  const roles = res.scenes.map((s) => s.role);
  assert.equal(new Set(roles).size, 3);
});

test('normalizeBeats enforces the min-beat gate', () => {
  const res = normalizeBeats([
    { role: 'UI', fn: 'Visual', caption: 'only one' },
    { role: 'UI Designer', fn: 'Visual', caption: 'same role again' },
  ]);
  assert.equal(res.ok, false);
  assert.match(res.error, /needs >= 3/);
});

test('normalizeBeats happy path: 5 varied roles -> 5 scenes with accents', () => {
  const res = normalizeBeats([
    { role: 'Creative Director', fn: 'Vision', caption: 'a' },
    { role: 'UX', fn: 'Flows', caption: 'b' },
    { role: 'UI', fn: 'Visual', caption: 'c' },
    { role: 'Design System Lead', fn: 'Tokens', caption: 'd' },
    { role: 'Content', fn: 'Copy', caption: 'e' },
  ]);
  assert.equal(res.ok, true);
  assert.equal(res.scenes.length, 5);
  for (const s of res.scenes) assert.match(s.accent, /^#[0-9A-Fa-f]{6}$/);
});

test('normalizeBeats skips empty captions and rejects non-arrays', () => {
  assert.equal(normalizeBeats('nope').ok, false);
  const res = normalizeBeats([
    { role: 'UI', caption: '' },
    { role: 'UX', caption: '   ' },
    { role: 'Content', caption: 'real' },
  ]);
  assert.equal(res.ok, false); // only 1 valid -> gated
});
