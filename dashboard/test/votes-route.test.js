'use strict';

// Tests for dashboard/routes/votes.js and dashboard/public/panels/votes.js through
// a tiny in-test harness — no dependency on the dashboard server itself.
// Run with: node --test scripts/test/ dashboard/test/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const { register } = require('../routes/votes.js');

/** Minimal stand-in for the dashboard server's route contract. */
function harness(projectDir) {
  const routes = new Map();
  const events = [];
  const route = (method, p, handler) => {
    assert.equal(typeof handler, 'function');
    routes.set(`${method} /api${p}`, handler);
  };
  register({ route, projectDir, naksha: { emit: (type, payload) => events.push({ type, payload }) } });

  async function call(method, url, body) {
    const [p, qs = ''] = url.split('?');
    const handler = routes.get(`${method} ${p}`);
    if (!handler) return { status: 404, body: null };
    let out = null;
    const json = (status, obj) => {
      out = { status, body: JSON.parse(JSON.stringify(obj)) };
      return out;
    };
    const query = Object.fromEntries(new URLSearchParams(qs));
    await handler({ method, url }, {}, { body, query, json });
    return out;
  }
  return { routes, events, call };
}

function tmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha-votes-route-'));
  fs.mkdirSync(path.join(dir, '.naksha'));
  fs.writeFileSync(path.join(dir, '.naksha', 'project.json'), JSON.stringify({ name: 'T', taste: { signals: [] } }));
  return dir;
}

test('register() needs a route function and registers four endpoints under /api/', () => {
  assert.throws(() => register({}), /route/);
  const h = harness(tmpProject());
  assert.deepEqual([...h.routes.keys()].sort(), [
    'GET /api/votes',
    'GET /api/votes/observations',
    'GET /api/votes/subjects',
    'POST /api/votes',
  ]);
});

test('POST /api/votes records a valid vote, forces source=dashboard and emits a vote event', async () => {
  const dir = tmpProject();
  const h = harness(dir);
  const res = await h.call('POST', '/api/votes', {
    id: 'client-id', ts: '2000-01-01T00:00:00Z', source: 'cli',
    verdict: 'helpful', reason: 'clear hierarchy', subject: { kind: 'variant', ref: 'B@r1', traits: ['editorial'] },
  });
  assert.equal(res.status, 201);
  assert.match(res.body.vote.id, /^v_\d{8}T\d{6}Z_h_[0-9a-f]{6}$/);
  assert.notEqual(res.body.vote.ts, '2000-01-01T00:00:00Z');
  assert.equal(res.body.vote.source, 'dashboard');
  assert.match(res.body.notice, /Nothing is sent anywhere/);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].type, 'vote');
  assert.equal(h.events[0].payload.vote.id, res.body.vote.id);
  const lines = fs.readFileSync(path.join(dir, '.naksha', 'votes.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
});

