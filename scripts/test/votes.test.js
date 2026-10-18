'use strict';

// Tests for scripts/votes.js — run with: node --test scripts/test/ dashboard/test/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const V = require('../votes.js');

const NOW = '2026-10-18T12:00:00Z';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.parse(NOW) - n * DAY).toISOString().replace(/\.\d{3}Z$/, 'Z');

function tmpProject(withProjectJson = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha-votes-'));
  fs.mkdirSync(path.join(dir, '.naksha'));
  if (withProjectJson) {
    fs.writeFileSync(path.join(dir, '.naksha', 'project.json'), JSON.stringify({ name: 'Test', brand: { primary: '#000000' }, taste: { signals: [] } }, null, 2));
  }
  return dir;
}

function vote(verdict, subject, now, extra = {}) {
  const r = V.validateVote({ verdict, subject, ...extra }, { now });
  assert.ok(r.ok, r.errors && r.errors.join('; '));
  return r.vote;
}

// ─── Validation ───────────────────────────────────────────────────────────────

test('validateVote normalizes verdict aliases and assigns id/ts server-side', () => {
  const r = V.validateVote({ verdict: 'needs-work', id: 'evil', ts: '1999-01-01T00:00:00Z', subject: { kind: 'variant', ref: ' B ', traits: 'Serif Display, serif display, Airy Layout' } }, { now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.vote.verdict, 'needs_work');
  assert.equal(r.vote.ts, NOW);
  assert.match(r.vote.id, /^v_20261018T120000Z_n_[0-9a-f]{6}$/);
  assert.equal(r.vote.subject.ref, 'B');
  assert.deepEqual(r.vote.subject.traits, ['serif display', 'airy layout']);
  assert.equal(r.vote.source, 'cli');
  assert.equal('reason' in r.vote, false);
});

test('validateVote rejects bad input with every error listed', () => {
  assert.equal(V.validateVote(null).ok, false);
  assert.equal(V.validateVote([]).ok, false);
  const r = V.validateVote({ verdict: 'meh', subject: { kind: 'poem', ref: '' } });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 3);
  const r2 = V.validateVote({ verdict: 'helpful', subject: { kind: 'design', ref: 'x'.repeat(201), command: 'design', eval: 'bad name!' }, reason: 5, source: 'web' });
  assert.equal(r2.ok, false);
  assert.ok(r2.errors.some((e) => e.includes('ref')));
  assert.ok(r2.errors.some((e) => e.includes('command')));
  assert.ok(r2.errors.some((e) => e.includes('eval')));
  assert.ok(r2.errors.some((e) => e.includes('reason')));
  assert.ok(r2.errors.some((e) => e.includes('source')));
});

test('validateVote cleans reasons: control chars collapsed, truncated to 280', () => {
  const r = V.validateVote({ verdict: 'helpful', reason: 'line one\nline\ttwo   ' + 'z'.repeat(400), subject: { kind: 'finding', ref: 'F1', command: '/design-review', role: 'Accessibility Specialist', eval: 'design-review-a11y' } });
  assert.equal(r.ok, true);
  assert.ok(r.vote.reason.startsWith('line one line two z'));
  assert.equal(r.vote.reason.length, 280);
  assert.deepEqual(r.vote.subject, { kind: 'finding', ref: 'F1', command: '/design-review', role: 'Accessibility Specialist', eval: 'design-review-a11y' });
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('appendVote writes one JSON line per vote; readVotes skips malformed lines', () => {
  const dir = tmpProject();
  const a = V.appendVote(dir, { verdict: 'helpful', subject: { kind: 'design', ref: 'design-output.html' } }, { now: daysAgo(1) });
  const b = V.appendVote(dir, { verdict: 'needs_work', subject: { kind: 'finding', ref: 'F2' } }, { now: NOW });
  assert.ok(a.ok && b.ok);
  const file = path.join(dir, '.naksha', 'votes.jsonl');
  fs.appendFileSync(file, '{not json\n{"id":"x","verdict":"helpful"}\n\n');
  const { votes, skipped } = V.readVotes(dir);
  assert.deepEqual(votes.map((v) => v.id), [a.vote.id, b.vote.id]);
  assert.equal(skipped, 2);
  assert.equal(V.appendVote(dir, { verdict: 'nope' }).ok, false);
  assert.equal(V.readVotes(dir).votes.length, 2, 'invalid votes are never written');
});

test('appendVote creates .naksha/ when missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha-votes-'));
  assert.ok(V.appendVote(dir, { verdict: 'helpful', subject: { kind: 'design', ref: 'd' } }).ok);
  assert.ok(fs.existsSync(path.join(dir, '.naksha', 'votes.jsonl')));
});

