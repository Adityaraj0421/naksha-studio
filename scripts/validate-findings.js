#!/usr/bin/env node
'use strict';

/**
 * Naksha — design findings validator
 *
 * Checks a findings report (written by /design-review) against
 * schemas/design-findings.schema.json, then applies the cross-field rules
 * the schema cannot express:
 *   - owner_role must be a role name in adapters/roles.json
 *   - finding ids are unique
 *   - every finding's dimension is marked "checked" in the coverage ledger
 *   - confirmed findings were reproduced; rejected findings were not
 *   - when verification.mode is "not-run", every verdict is needs_validation
 *
 * Zero dependencies. The schema interpreter covers only the keywords the
 * schema uses and refuses any keyword it does not know, so a schema edit can
 * never be silently ignored.
 *
 * Usage:
 *   node scripts/validate-findings.js <file> [--json]
 *
 * Exit codes: 0 valid · 1 invalid · 2 usage or environment error
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'design-findings.schema.json');
const ROLES_PATH = path.join(ROOT, 'adapters', 'roles.json');

const USAGE = 'Usage: node scripts/validate-findings.js <file> [--json]';

// ─── Schema subset interpreter ────────────────────────────────────────────────

// Keywords that only describe; they never fail validation.
const ANNOTATIONS = new Set(['$schema', '$id', '$defs', 'title', 'description']);
const SUPPORTED = new Set([
  '$ref', 'type', 'enum', 'const', 'required', 'properties',
  'additionalProperties', 'items', 'minLength', 'minimum', 'pattern',
  'format', 'if', 'then',
]);

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function pointer(parts) {
  if (parts.length === 0) return '/';
  return '/' + parts.map(p => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  if (type === 'number') return actual === 'number' || actual === 'integer';
  return actual === type;
}

function show(value) {
  return JSON.stringify(value);
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`unsupported $ref "${ref}" (only local #/ refs)`);
  let node = root;
  for (const raw of ref.slice(2).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (node === null || typeof node !== 'object' || !(key in node)) {
      throw new Error(`$ref "${ref}" does not resolve`);
    }
    node = node[key];
  }
  return node;
}

function validateNode(value, schema, root, at, errors) {
  for (const key of Object.keys(schema)) {
    if (!ANNOTATIONS.has(key) && !SUPPORTED.has(key)) {
      throw new Error(`schema keyword "${key}" at ${pointer(at)} is not supported by validate-findings.js`);
    }
  }

  if (schema.$ref) {
    validateNode(value, resolveRef(root, schema.$ref), root, at, errors);
  }

  const fail = message => errors.push({ path: pointer(at), message });

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(t => matchesType(value, t))) {
      fail(`must be ${types.join(' or ')}, got ${typeOf(value)}`);
      return; // further checks would only repeat the type error
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    fail(`must equal ${show(schema.const)}, got ${show(value)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    fail(`must be one of ${schema.enum.map(show).join(', ')}, got ${show(value)}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      fail(schema.minLength === 1 ? 'must not be empty' : `must be at least ${schema.minLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
      fail(`must match ${schema.pattern}, got ${show(value)}`);
    }
    if (schema.format === 'date-time' && (!DATE_TIME.test(value) || Number.isNaN(Date.parse(value)))) {
      fail(`must be an ISO 8601 date-time with timezone (e.g. 2026-10-18T09:30:00Z), got ${show(value)}`);
    }
  }

  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
    fail(`must be >= ${schema.minimum}, got ${value}`);
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push({ path: pointer(at), message: `missing required field "${key}"` });
      }
    }
    const props = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        validateNode(child, props[key], root, at.concat(key), errors);
      } else if (schema.additionalProperties === false) {
        errors.push({ path: pointer(at.concat(key)), message: `unknown field "${key}"` });
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => validateNode(item, schema.items, root, at.concat(i), errors));
  }

  if (schema.if) {
    const probe = [];
    validateNode(value, schema.if, root, at, probe);
    if (probe.length === 0 && schema.then) validateNode(value, schema.then, root, at, errors);
  }
}

// ─── Cross-field rules ────────────────────────────────────────────────────────

function suggestRole(name, roles) {
  const want = name.trim().toLowerCase();
  const exact = roles.find(r => r.toLowerCase() === want);
  if (exact) return exact;
  return roles.find(r => r.toLowerCase().includes(want) || want.includes(r.toLowerCase())) || null;
}

function semanticChecks(report, roles, errors) {
  if (typeOf(report) !== 'object') return;
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const coverage = typeOf(report.coverage) === 'object' ? report.coverage : {};
  const mode = typeOf(report.verification) === 'object' ? report.verification.mode : undefined;
  const seen = new Map();

  findings.forEach((f, i) => {
    if (typeOf(f) !== 'object') return;
    const at = ['findings', i];

    if (typeof f.id === 'string') {
      if (seen.has(f.id)) {
        errors.push({ path: pointer(at.concat('id')), message: `duplicate id "${f.id}" (first used at /findings/${seen.get(f.id)})` });
      } else {
        seen.set(f.id, i);
      }
    }

    if (typeof f.owner_role === 'string' && f.owner_role.length > 0 && !roles.includes(f.owner_role)) {
      const hint = suggestRole(f.owner_role, roles);
      errors.push({
        path: pointer(at.concat('owner_role')),
        message: `"${f.owner_role}" is not a role in adapters/roles.json` + (hint ? ` (did you mean "${hint}"?)` : ''),
      });
    }

    if (typeof f.dimension === 'string') {
      const entry = coverage[f.dimension];
      if (typeOf(entry) === 'object' && entry.status !== 'checked') {
        errors.push({
          path: pointer(at.concat('dimension')),
          message: `dimension "${f.dimension}" is not marked "checked" in coverage, so it cannot have findings`,
        });
      }
    }

    const reproduced = typeOf(f.verification) === 'object' ? f.verification.reproduced : undefined;
    if (f.verdict === 'confirmed' && reproduced === false) {
      errors.push({ path: pointer(at.concat('verdict')), message: 'verdict "confirmed" requires verification.reproduced = true' });
    }
    if (f.verdict === 'rejected' && reproduced === true) {
      errors.push({ path: pointer(at.concat('verdict')), message: 'verdict "rejected" requires verification.reproduced = false' });
    }
    if (mode === 'not-run' && (f.verdict === 'confirmed' || f.verdict === 'rejected')) {
      errors.push({
        path: pointer(at.concat('verdict')),
        message: `verdict "${f.verdict}" is not allowed while verification.mode is "not-run"; use needs_validation`,
      });
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

function loadSchema(file = SCHEMA_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function loadRoles(file = ROLES_PATH) {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const list = Array.isArray(data) ? data : data.roles;
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${file} has no roles`);
  return list.map(r => (typeof r === 'string' ? r : r.name)).filter(Boolean);
}

function summarize(report) {
  const findings = typeOf(report) === 'object' && Array.isArray(report.findings) ? report.findings : [];
  const count = (key, val) => findings.filter(f => f && f[key] === val).length;
  const coverage = typeOf(report) === 'object' && typeOf(report.coverage) === 'object' ? report.coverage : {};
  const dims = Object.keys(coverage);
  return {
    findings: findings.length,
    verdicts: {
      confirmed: count('verdict', 'confirmed'),
      needs_validation: count('verdict', 'needs_validation'),
      rejected: count('verdict', 'rejected'),
    },
    severity: {
      critical: count('severity', 'critical'),
      major: count('severity', 'major'),
      minor: count('severity', 'minor'),
    },
    coverage: {
      checked: dims.filter(d => coverage[d] && coverage[d].status === 'checked'),
      skipped: dims.filter(d => coverage[d] && coverage[d].status === 'skipped'),
    },
  };
}

/**
 * Validate a parsed report. Returns { valid, errors[], summary }.
 * `options.schema` and `options.roles` override the files on disk.
 */
