'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');

const { REPO, tmpProject, request } = require('./helpers');
const { createApp } = require('../lib/app');

const quiet = () => {};

async function withApp(opts, fn) {
  const proj = tmpProject({ enabled: true });
  const app = createApp({ projectDir: proj.dir, pluginRoot: REPO, log: quiet, pollMs: 50, ...opts(proj) });
  const { port } = await app.listen(0);
  try {
    await fn({ app, port, proj, token: app.token });
  } finally {
    await app.close();
    proj.cleanup();
  }
}
const none = () => ({});

test('binds to 127.0.0.1 only', async () => {
  await withApp(none, async ({ app }) => {
    assert.equal(app.server.address().address, '127.0.0.1');
  });
});

test('rejects missing or wrong token, accepts the right one', async () => {
  await withApp(none, async ({ port, token }) => {
    assert.equal((await request(port, '/api/state')).status, 401);
    assert.equal((await request(port, '/api/state', { headers: { 'X-Naksha-Token': 'nope' } })).status, 401);
    // Change the last character to one it is guaranteed not to be (a fixed 'x'
    // collides with the random base64url token 1 time in 64).
    const wrong = token.slice(0, -1) + (token.endsWith('x') ? 'y' : 'x');
    assert.equal((await request(port, '/api/state?token=' + wrong)).status, 401);
    assert.equal((await request(port, '/api/state', { headers: { 'X-Naksha-Token': token } })).status, 200);
    assert.equal((await request(port, '/api/state?token=' + token)).status, 200);
    // The page itself needs the token; static assets carry no data and do not.
    assert.equal((await request(port, '/')).status, 401);
    assert.equal((await request(port, '/?token=' + token)).status, 200);
    assert.equal((await request(port, '/app.js')).status, 200);
  });
});

test('blocks DNS rebinding (foreign Host) and cross-origin requests; sends no CORS headers', async () => {
  await withApp(none, async ({ port, token }) => {
    const h = { 'X-Naksha-Token': token };
    assert.equal((await request(port, '/api/state', { headers: { ...h, Host: `evil.example:${port}` } })).status, 403);
    assert.equal((await request(port, '/api/state', { headers: { ...h, Origin: 'http://evil.example' } })).status, 403);
    const ok = await request(port, '/api/state', { headers: { ...h, Origin: `http://127.0.0.1:${port}` } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['access-control-allow-origin'], undefined);
    assert.match(ok.headers['content-security-policy'], /default-src 'none'/);
    assert.equal(ok.headers['referrer-policy'], 'no-referrer');
  });
});

test('static files cannot escape public/', async () => {
  await withApp(none, async ({ port }) => {
    for (const p of ['/../server.js', '/%2e%2e/server.js', '/panels/../../lib/app.js', '/.hidden']) {
      const res = await request(port, p);
      assert.notEqual(res.status, 200, p);
      assert.doesNotMatch(res.text, /createApp/, p);
    }
  });
});

test('GET /api/panels lists public/panels/*.js', async () => {
  await withApp(none, async ({ port, token }) => {
    const res = await request(port, '/api/panels', { headers: { 'X-Naksha-Token': token } });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.panels));
    for (const p of ['panels/project.js', 'panels/findings.js', 'panels/cost.js']) assert.ok(res.json.panels.includes(p), p);
  });
});