test('rotation moves a full votes.jsonl to votes.1.jsonl and replaces the previous archive', () => {
  const dir = tmpProject();
  const ids = [];
  for (let i = 0; i < 7; i++) {
    const r = V.appendVote(dir, { verdict: 'helpful', subject: { kind: 'design', ref: `d${i}` } }, { now: daysAgo(10 - i), maxActive: 3 });
    ids.push(r.vote.id);
    if (i === 3 || i === 6) assert.equal(r.rotated, true, `rotates before vote ${i}`);
    else assert.equal(r.rotated, false);
  }
  // after vote 6: archive = votes 3,4,5 ; active = vote 6 ; votes 0-2 dropped
  const { votes } = V.readVotes(dir);
  assert.deepEqual(votes.map((v) => v.id), ids.slice(3));
  assert.ok(fs.existsSync(path.join(dir, '.naksha', 'votes.1.jsonl')));
});

test('effectiveVotes keeps the latest vote per subject and reports superseded ids', () => {
  const v1 = vote('helpful', { kind: 'variant', ref: 'B' }, daysAgo(3));
  const v2 = vote('needs_work', { kind: 'variant', ref: 'b' }, daysAgo(1));
  const v3 = vote('helpful', { kind: 'variant', ref: 'C' }, daysAgo(2));
  const { effective, superseded } = V.effectiveVotes([v1, v3, v2]);
  assert.deepEqual(effective.map((v) => v.id).sort(), [v2.id, v3.id].sort());
  assert.deepEqual([...superseded], [v1.id]);
  const stats = V.computeStats([v1, v3, v2]);
  assert.equal(stats.total_votes, 3);
  assert.equal(stats.effective_votes, 2);
  assert.equal(stats.helpful, 1);
  assert.equal(stats.needs_work, 1);
  assert.equal(stats.helpful_rate, 0.5);
  assert.deepEqual(stats.by_kind.variant, { helpful: 1, needs_work: 1 });
});

// ─── Decay & ids ──────────────────────────────────────────────────────────────

test('ageWeight uses the taste decay: ≤90d = 1, 91–180d = 0.5, older = 0', () => {
  assert.equal(V.ageWeight(daysAgo(0), NOW), 1);
  assert.equal(V.ageWeight(daysAgo(90), NOW), 1);
  assert.equal(V.ageWeight(daysAgo(91), NOW), 0.5);
  assert.equal(V.ageWeight(daysAgo(180), NOW), 0.5);
  assert.equal(V.ageWeight(daysAgo(181), NOW), 0);
  assert.equal(V.ageWeight('not a date', NOW), 0);
});

test('ids are self-describing and signal ids are deterministic', () => {
  const s = { verdict: 'rejected', direction: 'Glassy cards', traits: ['Glassmorphism'], recorded_at: daysAgo(5) };
  const id = V.signalId(s);
  assert.equal(id, V.signalId({ ...s }));
  assert.match(id, /^s_\d{8}T\d{6}Z_r_[0-9a-f]{8}$/);
  const p = V.parseId(id);
  assert.equal(p.kind, 'signal');
  assert.equal(p.polarity, 'needs_work');
  assert.equal(p.ms, Date.parse(daysAgo(5)));
  assert.equal(V.signalId({ verdict: 'maybe', recorded_at: NOW }), null);
  assert.equal(V.parseId('hand-made'), null);
});

