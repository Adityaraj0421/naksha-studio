'use strict';
// GET /api/findings — the latest /design-review result, read from
// <project>/naksha-review/findings.json. Degrades to { available: false }.
//
// Expected shape (owned by /design-review):
//   { target, generated_at, coverage,
//     findings: [{ id, dimension, severity, title, evidence, recommendation, owner_role, verdict }] }
// Every field is treated as untrusted: strings are clipped, unknown fields dropped.
//
// Like the /design-review report, only confirmed and needs-validation findings are
// listed; findings the verifier rejected are only counted (`rejected`).

const fs = require('fs');
const path = require('path');

const SEVERITY_ORDER = ['critical', 'blocker', 'high', 'major', 'medium', 'moderate', 'low', 'minor', 'info'];
const MAX_FINDINGS = 300;

function str(v, max = 600) {
  if (typeof v === 'string') return v.slice(0, max);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join('\n').slice(0, max);
  return '';
}

function sevRank(s) {
  const i = SEVERITY_ORDER.indexOf(s);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

// Confirmed issues first, then the ones still waiting on validation.
const VERDICT_ORDER = ['confirmed', 'needs_validation'];

function verdictRank(v) {
  const i = VERDICT_ORDER.indexOf(v);
  return i === -1 ? VERDICT_ORDER.length : i;
}

function normalize(raw) {
  const list = Array.isArray(raw && raw.findings) ? raw.findings : [];
  const all = list
    .filter((f) => f && typeof f === 'object')
    .slice(0, MAX_FINDINGS)
    .map((f, i) => ({
      id: str(f.id, 40) || `F${i + 1}`,
      dimension: str(f.dimension, 60),
      severity: str(f.severity, 20).toLowerCase() || 'info',
      title: str(f.title, 200) || 'Untitled finding',
      evidence: str(f.evidence, 800),
      recommendation: str(f.recommendation, 800),
      owner_role: str(f.owner_role, 60),
      verdict: str(f.verdict, 30).toLowerCase(),
    }))
    .sort((a, b) => verdictRank(a.verdict) - verdictRank(b.verdict) || sevRank(a.severity) - sevRank(b.severity));
  const findings = all.filter((f) => f.verdict !== 'rejected');

  const bySeverity = {};
  const byVerdict = {};
  for (const f of all) if (f.verdict) byVerdict[f.verdict] = (byVerdict[f.verdict] || 0) + 1;
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  let coverage = null;
  if (raw && raw.coverage !== undefined) {
    if (typeof raw.coverage === 'object' && raw.coverage !== null) {
      coverage = Object.fromEntries(
        Object.entries(raw.coverage)
          .slice(0, 20)
          .map(([k, v]) => [str(k, 40), typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : str(v, 120)]),
      );
    } else {
      coverage = str(raw.coverage, 200);
    }
  }
  return {
    available: true,
    target: str(raw && raw.target, 300),
    generated_at: str(raw && raw.generated_at, 40),
    coverage,
    total: findings.length,
    raised: all.length,
    confirmed: byVerdict.confirmed || 0,
    needsValidation: byVerdict.needs_validation || 0,
    rejected: byVerdict.rejected || 0,
    bySeverity,
    byVerdict,
    severityOrder: SEVERITY_ORDER,
    findings,
  };
}

function register({ route, projectDir }) {
  const file = path.join(projectDir, 'naksha-review', 'findings.json');
  route('GET', '/findings', async (req, res, { json }) => {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return json(200, { available: false, reason: 'missing', path: 'naksha-review/findings.json' });
    }
    try {
      return json(200, normalize(JSON.parse(text)));
    } catch {
      return json(200, { available: false, reason: 'invalid-json', path: 'naksha-review/findings.json' });
    }
  });
}

module.exports = { register, normalize };