test('POST /api/votes validates input and never writes invalid votes', async () => {
  const dir = tmpProject();
  const h = harness(dir);
  const bad = await h.call('POST', '/api/votes', { verdict: 'love', subject: { kind: 'design' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.length >= 2);
  assert.equal((await h.call('POST', '/api/votes', '{nope')).status, 400);
  assert.equal((await h.call('POST', '/api/votes', undefined)).status, 400);
  assert.equal((await h.call('POST', '/api/votes', [1, 2])).status, 400);
  const fromString = await h.call('POST', '/api/votes', JSON.stringify({ verdict: 'needs-work', subject: { kind: 'finding', ref: 'F1' } }));
  assert.equal(fromString.status, 201);
  const fromBuffer = await h.call('POST', '/api/votes', Buffer.from(JSON.stringify({ verdict: 'helpful', subject: { kind: 'design', ref: 'd' } })));
  assert.equal(fromBuffer.status, 201);
  assert.equal(h.events.length, 2);
  const lines = fs.readFileSync(path.join(dir, '.naksha', 'votes.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
});

test('GET /api/votes lists newest first with stats, filters by kind and clamps limit', async () => {
  const h = harness(tmpProject());
  const empty = await h.call('GET', '/api/votes');
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.votes, []);
  assert.equal(empty.body.stats.total_votes, 0);

  for (const [verdict, kind, ref] of [['helpful', 'variant', 'A'], ['needs_work', 'finding', 'F1'], ['helpful', 'design', 'd1']]) {
    await h.call('POST', '/api/votes', { verdict, subject: { kind, ref } });
  }
  const all = await h.call('GET', '/api/votes');
  assert.equal(all.body.total, 3);
  assert.equal(all.body.votes.length, 3);
  assert.equal(all.body.stats.helpful, 2);
  const times = all.body.votes.map((v) => v.ts);
  assert.deepEqual(times, [...times].sort().reverse());

  const findings = await h.call('GET', '/api/votes?kind=finding');
  assert.deepEqual(findings.body.votes.map((v) => v.subject.ref), ['F1']);
  assert.equal((await h.call('GET', '/api/votes?limit=1')).body.votes.length, 1);
  assert.equal((await h.call('GET', '/api/votes?limit=-5')).body.votes.length, 1, 'limit clamps to ≥ 1');
  assert.equal((await h.call('GET', '/api/votes?kind=poem')).status, 400);
});

test('GET /api/votes/subjects returns designs, variants and findings with the latest vote', async () => {
  const dir = tmpProject();
  fs.mkdirSync(path.join(dir, 'naksha-variants'));
  fs.writeFileSync(path.join(dir, 'naksha-variants', 'variants.json'), JSON.stringify({
    run_id: 'r1', task: 'pricing page', created_at: '2026-10-18T10:00:00Z',
    variants: [
      { letter: 'A', name: 'Quiet Editorial', file: 'variant-a.html', rationale: 'calm', traits: ['editorial'] },
      { letter: 'B', name: 'Dense Terminal', file: 'variant-b.html', traits: ['dense layout'], wildcard: true },
    ],
  }));
  fs.mkdirSync(path.join(dir, 'naksha-review'));
  fs.writeFileSync(path.join(dir, 'naksha-review', 'findings.json'), JSON.stringify([{ id: 'F9', title: 'Tap targets too small', severity: 'medium', dimension: 'usability', owner_role: 'UX Designer' }]));
  const h = harness(dir);
  await h.call('POST', '/api/votes', { verdict: 'helpful', subject: { kind: 'variant', ref: 'B@r1' } });

  const res = await h.call('GET', '/api/votes/subjects');
  assert.equal(res.status, 200);
  const refs = res.body.subjects.map((s) => `${s.kind}:${s.ref}`);
  assert.deepEqual(refs, ['variant:A@r1', 'variant:B@r1', 'finding:F9']);
  assert.equal(res.body.subjects[1].label, 'Variant B — Dense Terminal (Wildcard)');
  assert.equal(res.body.subjects[1].vote.verdict, 'helpful');
  assert.equal(res.body.subjects[0].vote, null);
  assert.equal(res.body.subjects[2].role, 'UX Designer');
});

test('GET /api/votes/observations previews consolidation without writing project.json', async () => {
  const dir = tmpProject();
  const pj = path.join(dir, '.naksha', 'project.json');
  const before = fs.readFileSync(pj, 'utf8');
  const h = harness(dir);
  await h.call('POST', '/api/votes', { verdict: 'helpful', subject: { kind: 'variant', ref: 'A', traits: ['serif display'] } });
  await h.call('POST', '/api/votes', { verdict: 'needs_work', subject: { kind: 'design', ref: 'd', traits: ['serif display', 'gradients'] } });
  const res = await h.call('GET', '/api/votes/observations');
  assert.equal(res.status, 200);
  assert.equal(res.body.preview, true);
  const serif = res.body.observations.find((o) => o.trait === 'serif display');
  assert.equal(serif.helpful, 1);
  assert.equal(serif.needs_work, 1);
  assert.equal(serif.confidence, 0);
  assert.equal(serif.evidence.length, 2);
  assert.equal(serif.summary, 'mixed on serif display (1 helpful, 1 needs work)');
  assert.equal(fs.readFileSync(pj, 'utf8'), before);
});

test('handler errors become a JSON 500 instead of crashing the server', async () => {
  const dir = tmpProject();
  // A directory where votes.jsonl should be makes appendFileSync throw.
  fs.mkdirSync(path.join(dir, '.naksha', 'votes.jsonl'));
  const h = harness(dir);
  const res = await h.call('POST', '/api/votes', { verdict: 'helpful', subject: { kind: 'design', ref: 'd' } });
  assert.equal(res.status, 500);
  assert.match(res.body.error, /votes/);
});

test('panel registers itself through window.naksha.registerPanel', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'panels', 'votes.js'), 'utf8');
  const registered = [];
  const window = { naksha: { registerPanel: (p) => registered.push(p) } };
  vm.runInNewContext(src, { window });
  assert.equal(registered.length, 1);
  const p = registered[0];
  assert.equal(p.id, 'votes');
  assert.equal(p.title, 'Votes');
  assert.equal(typeof p.order, 'number');
  assert.equal(typeof p.render, 'function');
  assert.match(src, /nothing is sent anywhere/i);
  assert.ok(!/innerHTML/.test(src), 'panel builds DOM with textContent only');

  const queued = {};
  vm.runInNewContext(src, { window: queued });
  assert.equal(queued.nakshaPanelQueue.length, 1, 'queues itself if the shell is not ready');
});