test('loads a route module through the plugin contract', async () => {
  const routesDir = path.join(__dirname, 'fixtures', 'routes');
  await withApp(() => ({ routesDir }), async ({ app, port, token, proj }) => {
    assert.deepEqual(app.loadedRoutes, ['echo.js']); // broken.js has no register() and is skipped
    const h = { 'X-Naksha-Token': token };

    const get = await request(port, '/api/echo?x=1&token=' + token);
    assert.equal(get.status, 200);
    assert.deepEqual(get.json.query, { x: '1' }); // token is stripped from query
    assert.equal(get.json.projectDir, proj.dir);
    assert.equal(get.json.hasNaksha, true);

    const post = await request(port, '/api/echo', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: { hello: 'world' },
    });
    assert.equal(post.status, 201);
    assert.deepEqual(post.json.body, { hello: 'world' });

    const param = await request(port, '/api/echo/item/42', { headers: h });
    assert.equal(param.json.id, '42');

    // Non-JSON bodies are refused (forces a CORS preflight that is never answered).
    const form = await request(port, '/api/echo', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'text/plain' },
      body: 'a=1',
    });
    assert.equal(form.status, 415);

    // Plugins cannot shadow core routes.
    const state = await request(port, '/api/state', { headers: h });
    assert.equal(state.json.hijacked, undefined);
    assert.equal((await request(port, '/api/echo', { method: 'DELETE', headers: h })).status, 405);
    assert.equal((await request(port, '/api/missing', { headers: h })).status, 404);
  });
});

test('SSE stream delivers an event appended to events.jsonl', async () => {
  await withApp(none, async ({ port, token, proj }) => {
    const got = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no SSE event within 4s')), 4000);
      const req = http.get(
        { host: '127.0.0.1', port, path: '/api/stream?token=' + token, headers: { Host: `127.0.0.1:${port}` } },
        (res) => {
          assert.equal(res.statusCode, 200);
          assert.match(res.headers['content-type'], /text\/event-stream/);
          let buf = '';
          let appended = false;
          res.on('data', (chunk) => {
            buf += chunk;
            if (!appended && buf.includes('event: state')) {
              appended = true;
              const line = JSON.stringify({ ts: new Date().toISOString(), sid: 's1', type: 'command', cmd: 'design' });
              fs.appendFileSync(path.join(proj.dir, '.naksha', 'events.jsonl'), line + '\n');
            }
            const m = /event: command\ndata: (.*)\n/.exec(buf);
            if (m) {
              clearTimeout(timer);
              req.destroy();
              resolve(JSON.parse(m[1]));
            }
          });
        },
      );
      req.on('error', (e) => {
        if (e.code !== 'ECONNRESET') reject(e);
      });
    });
    assert.equal(got.cmd, 'design');
  });
});

test('GET /api/project summarizes v6 taste.observations (traits learned from votes)', async () => {
  await withApp(none, async ({ port, token, proj }) => {
    const obs = (trait, helpful, needsWork, confidence) => ({
      trait, helpful, needs_work: needsWork, confidence, first_seen: '2026-10-18T07:42:46Z', updated_at: '2026-10-18T07:50:41Z', evidence: ['v_1'],
    });
    fs.writeFileSync(
      path.join(proj.dir, '.naksha', 'project.json'),
      JSON.stringify({
        name: 'Landing',
        taste: {
          observations: [
            obs('dark-first', 0, 1, 0.33), obs('full-bleed', 1, 0, 0.33), obs('serif display', 3, 0, 0.8),
            obs('dense', 1, 1, 0.2), { not: 'a trait' },
          ],
        },
      }),
    );
    const res = await request(port, '/api/project', { headers: { 'X-Naksha-Token': token } });
    const t = res.json.taste;
    assert.equal(t.count, 0, 'no v5 signals');
    assert.equal(t.traits.count, 4);
    assert.deepEqual(t.traits.leans.map((l) => l.trait), ['serif display', 'full-bleed'], 'highest confidence first');
    assert.deepEqual(t.traits.avoids, [{ trait: 'dark-first', weight: 0.33, helpful: 0, needs_work: 1 }]);
    assert.deepEqual(t.traits.mixed, ['dense']);
    assert.equal(t.traits.updated_at, '2026-10-18T07:50:41Z');
    assert.equal(t.observations, undefined, 'trait objects are not echoed as raw observations');
  });
});

test('refuses to serve the plugin directory as a project', () => {
  assert.throws(() => createApp({ projectDir: REPO, pluginRoot: REPO, log: quiet }), /plugin directory/);
});