// ─── Consolidation ────────────────────────────────────────────────────────────

test('consolidation counts helpful/needs_work per trait with decay and lists evidence ids', () => {
  const votes = [
    vote('helpful', { kind: 'variant', ref: 'A@r1', traits: ['serif display', 'airy layout'] }, daysAgo(2)),
    vote('helpful', { kind: 'design', ref: 'design-output.html@1', traits: ['serif display'] }, daysAgo(10)),
    vote('needs_work', { kind: 'variant', ref: 'B@r1', traits: ['serif display', 'dense layout'] }, daysAgo(120)), // 0.5
    vote('helpful', { kind: 'finding', ref: 'F1', traits: ['serif display'] }, daysAgo(1)), // findings never feed taste
    vote('helpful', { kind: 'variant', ref: 'C@r1' }, daysAgo(1)), // no traits, no manifest → skipped
  ];
  const signals = [
    { verdict: 'approved', direction: 'Editorial serif', traits: ['serif display', 'editorial'], recorded_at: daysAgo(30), source_command: '/naksha-taste' },
    { verdict: 'approved', direction: 'Old dense', traits: ['dense layout'], recorded_at: daysAgo(200), source_command: '/naksha-taste' }, // weight 0
  ];
  const { items, superseded, skippedNoTraits } = V.collectEvidence({ votes, signals });
  assert.equal(skippedNoTraits, 1);
  assert.equal(items.length, 5);
  const obs = V.consolidate({ items, superseded, now: NOW });
  const by = Object.fromEntries(obs.map((o) => [o.trait, o]));

  assert.equal(by['serif display'].helpful, 3);
  assert.equal(by['serif display'].needs_work, 0.5);
  assert.equal(by['serif display'].confidence, Math.round((2.5 / 5.5) * 100) / 100);
  assert.equal(by['serif display'].evidence.length, 4);
  assert.deepEqual(by['serif display'].evidence[0], votes[0].id, 'evidence is newest first');
  assert.ok(by['serif display'].evidence.includes(V.signalId(signals[0])));
  assert.equal(by['serif display'].first_seen, daysAgo(120));
  assert.equal(by['serif display'].updated_at, NOW);

  assert.equal(by['dense layout'].helpful, 0, '200-day-old approval has weight 0');
  assert.equal(by['dense layout'].needs_work, 0.5);
  assert.equal(by['dense layout'].evidence.length, 2, 'stale evidence is kept for history');
  assert.equal(by['airy layout'].confidence, 0.33);
  assert.equal(obs[0].trait, 'serif display', 'sorted by active weight');
  assert.equal(V.describeObservation(by['serif display']), 'prefers serif display (3 helpful, 0.5 needs work)');
  assert.equal(V.describeObservation(by['dense layout']), 'avoids dense layout (0 helpful, 0.5 needs work)');
});

test('consolidation refines existing observations instead of overwriting them', () => {
  // Evidence from a signal that has since been evicted from taste.signals.
  const evicted = V.signalId({ verdict: 'approved', direction: 'gone', traits: ['serif display'], recorded_at: daysAgo(40) });
  const existing = [{ trait: 'serif display', helpful: 1, needs_work: 0, confidence: 0.33, first_seen: daysAgo(40), updated_at: daysAgo(40), evidence: [evicted] }];
  const fresh = vote('helpful', { kind: 'variant', ref: 'A', traits: ['serif display'] }, daysAgo(1));

  const { items, superseded } = V.collectEvidence({ votes: [fresh] });
  const obs = V.consolidate({ observations: existing, items, superseded, now: NOW });
  assert.equal(obs.length, 1);
  assert.equal(obs[0].helpful, 2, 'old evidence survives + new vote');
  assert.deepEqual(obs[0].evidence, [fresh.id, evicted]);
  assert.equal(obs[0].first_seen, daysAgo(40));
  assert.equal(obs[0].updated_at, NOW);

  // Re-running with nothing new keeps updated_at and does not double count.
  const again = V.consolidate({ observations: obs, items, superseded, now: '2026-10-19T12:00:00Z' });
  assert.equal(again[0].helpful, 2);
  assert.equal(again[0].updated_at, NOW);

  // Time passes: the same evidence decays without being rewritten.
  const later = V.consolidate({ observations: again, items: [], now: new Date(Date.parse(NOW) + 100 * DAY).toISOString() });
  assert.equal(later[0].helpful, 1, 'both items now 101–140 days old → 0.5 each');
  assert.deepEqual(later[0].evidence, again[0].evidence);
});

