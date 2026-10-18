'use strict';

// Tests for scripts/validate-findings.js. Run: node --test scripts/test/

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { validateReport, loadSchema, loadRoles } = require('../validate-findings.js');

const SCRIPT = path.join(__dirname, '..', 'validate-findings.js');
const FIXTURES = path.join(__dirname, 'fixtures', 'findings');
const INVALID = path.join(FIXTURES, 'invalid');

const schema = loadSchema();
const roles = loadRoles();
const read = file => JSON.parse(fs.readFileSync(file, 'utf-8'));
const validate = report => validateReport(report, { schema, roles });
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf-8' });

// Each invalid fixture breaks exactly one rule. [JSON pointer, message fragment]
const EXPECTED = {
  'bad-date': ['/generated_at', 'ISO 8601 date-time'],
  'bad-id-pattern': ['/findings/2/id', 'must match'],
  'bad-severity': ['/findings/1/severity', 'must be one of "critical", "major", "minor"'],
  'confirmed-not-reproduced': ['/findings/0/verdict', 'requires verification.reproduced = true'],
  'duplicate-ids': ['/findings/3/id', 'duplicate id "F-001"'],
  'missing-coverage-dimension': ['/coverage', 'missing required field "tokens"'],
  'missing-evidence': ['/findings/0', 'missing required field "evidence"'],
  'not-run-with-verdicts': ['/findings/0/verdict', 'not allowed while verification.mode is "not-run"'],
  'rejected-but-reproduced': ['/findings/4/verdict', 'requires verification.reproduced = false'],
  'skipped-without-reason': ['/coverage/responsive', 'missing required field "reason"'],
  'uncovered-dimension': ['/findings/5/dimension', 'not marked "checked" in coverage'],
  'unknown-field': ['/findings/1/score', 'unknown field "score"'],
  'unknown-role': ['/findings/2/owner_role', 'not a role in adapters/roles.json'],
  'wrong-schema-version': ['/schema_version', 'must equal "1.0"'],
  'wrong-type-line': ['/findings/0/evidence/line', 'must be integer, got string'],
};

test('valid fixtures pass', () => {
  for (const name of ['valid-full.json', 'valid-minimal.json']) {
    const result = validate(read(path.join(FIXTURES, name)));
    assert.deepEqual(result.errors, [], `${name} should be valid`);
    assert.equal(result.valid, true);
  }
});

test('summary counts verdicts, severities and coverage', () => {
  const { summary } = validate(read(path.join(FIXTURES, 'valid-full.json')));
  assert.equal(summary.findings, 6);
  assert.deepEqual(summary.verdicts, { confirmed: 4, needs_validation: 1, rejected: 1 });
  assert.deepEqual(summary.severity, { critical: 1, major: 3, minor: 2 });
  assert.equal(summary.coverage.checked.length, 8);
  assert.deepEqual(summary.coverage.skipped, ['responsive']);
});

test('every invalid fixture has an expectation, and vice versa', () => {
  const files = fs.readdirSync(INVALID)
    .filter(f => f.endsWith('.json') && f !== 'malformed.json')
    .map(f => f.replace(/\.json$/, ''))
    .sort();
  assert.deepEqual(files, Object.keys(EXPECTED).sort());
});

for (const [name, [where, fragment]] of Object.entries(EXPECTED)) {
  test(`invalid: ${name}`, () => {
    const result = validate(read(path.join(INVALID, `${name}.json`)));
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 1, JSON.stringify(result.errors));
    assert.equal(result.errors[0].path, where);
    assert.ok(result.errors[0].message.includes(fragment), result.errors[0].message);
  });
}

test('every role in adapters/roles.json is accepted as owner_role', () => {
  const report = read(path.join(FIXTURES, 'valid-full.json'));
  for (const role of roles) {
    report.findings[0].owner_role = role;
    assert.equal(validate(report).valid, true, role);
  }
});

test('a near-miss role name gets a suggestion', () => {
  const report = read(path.join(FIXTURES, 'valid-full.json'));
  report.findings[0].owner_role = 'ux researcher';
  const [err] = validate(report).errors;
  assert.ok(err.message.includes('did you mean "UX Researcher"'), err.message);
});

test('a skipped dimension without findings is fine; a checked one with findings is fine', () => {
  const report = read(path.join(FIXTURES, 'valid-full.json'));
  report.coverage.spacing = { status: 'skipped', reason: 'No CSS in scope' };
  assert.equal(validate(report).valid, true);
});

test('needs_validation is allowed when verification has not run', () => {
  const report = read(path.join(FIXTURES, 'valid-full.json'));
  report.verification = { mode: 'not-run' };
  for (const f of report.findings) {
    f.verdict = 'needs_validation';
    f.verification = { reproduced: false, note: 'Pending independent verification.' };
  }
  assert.equal(validate(report).valid, true);
});

test('a non-object report is rejected without throwing', () => {
  for (const value of [null, [], 'report', 42]) {
    const result = validate(value);
    assert.equal(result.valid, false);
    assert.match(result.errors[0].message, /must be object/);
  }
});

test('an unsupported schema keyword fails loudly instead of being ignored', () => {
  const bad = { ...schema, oneOf: [] };
  assert.throws(() => validateReport({}, { schema: bad, roles }), /not supported/);
});

// ─── CLI ──────────────────────────────────────────────────────────────────────

test('cli: exit 0 for a valid report', () => {
  const res = run(path.join(FIXTURES, 'valid-full.json'));
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /4 confirmed, 1 needs_validation, 1 rejected/);
});

test('cli: exit 1 and lists problems for an invalid report', () => {
  const res = run(path.join(INVALID, 'unknown-role.json'));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /\/findings\/2\/owner_role/);
});

test('cli: exit 1 for malformed JSON', () => {
  const res = run(path.join(INVALID, 'malformed.json'));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /not valid JSON/);
});

test('cli: --json prints a machine-readable result', () => {
  const ok = run(path.join(FIXTURES, 'valid-minimal.json'), '--json');
  assert.equal(ok.status, 0);
  const parsed = JSON.parse(ok.stdout);
  assert.equal(parsed.valid, true);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.summary.findings, 0);

  const bad = run('--json', path.join(INVALID, 'duplicate-ids.json'));
  assert.equal(bad.status, 1);
  const parsedBad = JSON.parse(bad.stdout);
  assert.equal(parsedBad.valid, false);
  assert.equal(parsedBad.errors[0].path, '/findings/3/id');
});

test('cli: exit 2 for usage errors', () => {
  assert.equal(run().status, 2, 'no file');
  assert.equal(run('a.json', 'b.json').status, 2, 'two files');
  assert.equal(run(path.join(FIXTURES, 'valid-full.json'), '--strict').status, 2, 'unknown flag');
  assert.equal(run(path.join(FIXTURES, 'does-not-exist.json')).status, 2, 'missing file');
});

test('cli: --help exits 0', () => {
  const res = run('--help');
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage:/);
});