test('GET /api/project summarizes brand, constraints and decayed taste', async () => {
  await withApp(none, async ({ port, token, proj }) => {
    const day = 86400000;
    fs.writeFileSync(
      path.join(proj.dir, '.naksha', 'project.json'),
      JSON.stringify({
        name: 'Lumina',
        brand: { primary: '#6366F1', font: 'Inter', voice: 'calm' },
        constraints: { grid: '8px' },
        taste: {
          signals: [
            { verdict: 'approved', traits: ['editorial'], recorded_at: new Date(Date.now() - day).toISOString() },
            { verdict: 'approved', traits: ['dense'], recorded_at: new Date(Date.now() - 120 * day).toISOString() },
            { verdict: 'rejected', traits: ['playful'], recorded_at: new Date(Date.now() - 400 * day).toISOString() },
          ],
          observations: ['likes serif'],
        },
      }),
    );
    const res = await request(port, '/api/project', { headers: { 'X-Naksha-Token': token } });
    assert.equal(res.json.name, 'Lumina');
    assert.equal(res.json.constraints.grid, '8px');
    assert.deepEqual(res.json.taste.leans, [
      { trait: 'editorial', weight: 1 },
      { trait: 'dense', weight: 0.5 },
    ]);
    assert.deepEqual(res.json.taste.avoids, []); // 400 days old → weight 0
    assert.deepEqual(res.json.taste.observations, ['likes serif']);
  });
});

test('findings and cost degrade gracefully when absent', async () => {
  await withApp(none, async ({ port, token }) => {
    const h = { headers: { 'X-Naksha-Token': token } };
    assert.equal((await request(port, '/api/findings', h)).json.available, false);
    const cost = await request(port, '/api/cost', h);
    assert.equal(cost.status, 200);
    if (!fs.existsSync(path.join(REPO, 'scripts', 'naksha-stats.js'))) assert.equal(cost.json.available, false);
  });
});

test('cost panel runs scripts/naksha-stats.js --json and normalizes spend vs budgets', async () => {
  const fakePlugin = tmpProject();
  fs.mkdirSync(path.join(fakePlugin.dir, 'scripts'));
  fs.writeFileSync(
    path.join(fakePlugin.dir, 'scripts', 'naksha-stats.js'),
    `if (!process.argv.includes('--json')) process.exit(2);
     console.log(JSON.stringify({ currency: 'USD', spend: { session_usd: 0.5, today: 4.5, month: 30 },
       budgets: [{ scope: 'daily', limit: 5 }, { scope: 'monthly', limit_usd: 25, spent_usd: 30 }],
       by_command: [{ command: '/design', cost: 3 }] }));`,
  );
  try {
    await withApp(() => ({ pluginRoot: fakePlugin.dir }), async ({ port, token }) => {
      const res = await request(port, '/api/cost', { headers: { 'X-Naksha-Token': token } });
      assert.equal(res.json.available, true);
      assert.deepEqual(res.json.spend.map((s) => s.key), ['session', 'today', 'month']);
      const [daily, monthly] = res.json.budgets;
      assert.equal(daily.spent, 4.5); // inferred from spend.today
      assert.equal(daily.status, 'warn');
      assert.equal(monthly.status, 'over');
      assert.equal(res.json.top[0].label, '/design');
    });
  } finally {
    fakePlugin.cleanup();
  }
});

test('cost: a slow naksha-stats run answers "pending", then serves the result once it finishes', async () => {
  const fakePlugin = tmpProject();
  fs.mkdirSync(path.join(fakePlugin.dir, 'scripts'));
  fs.writeFileSync(
    path.join(fakePlugin.dir, 'scripts', 'naksha-stats.js'),
    `setTimeout(() => console.log(JSON.stringify({ schema: 'naksha-stats/1', totals: { cost_usd: 2 }, commands: [], budgets: {} })), 600);`,
  );
  try {
    await withApp(() => ({ pluginRoot: fakePlugin.dir, routeOptions: { costWaitMs: 100 } }), async ({ port, token }) => {
      const h = { headers: { 'X-Naksha-Token': token } };
      const first = await request(port, '/api/cost', h);
      assert.equal(first.json.pending, true, 'not killed, not an error');
      await new Promise((r) => setTimeout(r, 1500));
      const second = await request(port, '/api/cost', h);
      assert.equal(second.json.pending, undefined);
      assert.deepEqual(second.json.spend, [{ key: 'total', label: 'all time', value: 2 }]);
      // A later slow refresh serves the last good result, marked stale.
      const third = await request(port, '/api/cost?refresh=1', h);
      assert.equal(third.json.stale, true);
      assert.equal(third.json.spend[0].value, 2);
    });
  } finally {
    fakePlugin.cleanup();
  }
});