test('changing your mind replaces the earlier vote in the evidence', () => {
  const first = vote('helpful', { kind: 'variant', ref: 'B', traits: ['playful'] }, daysAgo(2));
  let { items, superseded } = V.collectEvidence({ votes: [first] });
  let obs = V.consolidate({ items, superseded, now: NOW });
  assert.equal(obs[0].helpful, 1);

  const second = vote('needs_work', { kind: 'variant', ref: 'B', traits: ['playful'] }, daysAgo(1));
  ({ items, superseded } = V.collectEvidence({ votes: [first, second] }));
  obs = V.consolidate({ observations: obs, items, superseded, now: NOW });
  assert.equal(obs[0].helpful, 0);
  assert.equal(obs[0].needs_work, 1);
  assert.deepEqual(obs[0].evidence, [second.id]);
});

test('signals linked to a vote via vote_id are not counted twice', () => {
  const v = vote('helpful', { kind: 'variant', ref: 'A', traits: ['editorial'] }, daysAgo(1));
  const s = { verdict: 'approved', direction: 'Editorial', traits: ['editorial'], recorded_at: daysAgo(1), source_command: '/design-variants', vote_id: v.id };
  const { items } = V.collectEvidence({ votes: [v], signals: [s] });
  assert.equal(items.length, 1);
});

test('variant votes without traits resolve them from naksha-variants/variants.json', () => {
  const dir = tmpProject();
  fs.mkdirSync(path.join(dir, 'naksha-variants'));
  fs.writeFileSync(path.join(dir, 'naksha-variants', 'variants.json'), JSON.stringify({
    run_id: 'r1', task: 'pricing', created_at: daysAgo(1),
    variants: [{ letter: 'a', name: 'Quiet Editorial', file: '../../etc/passwd', traits: ['Editorial', 'serif display'] }, { letter: 'zz' }],
  }));
  const manifest = V.readVariantsManifest(dir);
  assert.equal(manifest.variants.length, 1);
  assert.equal(manifest.variants[0].file, 'variant-a.html', 'unsafe file names fall back to the default');
  assert.deepEqual(V.resolveVariantTraits('A@r1', manifest), ['editorial', 'serif display']);
  assert.deepEqual(V.resolveVariantTraits('variant-a.html', manifest), ['editorial', 'serif display']);
  assert.deepEqual(V.resolveVariantTraits('A@other-run', manifest), [], 'a different run is a different design');
  assert.deepEqual(V.parseVariantRef('variant B'), { letter: 'B', run: '' });

  V.appendVote(dir, { verdict: 'helpful', subject: { kind: 'variant', ref: 'A@r1' } }, { now: daysAgo(1) });
  const res = V.consolidateProject(dir, { now: NOW });
  assert.deepEqual(res.observations.map((o) => o.trait).sort(), ['editorial', 'serif display']);
});