function validateReport(report, options = {}) {
  const schema = options.schema || loadSchema();
  const roles = options.roles || loadRoles();
  const errors = [];
  validateNode(report, schema, schema, [], errors);
  semanticChecks(report, roles, errors);
  return { valid: errors.length === 0, errors, summary: summarize(report) };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function main(argv) {
  const args = argv.slice(2);
  let asJson = false;
  const files = [];
  for (const arg of args) {
    if (arg === '--json') asJson = true;
    else if (arg === '-h' || arg === '--help') { console.log(USAGE); return 0; }
    else if (arg.startsWith('-')) { console.error(`Unknown option: ${arg}\n${USAGE}`); return 2; }
    else files.push(arg);
  }
  if (files.length !== 1) {
    console.error(USAGE);
    return 2;
  }

  const file = files[0];
  let text;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch (e) {
    console.error(`Cannot read ${file}: ${e.code || e.message}`);
    return 2;
  }

  let schema, roles;
  try {
    schema = loadSchema();
    roles = loadRoles();
  } catch (e) {
    console.error(`Cannot load schema or roles: ${e.message}`);
    return 2;
  }

  let result;
  try {
    result = validateReport(JSON.parse(text), { schema, roles });
  } catch (e) {
    if (e instanceof SyntaxError) {
      result = { valid: false, errors: [{ path: '/', message: `not valid JSON: ${e.message}` }], summary: null };
    } else {
      console.error(`Validator error: ${e.message}`);
      return 2;
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ file, ...result }, null, 2));
  } else if (result.valid) {
    const s = result.summary;
    console.log(
      `✅ ${file} is a valid findings report — ${s.findings} finding(s): ` +
      `${s.verdicts.confirmed} confirmed, ${s.verdicts.needs_validation} needs_validation, ${s.verdicts.rejected} rejected; ` +
      `coverage ${s.coverage.checked.length} checked, ${s.coverage.skipped.length} skipped`
    );
  } else {
    console.log(`❌ ${file} has ${result.errors.length} problem(s):`);
    for (const err of result.errors) console.log(`  ${err.path}: ${err.message}`);
  }
  return result.valid ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv);
}

module.exports = { validateReport, loadSchema, loadRoles, summarize, main };
