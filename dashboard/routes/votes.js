'use strict';

// dashboard/routes/votes.js — Helpful / Needs-work votes for the naksha dashboard.
//
// Plug-in route module. The dashboard server calls register() once with:
//   route(method, path, handler)  registers a handler under /api/ (so '/votes' → /api/votes)
//   projectDir                    the project root that holds .naksha/
//   naksha                        server helpers; if it has emit(type, payload), a 'vote'
//                                 event is emitted after each recorded vote
// Handlers are async (req, res, { body, query, json }) => json(status, obj).
//
// Endpoints:
//   GET  /api/votes                 recent votes (newest first) + stats   ?limit=1..500 &kind=<kind>
//   POST /api/votes                 record a vote  { verdict, reason?, subject: { kind, ref, command?, role?, eval?, traits? } }
//   GET  /api/votes/subjects        recent designs, variants and findings to vote on, with the latest vote on each
//   GET  /api/votes/observations    preview of taste.observations (computed, never written here)
//
// Everything stays in <projectDir>/.naksha/votes.jsonl. Nothing is sent anywhere.

const votes = require('../../scripts/votes.js');

const LOCAL_NOTICE = 'Votes stay on this machine in .naksha/votes.jsonl. Nothing is sent anywhere.';

function queryValue(query, key) {
  if (!query) return undefined;
  if (typeof query.get === 'function') {
    const v = query.get(key);
    return v === null ? undefined : v;
  }
  const v = query[key];
  return Array.isArray(v) ? v[0] : v;
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseBody(body) {
  if (body === undefined || body === null || body === '') return { error: 'request body must be a JSON vote object' };
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    try {
      return { value: JSON.parse(body) };
    } catch {
      return { error: 'request body is not valid JSON' };
    }
  }
  return { value: body };
}

function register({ route, projectDir, naksha } = {}) {
  if (typeof route !== 'function') throw new TypeError('votes: register() needs a route(method, path, handler) function');
  const dir = projectDir || process.cwd();

  const emit = (type, payload) => {
    try {
      if (naksha && typeof naksha.emit === 'function') naksha.emit(type, payload);
    } catch { /* events are best-effort */ }
  };

  const safe = (handler) => async (req, res, ctx) => {
    try {
      return await handler(req, res, ctx);
    } catch (err) {
      return ctx.json(500, { error: 'votes: internal error', detail: String(err && err.message ? err.message : err) });
    }
  };

  route('GET', '/votes', safe(async (req, res, { query, json }) => {
    const kind = queryValue(query, 'kind');
    if (kind && !votes.KINDS.includes(kind)) {
      return json(400, { error: `kind must be one of ${votes.KINDS.join(', ')}` });
    }
    const limit = clampInt(queryValue(query, 'limit'), 1, 500, 50);
    const { votes: all, skipped } = votes.readVotes(dir);
    const recent = all.filter((v) => !kind || v.subject.kind === kind).slice(-limit).reverse();
    return json(200, { votes: recent, total: all.length, skipped, stats: votes.computeStats(all), notice: LOCAL_NOTICE });
  }));

  route('POST', '/votes', safe(async (req, res, { body, json }) => {
    const parsed = parseBody(body);
    if (parsed.error) return json(400, { error: parsed.error, errors: [parsed.error] });
    if (parsed.value === null || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
      return json(400, { error: 'invalid vote', errors: ['vote must be a JSON object'] });
    }
    // id, ts and source are assigned server-side; client values are ignored.
    const input = { verdict: parsed.value.verdict, reason: parsed.value.reason, subject: parsed.value.subject, source: 'dashboard' };
    const result = votes.appendVote(dir, input);
    if (!result.ok) return json(400, { error: 'invalid vote', errors: result.errors });
    emit('vote', { vote: result.vote });
    return json(201, { vote: result.vote, rotated: result.rotated, notice: LOCAL_NOTICE });
  }));

  route('GET', '/votes/subjects', safe(async (req, res, { json }) => {
    return json(200, { subjects: votes.recentSubjects(dir), notice: LOCAL_NOTICE });
  }));

  route('GET', '/votes/observations', safe(async (req, res, { json }) => {
    const r = votes.consolidateProject(dir);
    return json(200, {
      observations: r.observations.map((o) => ({ ...o, summary: votes.describeObservation(o) })),
      evidence_items: r.items,
      skipped_no_traits: r.skippedNoTraits,
      preview: true,
      note: 'Preview only. Run /naksha-taste consolidate (or /naksha-vote consolidate) to save these to .naksha/project.json.',
    });
  }));
}

module.exports = { register, LOCAL_NOTICE };