test('consolidateProject + writeObservations update project.json atomically and keep other fields', () => {
  const dir = tmpProject();
  const pj = path.join(dir, '.naksha', 'project.json');
  const signal = { verdict: 'rejected', direction: 'Glassy', traits: ['glassmorphism'], recorded_at: daysAgo(3), source_command: '/naksha-taste' };
  fs.writeFileSync(pj, JSON.stringify({ name: 'Keep me', constraints: { grid: '8px' }, taste: { signals: [signal] } }));
  const res = V.consolidateProject(dir, { now: NOW });
  V.writeObservations(dir, res.observations, NOW);
  const after = JSON.parse(fs.readFileSync(pj, 'utf8'));
  assert.equal(after.name, 'Keep me');
  assert.deepEqual(after.constraints, { grid: '8px' });
  assert.deepEqual(after.taste.signals, [signal]);
  assert.equal(after.taste.observations[0].trait, 'glassmorphism');
  assert.equal(after.taste.observations[0].needs_work, 1);
  assert.equal(after.updatedAt, NOW);
  assert.deepEqual(fs.readdirSync(path.join(dir, '.naksha')).filter((f) => f.endsWith('.tmp')), []);

  const noProject = tmpProject(false);
  assert.throws(() => V.writeObservations(noProject, [], NOW), /naksha-init/);
});

test('memoryBlocks emits valid naksha-memory-update JSON for taste.observations', () => {
  const blocks = V.memoryBlocks([{ trait: 't', helpful: 1, needs_work: 0, confidence: 0.33, first_seen: NOW, updated_at: NOW, evidence: [] }], NOW);
  const payloads = [...blocks.matchAll(/<!-- naksha-memory-update\n([\s\S]*?)\n-->/g)].map((m) => JSON.parse(m[1]));
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].type, 'project_json_patch');
  assert.equal(payloads[0].path, 'taste.observations');
  assert.equal(payloads[1].path, 'updatedAt');
});

// ─── Calibration ──────────────────────────────────────────────────────────────

test('calibrate reports disagreement and evals where users said Needs work but the judge passed', () => {
  const votes = [
    vote('needs_work', { kind: 'command_run', ref: 'run-1', eval: 'variants-distinct' }, daysAgo(3), { reason: 'B and C look the same' }),
    vote('needs_work', { kind: 'design', ref: 'd1', eval: 'variants-distinct' }, daysAgo(2)),
    vote('helpful', { kind: 'design', ref: 'd2', eval: 'taste-profile' }, daysAgo(2)),
    vote('helpful', { kind: 'design', ref: 'd3', eval: 'review-a11y' }, daysAgo(2)),
    vote('needs_work', { kind: 'design', ref: 'd4', eval: 'review-a11y' }, daysAgo(2)),
    vote('helpful', { kind: 'design', ref: 'd5', eval: 'not-in-results' }, daysAgo(2)),
    vote('helpful', { kind: 'design', ref: 'd6' }, daysAgo(2)), // untagged: ignored
  ];
  const { results, skipped, error } = V.normalizeResults({
    results: [
      { eval: 'variants-distinct', assertion: 'pairwise', judge_verdict: 'pass', run_id: 'run-1' },
      { eval: 'variants-distinct', assertion: 'files', judge_verdict: 'PASS' },
      { eval: 'taste-profile', judge_verdict: 'pass' },
      { eval: 'review-a11y', assertion: 'contrast', passed: true },
      { eval: 'review-a11y', assertion: 'focus', pass: false },
      { eval: 'junk' },
      'junk',
    ],
  });
  assert.equal(error, null);
  assert.equal(skipped, 2);
  const r = V.calibrate({ votes, results });
  assert.equal(r.eval_votes, 6);
  assert.equal(r.compared, 5);
  assert.equal(r.agree, 2); // taste-profile helpful/pass, review-a11y needs_work/fail
  assert.equal(r.disagree, 3);
  assert.equal(r.disagreement_rate, 0.6);
  assert.deepEqual(r.lenient, [{ eval: 'variants-distinct', votes: 2, reasons: ['B and C look the same'] }]);
  assert.deepEqual(r.strict, [{ eval: 'review-a11y', votes: 1, reasons: [] }]);
  assert.deepEqual(r.unmatched, ['not-in-results']);
});