test('cost: maps the real naksha-stats/1 report exactly', () => {
  const { normalize } = require('../routes/cost');
  const out = normalize({
    schema: 'naksha-stats/1',
    generated_at: '2026-10-18T06:00:00.000Z',
    totals: { cost_usd: 12.5 },
    placeholder_usd: 0,
    commands: [{ command: '/design', cost_usd: 3.2, runs: 4 }, { command: '/design-review', cost_usd: 7, runs: 2 }, { command: '(no command)', cost_usd: 0 }],
    budgets: {
      configured: true, month: '2026-10', warn_at: 0.5, month_spend_usd: 6, problems: [], messages: [],
      monthly: { limit_usd: 10, spend_usd: 6, ratio: 0.6, status: 'warn' },
      per_command: [{ command: '/design-reel', limit_usd: 2, runs: 1, max_run_usd: 2.5, status: 'over' }],
    },
  });
  assert.deepEqual(out.spend, [{ key: 'total', label: 'all time', value: 12.5 }, { key: 'month', label: '2026-10', value: 6 }]);
  assert.equal(out.budgets.length, 2, 'warn_at / month_spend_usd must not become budgets');
  assert.equal(out.budgets[0].status, 'warn', "uses the script's status (custom warn_at)");
  assert.equal(out.budgets[1].status, 'over');
  assert.deepEqual(out.top.map((r) => r.label), ['/design-review', '/design']);
  assert.match(normalize({ schema: 'naksha-stats/1', error: 'bad --since' }).error, /bad --since/);
});

test('findings are normalized, clipped and sorted by severity', () => {
  const { normalize } = require('../routes/findings');
  const out = normalize({
    target: 'x.html',
    findings: [
      { id: 'L', severity: 'Low', title: 't1' },
      { id: 'C', severity: 'critical', title: 't2', evidence: 'e'.repeat(5000), extra: 'dropped' },
      null,
    ],
  });
  assert.deepEqual(out.findings.map((f) => f.id), ['C', 'L']);
  assert.equal(out.findings[0].evidence.length, 800);
  assert.equal(out.findings[0].extra, undefined);
  assert.deepEqual(out.bySeverity, { critical: 1, low: 1 });
});

test('findings: rejected findings are counted, not listed; confirmed come before needs-validation', () => {
  const { normalize } = require('../routes/findings');
  const out = normalize({
    findings: [
      { id: 'F-001', severity: 'major', title: 'scroll region not focusable', verdict: 'rejected' },
      { id: 'F-002', severity: 'major', title: 'low contrast', verdict: 'needs_validation' },
      { id: 'F-003', severity: 'minor', title: 'tight spacing', verdict: 'confirmed' },
      { id: 'F-004', severity: 'critical', title: 'no focus ring', verdict: 'confirmed' },
      { id: 'F-005', severity: 'minor', title: 'odd type size', verdict: 'confirmed' },
    ],
  });
  assert.deepEqual(out.findings.map((f) => f.id), ['F-004', 'F-003', 'F-005', 'F-002']);
  assert.equal(out.total, 4);
  assert.equal(out.raised, 5);
  assert.equal(out.confirmed, 3);
  assert.equal(out.needsValidation, 1);
  assert.equal(out.rejected, 1);
  assert.deepEqual(out.bySeverity, { critical: 1, minor: 2, major: 1 }, 'severity counts leave out the rejected finding');
});
