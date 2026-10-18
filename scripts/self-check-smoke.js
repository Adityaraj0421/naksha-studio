#!/usr/bin/env node
'use strict';
// self-check-smoke.js — runs the browser-self-check probe against two fixture pages
// (one clean, one with seeded defects) at 375 / 768 / 1440 px and asserts that the
// probe reports what it should. Opt-in: needs the `playwright` npm package and a
// Chromium build. SKIPs (exit 0) when Playwright can't be found, so it never breaks
// zero-dependency CI. Pages are served by scripts/serve-static.js, as in the procedure.
// Usage: node scripts/self-check-smoke.js
//        NODE_PATH="$(npm root -g)" node scripts/self-check-smoke.js   # global install

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createServer } = require('./serve-static');

const ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(ROOT, 'evals/fixtures/browser-self-check');
const PROBE = fs.readFileSync(path.join(ROOT, 'skills/design/procedures/browser-self-check.probe.js'), 'utf-8');
const WIDTHS = [[375, 812], [768, 1024], [1440, 900]];

function loadPlaywright() {
  try { return require('playwright'); } catch { /* try the global install next */ }
  try {
    const globalRoot = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return require(path.join(globalRoot, 'playwright'));
  } catch { return null; }
}

function serve(dir) {
  return new Promise((resolve) => {
    const server = createServer(dir, { ttl: 0 });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let failures = 0;
function expect(label, ok, detail) {
  if (ok) { console.log(`  ✅ ${label}`); return; }
  failures++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  naksha — browser self-check probe smoke');
  console.log('═══════════════════════════════════════');

  const pw = loadPlaywright();
  if (!pw) { console.log('⏭  SKIP: playwright not installed (npm i -g playwright to enable)'); return 0; }

  let browser;
  try { browser = await pw.chromium.launch(); } catch (e) {
    console.log(`⏭  SKIP: Chromium could not launch (${e.message.split('\n')[0]})`);
    return 0;
  }
  const server = await serve(FIXTURES);
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage();
  const run = async (file, [w, h]) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${base}/${file}`);
    return page.evaluate(`(${PROBE})()`);
  };

  try {
    for (const size of WIDTHS) {
      const r = await run('good.html', size);
      console.log(`▸ good.html @ ${size[0]}px`);
      expect('no horizontal overflow', r.overflow.px === 0 && r.overflow.offenders.length === 0, JSON.stringify(r.overflow));
      expect('no undersized tap targets', r.tap.fail.length === 0, JSON.stringify(r.tap.fail));
      expect('no focus-order defects', !r.focus.positiveTabindex.length && !r.focus.hiddenFocusable.length && !r.focus.reordered.length, JSON.stringify(r.focus));
      expect('every focusable shows an indicator', r.focus.noIndicator.length === 0, JSON.stringify(r.focus.noIndicator));
      expect('no contrast failures', r.contrast.failCount === 0 && r.contrast.checked > 0, JSON.stringify(r.contrast));
      expect('one main, one h1, no heading skips', r.semantics.main === 1 && r.semantics.h1 === 1 && !r.semantics.headingSkips.length, JSON.stringify(r.semantics));
    }

    const m = await run('bad.html', WIDTHS[0]);
    console.log('▸ bad.html @ 375px (seeded defects must all be caught)');
    expect('overflow caught, .hero named', m.overflow.px > 0 && m.overflow.offenders.some((o) => o.el.startsWith('div.hero')), JSON.stringify(m.overflow));
    expect('crowded 16px icon buttons fail the 24px floor', m.tap.fail.filter((t) => t.el.startsWith('button.icon-btn')).length === 2, JSON.stringify(m.tap));
    expect('positive tabindex caught', m.focus.positiveTabindex.length === 1, JSON.stringify(m.focus.positiveTabindex));
    expect('aria-hidden focusable caught', m.focus.hiddenFocusable.some((f) => f.why === 'aria-hidden ancestor'), JSON.stringify(m.focus.hiddenFocusable));
    expect('off-canvas focusable caught', m.focus.hiddenFocusable.some((f) => f.why === 'off-screen'), JSON.stringify(m.focus.hiddenFocusable));
    expect('row-reverse reordering caught', m.focus.reordered.some((f) => f.el.startsWith('button.icon-btn')), JSON.stringify(m.focus.reordered));
    expect('missing focus indicator caught', m.focus.noIndicator.some((f) => f.el.startsWith('button.icon-btn')), JSON.stringify(m.focus.noIndicator));
    expect('low contrast caught', m.contrast.fail.some((c) => c.el === 'p.faint' && c.ratio < 4.5), JSON.stringify(m.contrast));
    expect('heading skip and missing main caught', m.semantics.headingSkips.includes('1→3') && m.semantics.main === 0, JSON.stringify(m.semantics));

    expect('page-level overflow is not reported as clipping', m.overflow.clipped.length === 0, JSON.stringify(m.overflow.clipped));

    // traps.html: patterns the probe used to misread (TEST-RESULTS R5–R7).
    const t = await run('traps.html', WIDTHS[0]); // probed at once, mid-way through a 2 s colour fade
    console.log('▸ traps.html @ 375px (no false positives, no missed clipping)');
    expect('contrast read at the end of the theme transition', t.contrast.failCount === 0 && t.contrast.checked > 0, JSON.stringify(t.contrast));
    expect('transitions were disabled while probing', t.motion.transitionsDisabled === true, JSON.stringify(t.motion));
    expect('probe removes its temporary style', await page.evaluate(() => document.querySelectorAll('style').length) === 1);
    expect('stat clipped inside overflow: hidden is caught', t.overflow.clipped.some((c) => c.text === '16,000+' && c.axis === 'x' && !c.ellipsis), JSON.stringify(t.overflow));
    expect('deliberate ellipsis is marked as such', t.overflow.clipped.some((c) => c.ellipsis === true), JSON.stringify(t.overflow.clipped));
    await page.click('a[href="#one"]'); // pointer input: Chrome stops matching :focus-visible for script focus
    const tp = await page.evaluate(`(${PROBE})()`);
    expect(':focus-visible-only rings are not flagged after pointer input', tp.focus.noIndicator.length === 0 && tp.focus.indicatorFromCss === 2, JSON.stringify(tp.focus));
    await page.goto(`${base}/bad.html`);
    await page.click('a[tabindex="3"]');
    const bp = await page.evaluate(`(${PROBE})()`);
    expect('after pointer input, outline: none on :focus is still caught', bp.focus.noIndicator.length === 2 && bp.focus.noIndicator.every((f) => f.el.startsWith('button.icon-btn')), JSON.stringify(bp.focus));

    const d = await run('bad.html', WIDTHS[2]);
    console.log('▸ bad.html @ 1440px (width-specific result)');
    expect('900px hero no longer overflows', !d.overflow.offenders.some((o) => o.el.startsWith('div.hero')), JSON.stringify(d.overflow));
    expect('result stays compact (< 4 KB)', JSON.stringify(m).length < 4096, `${JSON.stringify(m).length} bytes`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log('───────────────────────────────────────');
  console.log(failures ? `self-check-smoke: FAIL (${failures})` : 'self-check-smoke: PASS');
  return failures ? 1 : 0;
}

main().then((code) => process.exit(code), (e) => { console.error(e); process.exit(1); });