test('one artifact can be rated against two evals, but counts once for taste', () => {
  const a = vote('needs_work', { kind: 'design', ref: 'd1', eval: 'e1', traits: ['playful'] }, daysAgo(2));
  const b = vote('helpful', { kind: 'design', ref: 'd1', eval: 'e2', traits: ['playful'] }, daysAgo(1));
  assert.equal(V.effectiveVotes([a, b]).effective.length, 1, 'taste/stats: latest per kind + ref');
  assert.equal(V.effectiveVotes([a, b], { byEval: true }).effective.length, 2, 'calibration: per eval');
  const results = V.normalizeResults([{ eval: 'e1', judge_verdict: 'fail' }, { eval: 'e2', judge_verdict: 'pass' }]).results;
  assert.equal(V.calibrate({ votes: [a, b], results }).agree, 2);
  const { items } = V.collectEvidence({ votes: [a, b] });
  assert.deepEqual(items.map((i) => i.id), [b.id]);
});

test('calibrate compares a vote with its own run when ref matches run_id', () => {
  const votes = [vote('needs_work', { kind: 'command_run', ref: 'run-2', eval: 'e' }, daysAgo(1))];
  const results = V.normalizeResults([
    { eval: 'e', judge_verdict: 'pass', run_id: 'run-1' },
    { eval: 'e', judge_verdict: 'fail', run_id: 'run-2' },
  ]).results;
  const r = V.calibrate({ votes, results });
  assert.equal(r.agree, 1);
  assert.equal(r.disagreement_rate, 0);
  assert.ok(V.normalizeResults({ nope: 1 }).error.includes('judge_verdict'));
});

// ─── Redaction & export ───────────────────────────────────────────────────────

test('redactText scrubs emails, URLs, paths, secrets and phone numbers but keeps design talk', () => {
  const input = 'Ask jane.doe+x@studio.co.uk, see https://example.com/a?b=1 and www.foo.dev; file /Users/jane/work/app.css, ~/notes.txt, C:\\Users\\jane\\x.png and src/components/Button.tsx; key sk-abcdef1234567890XYZ, token 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08; call +44 20 7946 0958.';
  const out = V.redactText(input);
  for (const leaked of ['jane.doe', 'example.com', 'www.foo', '/Users/jane', 'notes.txt', 'C:\\Users', 'Button.tsx', 'sk-abcdef', '9f86d0818', '7946']) {
    assert.ok(!out.includes(leaked), `leaked ${leaked}: ${out}`);
  }
  assert.ok(out.includes('[email]') && out.includes('[url]') && out.includes('[path]') && out.includes('[secret]') && out.includes('[phone]'));

  const keep = 'A/B test vs /design-review on 2026-10-18: contrast 4.5:1 and/or the serif display headline-hierarchy-is-much-too-crowded-here.';
  assert.equal(V.redactText(keep), keep);
});

test('export writes a local file; --redact scrubs reasons and refs and says what it cannot catch', () => {
  const dir = tmpProject();
  V.appendVote(dir, { verdict: 'needs_work', reason: 'mail me@me.com about /home/me/site/index.html', subject: { kind: 'design', ref: '/home/me/site/design-output.html', traits: ['dense layout'] } }, { now: NOW });
  const res = V.exportVotes(dir, { redact: true, now: NOW });
  assert.equal(res.file, path.join(dir, '.naksha', 'votes-export-20261018-redacted.json'));
  const doc = JSON.parse(fs.readFileSync(res.file, 'utf8'));
  assert.equal(doc.format, 'naksha-votes-export');
  assert.equal(doc.redacted, true);
  assert.match(doc.notice, /never sends/);
  assert.match(doc.redaction_limits, /names/);
  assert.equal(doc.votes[0].reason, 'mail [email] about [path]');
  assert.equal(doc.votes[0].subject.ref, '[path]');
  assert.deepEqual(doc.votes[0].subject.traits, ['dense layout']);

  const raw = V.exportVotes(dir, { out: path.join(dir, 'out', 'raw.json'), now: NOW });
  assert.equal(raw.redacted, false);
  assert.match(fs.readFileSync(raw.file, 'utf8'), /me@me\.com/);
});

// ─── Subjects ─────────────────────────────────────────────────────────────────

test('recentSubjects reads variants, design-output.html and findings defensively', () => {
  const dir = tmpProject();
  fs.mkdirSync(path.join(dir, 'naksha-variants'));
  fs.writeFileSync(path.join(dir, 'naksha-variants', 'variant-a.html'), '<html><head><title>Variant A — Quiet</title><meta content="editorial, serif display" name="naksha-traits"></head></html>');
  fs.writeFileSync(path.join(dir, 'naksha-variants', 'notes.html'), 'ignored');
  fs.writeFileSync(path.join(dir, 'design-output.html'), '<title>Pricing &amp; plans</title><meta name="description" content="Three tiers">');
  fs.mkdirSync(path.join(dir, 'naksha-review'));
  fs.writeFileSync(path.join(dir, 'naksha-review', 'findings.json'), JSON.stringify({ findings: [
    { id: 'F1', dimension: 'accessibility', severity: 'high', title: 'Low contrast CTA', owner_role: 'Accessibility Specialist', verdict: 'fail' },
    { id: '', title: 'no id' },
    42,
  ] }));
  V.appendVote(dir, { verdict: 'needs_work', subject: { kind: 'finding', ref: 'F1' } }, { now: NOW });

  const subjects = V.recentSubjects(dir);
  const variant = subjects.find((s) => s.kind === 'variant');
  assert.equal(variant.label, 'Variant A — Quiet');
  assert.deepEqual(variant.traits, ['editorial', 'serif display']);
  assert.match(variant.ref, /^A@\d{8}T\d{6}Z$/);
  const design = subjects.find((s) => s.kind === 'design');
  assert.equal(design.label, 'Pricing & plans');
  assert.equal(design.detail, 'Three tiers');
  const findings = subjects.filter((s) => s.kind === 'finding');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].role, 'Accessibility Specialist');
  assert.equal(findings[0].detail, 'high · accessibility · fail');
  assert.equal(findings[0].vote.verdict, 'needs_work');

  fs.writeFileSync(path.join(dir, 'naksha-review', 'findings.json'), '{broken');
  assert.equal(V.recentSubjects(dir).filter((s) => s.kind === 'finding').length, 0);
  assert.deepEqual(V.recentSubjects(tmpProject()), []);
});

// ─── CLI ──────────────────────────────────────────────────────────────────────

test('CLI: append, list --json, calibrate without results, invalid vote exits 1', () => {
  const dir = tmpProject();
  const cli = (...args) => spawnSync(process.execPath, [path.join(__dirname, '..', 'votes.js'), ...args, '--dir', dir], { encoding: 'utf8' });
  const ok = cli('append', 'needs-work', '--kind', 'command_run', '--ref', 'run-7', '--command', '/design-variants', '--eval', 'variants-distinct', '--reason', 'too similar', '--json');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).vote.subject.eval, 'variants-distinct');

  const list = JSON.parse(cli('list', '--json').stdout);
  assert.equal(list.votes.length, 1);

  const cal = cli('calibrate');
  assert.equal(cal.status, 0);
  assert.match(cal.stdout, /judge_verdict/);
  assert.match(cal.stdout, /1 vote\(s\) are tagged/);

  const resultsFile = path.join(dir, 'results.json');
  fs.writeFileSync(resultsFile, JSON.stringify([{ eval: 'variants-distinct', judge_verdict: 'pass' }]));
  const cal2 = JSON.parse(cli('calibrate', '--results', resultsFile, '--json').stdout);
  assert.equal(cal2.lenient[0].eval, 'variants-distinct');

  const bad = cli('append', 'helpful', '--kind', 'nope', '--ref', 'x');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /subject.kind/);

  const unknown = cli('frobnicate');
  assert.equal(unknown.status, 2);
});
