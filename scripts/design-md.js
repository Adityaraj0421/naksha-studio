#!/usr/bin/env node
'use strict';

// design-md.js — DESIGN.md toolkit for naksha (zero dependencies).
//
// Reads and writes the DESIGN.md format (YAML design tokens + markdown prose)
// and converts it to and from the W3C Design Tokens Community Group (DTCG)
// format, CSS custom properties and Tailwind themes.
//
// Implemented against:
//   DESIGN.md spec  version "alpha" — github.com/google-labs-code/design.md,
//                   docs/spec.md at commit 6e5da53 (CLI @google/design.md 0.4.0)
//   DTCG format     2025.10 — github.com/design-tokens/community-group,
//                   technical-reports/format at commit 882ebd6
//
// Usage:
//   node scripts/design-md.js parse <DESIGN.md|-> [--resolve]
//   node scripts/design-md.js lint <DESIGN.md|-> [--json] [--strict] [--level AA|AAA]
//   node scripts/design-md.js export --to dtcg|css|tailwind|tailwind-v3 <DESIGN.md|-> [--prefix p]
//   node scripts/design-md.js from-tokens <tokens.json|vars.css|-> [--from dtcg|css|json] [--name "X"]
//   node scripts/design-md.js resolve [--dir .naksha/design-system] [--page <name>] [--format json|md]
//
// parse, lint and export also accept --page <name> / --dir <dir> instead of a
// file: the source is then the project's MASTER.md merged with that page's
// override (precedence: page override > MASTER.md > brand defaults).
// Every command accepts --out <file> to write instead of printing.
//
// Exit codes: 0 success · 1 invalid document, lint errors or failed conversion
//             · 2 usage error or unreadable input
//
// The YAML reader is a deliberately small subset parser — see docs/design-md.md
// for exactly what it accepts.

const fs = require('fs');
const path = require('path');

const SPEC = {
  designMd: 'alpha',
  designMdSource: 'github.com/google-labs-code/design.md@6e5da53',
  dtcg: '2025.10',
  dtcgSource: 'github.com/design-tokens/community-group@882ebd6',
};
const DTCG_SCHEMA = 'https://www.designtokens.org/schemas/2025.10/format.json';
const EXT = 'naksha.design-md';
const DEFAULT_DIR = path.join('.naksha', 'design-system');

const TOKEN_GROUPS = ['colors', 'typography', 'rounded', 'spacing', 'components'];
const FLAT_GROUPS = ['colors', 'rounded', 'spacing'];
const KNOWN_TOP = ['version', 'name', 'description', 'omitted'].concat(TOKEN_GROUPS);
const TYPO_PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontFeature', 'fontVariation'];
const COMPONENT_PROPS = ['backgroundColor', 'textColor', 'typography', 'rounded', 'padding', 'size', 'height', 'width'];
const COMPONENT_COLOR_PROPS = ['backgroundColor', 'textColor'];
const COMPONENT_DIM_PROPS = ['rounded', 'padding', 'size', 'height', 'width'];

// Canonical section order. Aliases are compared after normalizeHeading().
const SECTIONS = [
  { name: 'Overview', aliases: ['overview', 'brand & style', 'brand and style'] },
  { name: 'Colors', aliases: ['colors'] },
  { name: 'Typography', aliases: ['typography'] },
  { name: 'Layout', aliases: ['layout', 'layout & spacing', 'layout and spacing'] },
  { name: 'Elevation & Depth', aliases: ['elevation & depth', 'elevation and depth', 'elevation'] },
  { name: 'Shapes', aliases: ['shapes'] },
  { name: 'Components', aliases: ['components'] },
  { name: "Do's and Don'ts", aliases: ["do's and don'ts", "dos and don'ts", 'dos and donts', "do's & don'ts"] },
];
const OMITTABLE = ['colors', 'typography', 'spacing', 'rounded', 'components'];

const REF_RE = /^\{([^{}\s:,]+)\}$/;
const DIM_RE = /^(-?(?:\d+\.?\d*|\.\d+))(px|em|rem)$/;
const NUM_RE = /^[-+]?(?:\d+|\d*\.\d+|\d+\.\d*)(?:[eE][-+]?\d+)?$/;
const HEX_COMMENT_RE = /^[0-9a-fA-F]{3,8}\b/;

class DesignMdError extends Error {
  constructor(message, line) {
    super(line ? `line ${line}: ${message}` : message);
    this.line = line;
  }
}
class UsageError extends Error {}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isRef = (v) => typeof v === 'string' && REF_RE.test(v.trim());
const refPath = (v) => REF_RE.exec(v.trim())[1];
const round = (n, dp = 4) => { const f = 10 ** dp; return Math.round(n * f) / f; };
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ═══════════════════════════════════════════════════════════════════════════
// YAML subset reader
// ═══════════════════════════════════════════════════════════════════════════
// Accepts: block mappings and block sequences (space indentation), plain,
// 'single'- and "double"-quoted scalars, | and > block scalars, flow
// sequences/mappings of scalars ([a, b] / {a: b}), comments, null/true/false,
// decimal numbers. Rejects: anchors, aliases, tags, multi-document streams,
// multi-line plain scalars, nested flow collections, complex keys, tabs.

function stripComment(rest) {
  let quote = null;
  let prev = '';
  for (let j = 0; j < rest.length; j++) {
    const ch = rest[j];
    if (quote === '"') {
      if (ch === '\\') { j++; continue; }
      if (ch === '"') quote = null;
      continue;
    }
    if (quote === "'") {
      if (ch === "'") { if (rest[j + 1] === "'") { j++; continue; } quote = null; }
      continue;
    }
    if ((ch === '"' || ch === "'") && ['', ':', '-', '[', '{', ','].includes(prev)) { quote = ch; prev = ch; continue; }
    if (ch === '#' && (j === 0 || /\s/.test(rest[j - 1]))) {
      return { text: rest.slice(0, j), comment: rest.slice(j + 1).trim() };
    }
    if (!/\s/.test(ch)) prev = ch;
  }
  return { text: rest, comment: null };
}

function findQuoteEnd(s, start) {
  const q = s[start];
  for (let j = start + 1; j < s.length; j++) {
    if (q === '"' && s[j] === '\\') { j++; continue; }
    if (s[j] === q) {
      if (q === "'" && s[j + 1] === "'") { j++; continue; }
      return j;
    }
  }
  return -1;
}

function unescapeDouble(body, line) {
  const map = { n: '\n', t: '\t', r: '\r', '0': '\0', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/', ' ': ' ', e: '\x1b' };
  return body.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (m, e) => {
    if (e.length > 1) return String.fromCodePoint(parseInt(e.slice(1), 16));
    if (own(map, e)) return map[e];
    throw new DesignMdError(`unsupported escape "\\${e}" in double-quoted string`, line);
  });
}

function splitTopLevel(body, line) {
  const parts = [];
  let cur = '';
  for (let j = 0; j < body.length; j++) {
    const ch = body[j];
    const atItemStart = cur.trim() === '';
    if ((ch === '"' || ch === "'") && atItemStart) {
      const end = findQuoteEnd(body, j);
      if (end < 0) throw new DesignMdError('unterminated quoted string in flow collection', line);
      cur += body.slice(j, end + 1);
      j = end;
      continue;
    }
    if (ch === '{' && atItemStart) {
      const close = body.indexOf('}', j);
      if (close > 0 && REF_RE.test(body.slice(j, close + 1))) { cur += body.slice(j, close + 1); j = close; continue; }
    }
    if ('[]{}'.includes(ch)) throw new DesignMdError('nested flow collections are not supported', line);
    if (ch === ',') { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim() !== '') parts.push(cur.trim());
  return parts;
}

function splitKey(text) {
  if (text[0] === '"' || text[0] === "'") {
    const end = findQuoteEnd(text, 0);
    if (end < 0) return null;
    const m = /^\s*:(?:\s+(.*)|\s*)$/.exec(text.slice(end + 1));
    if (!m) return null;
    const rawKey = text.slice(0, end + 1);
    const key = rawKey[0] === '"' ? unescapeDouble(rawKey.slice(1, -1)) : rawKey.slice(1, -1).replace(/''/g, "'");
    return { key, rest: (m[1] || '').trim() };
  }
  if (/^[[\]{},&*!|>%@`]/.test(text) || text === '-' || text.startsWith('- ')) return null;
  const idx = text.search(/:(\s|$)/);
  if (idx <= 0) return null;
  return { key: text.slice(0, idx).trim(), rest: text.slice(idx + 1).trim() };
}

function parseScalar(s, line, keyPath, warnings) {
  if (s[0] === '"' || s[0] === "'") {
    const end = findQuoteEnd(s, 0);
    if (end < 0) throw new DesignMdError('unterminated quoted string', line);
    if (end !== s.length - 1) throw new DesignMdError(`unexpected text after quoted string: ${s.slice(end + 1)}`, line);
    return s[0] === '"' ? unescapeDouble(s.slice(1, -1), line) : s.slice(1, -1).replace(/''/g, "'");
  }
  if (s[0] === '[') {
    if (!s.endsWith(']')) throw new DesignMdError('unterminated flow sequence', line);
    return splitTopLevel(s.slice(1, -1), line).map((p) => parseScalar(p, line, keyPath, warnings));
  }
  if (s[0] === '{') {
    if (REF_RE.test(s)) {
      warnings.push({
        rule: 'unquoted-ref', path: keyPath, line,
        message: `token reference ${s} is unquoted; standard YAML parsers read it as a mapping — write "${s}"`,
      });
      return s;
    }
    if (!s.endsWith('}')) throw new DesignMdError('unterminated flow mapping', line);
    const out = {};
    for (const part of splitTopLevel(s.slice(1, -1), line)) {
      const kv = splitKey(part);
      if (!kv || kv.key === '__proto__') throw new DesignMdError(`expected "key: value" in flow mapping, got "${part}"`, line);
      out[kv.key] = kv.rest === '' ? null : parseScalar(kv.rest, line, `${keyPath}.${kv.key}`, warnings);
    }
    return out;
  }
  if (/^[&*!%@`]/.test(s)) throw new DesignMdError(`anchors, aliases, tags and directives are not supported: ${s}`, line);
  if (/^(null|Null|NULL|~)$/.test(s)) return null;
  if (/^(true|True|TRUE)$/.test(s)) return true;
  if (/^(false|False|FALSE)$/.test(s)) return false;
  if (NUM_RE.test(s)) return Number(s);
  return s;
}

class YamlReader {
  constructor(src, startLine, warnings, keyLines) {
    this.raw = src.split(/\r?\n/);
    this.start = startLine;
    this.i = 0;
    this.warnings = warnings;
    this.keyLines = keyLines;
    this.override = new Map();
  }
  lineNo(i = this.i) { return this.start + i; }
  info(i) {
    if (this.override.has(i)) return this.override.get(i);
    const m = /^( *)(.*)$/.exec(this.raw[i]);
    const { text, comment } = stripComment(m[2]);
    const t = text.replace(/\s+$/, '');
    if (!t) return null;
    if (t[0] === '\t') throw new DesignMdError('tabs are not allowed for indentation', this.lineNo(i));
    return { indent: m[1].length, text: t, comment };
  }
  next() {
    while (this.i < this.raw.length) {
      const inf = this.info(this.i);
      if (inf) return inf;
      this.i++;
    }
    return null;
  }
}

const isSeqItem = (t) => t === '-' || t.startsWith('- ');
const isDocMarker = (inf) => inf.indent === 0 && (inf.text === '---' || inf.text === '...');

function parseNode(r, keyPath) {
  const inf = r.next();
  if (isSeqItem(inf.text)) return parseSeq(r, inf.indent, keyPath);
  return parseMap(r, inf.indent, keyPath);
}

function rejectDeeper(r, indent) {
  const nx = r.next();
  if (nx && nx.indent > indent) {
    throw new DesignMdError('unexpected indentation (multi-line plain scalars are not supported — quote the value or use a | block)', r.lineNo());
  }
}

function parseBlockScalar(r, parentIndent, indicator) {
  const chomp = indicator[1] || '';
  const body = [];
  let contentIndent = -1;
  while (r.i < r.raw.length) {
    const line = r.raw[r.i];
    if (line.trim() === '') { body.push(''); r.i++; continue; }
    const ind = /^ */.exec(line)[0].length;
    if (contentIndent < 0) {
      if (ind <= parentIndent) break;
      contentIndent = ind;
    }
    if (ind < contentIndent) break;
    body.push(line.slice(contentIndent));
    r.i++;
  }
  let trailing = 0;
  while (body.length && body[body.length - 1] === '') { body.pop(); trailing++; }
  let text;
  if (indicator[0] === '|') {
    text = body.join('\n');
  } else {
    text = '';
    let prevBlank = true;
    for (const ln of body) {
      if (ln === '') { text += '\n'; prevBlank = true; continue; }
      text += (prevBlank || /^\s/.test(ln) ? '' : ' ') + ln;
      prevBlank = false;
    }
  }
  if (!body.length) return '';
  if (chomp === '-') return text;
  if (chomp === '+') return text + '\n'.repeat(trailing + 1);
  return text + '\n';
}

function parseMap(r, indent, keyPath) {
  const out = {};
  for (;;) {
    const inf = r.next();
    if (!inf || inf.indent < indent || isDocMarker(inf)) break;
    const line = r.lineNo();
    if (inf.indent > indent) throw new DesignMdError('unexpected indentation', line);
    if (isSeqItem(inf.text)) {
      if (keyPath === '') throw new DesignMdError('expected a mapping, found a sequence item', line);
      break;
    }
    const kv = splitKey(inf.text);
    if (!kv) throw new DesignMdError(`expected "key: value", got "${inf.text}"`, line);
    if (kv.key === '__proto__') throw new DesignMdError('"__proto__" is not allowed as a key', line);
    if (own(out, kv.key)) throw new DesignMdError(`duplicate key "${kv.key}"`, line);
    const childPath = keyPath ? `${keyPath}.${kv.key}` : kv.key;
    r.keyLines[childPath] = line;
    r.i++;
    let value;
    if (kv.rest === '') {
      const nx = r.next();
      if (nx && nx.indent > indent) value = parseNode(r, childPath);
      else if (nx && nx.indent === indent && isSeqItem(nx.text)) value = parseSeq(r, indent, childPath);
      else value = null;
      if (value === null && inf.comment && HEX_COMMENT_RE.test(inf.comment)) {
        r.warnings.push({
          severity: 'error', rule: 'unquoted-hex', path: childPath, line,
          message: `value is empty because an unquoted "#${inf.comment.split(/\s/)[0]}" starts a YAML comment — quote hex colors`,
        });
      }
    } else if (/^[|>][+-]?$/.test(kv.rest)) {
      value = parseBlockScalar(r, indent, kv.rest);
    } else {
      value = parseScalar(kv.rest, line, childPath, r.warnings);
      rejectDeeper(r, indent);
    }
    out[kv.key] = value;
  }
  return out;
}

function parseSeq(r, indent, keyPath) {
  const out = [];
  for (;;) {
    const inf = r.next();
    if (!inf || inf.indent < indent || isDocMarker(inf)) break;
    if (inf.indent > indent) throw new DesignMdError('unexpected indentation', r.lineNo());
    if (!isSeqItem(inf.text)) break;
    const line = r.lineNo();
    const rest = inf.text === '-' ? '' : inf.text.slice(2).replace(/^\s+/, '');
    const offset = inf.text.length - rest.length;
    const childPath = `${keyPath}[${out.length}]`;
    if (rest === '') {
      r.i++;
      const nx = r.next();
      out.push(nx && nx.indent > indent ? parseNode(r, childPath) : null);
    } else if (/^[|>][+-]?$/.test(rest)) {
      r.i++;
      out.push(parseBlockScalar(r, indent, rest));
    } else if (isSeqItem(rest) || splitKey(rest)) {
      r.override.set(r.i, { indent: indent + offset, text: rest, comment: inf.comment });
      out.push(parseNode(r, childPath));
    } else {
      r.i++;
      out.push(parseScalar(rest, line, childPath, r.warnings));
      rejectDeeper(r, indent);
    }
  }
  return out;
}

function parseYaml(src, startLine = 1, warnings = [], keyLines = {}) {
  const r = new YamlReader(src, startLine, warnings, keyLines);
  let first = r.next();
  if (first && first.indent === 0 && first.text === '---') { r.i++; first = r.next(); }
  if (!first) return null;
  let value;
  if (first.indent === 0 && !isSeqItem(first.text) && !splitKey(first.text)) {
    value = parseScalar(first.text, r.lineNo(), '', warnings);
    r.i++;
  } else {
    value = parseNode(r, '');
  }
  let rest = r.next();
  if (rest && isDocMarker(rest)) {
    // A closing document marker is fine as long as nothing follows it.
    r.i++;
    if (!r.next()) return value;
    rest = r.next();
  }
  if (rest) {
    if (rest.text === '---' || rest.text === '...') throw new DesignMdError('multiple YAML documents in one block are not supported', r.lineNo());
    throw new DesignMdError(`unexpected content "${rest.text}"`, r.lineNo());
  }
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// Markdown layer
// ═══════════════════════════════════════════════════════════════════════════

function normalizeHeading(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalSection(heading) {
  const key = normalizeHeading(heading).toLowerCase();
  const idx = SECTIONS.findIndex((s) => s.aliases.includes(key));
  return idx < 0 ? null : { index: idx, name: SECTIONS[idx].name };
}

function extractMarkdown(content) {
  const lines = content.replace(/^﻿/, '').split(/\r?\n/);
  const blocks = [];
  const headings = [];
  let i = 0;
  if (lines.length && lines[0].trimEnd() === '---') {
    let j = 1;
    while (j < lines.length && lines[j].trimEnd() !== '---') j++;
    if (j >= lines.length) throw new DesignMdError('front matter opened with --- has no closing --- line', 1);
    blocks.push({ source: 'front matter', yaml: lines.slice(1, j).join('\n'), startLine: 2 });
    i = j + 1;
  }
  const bodyStart = i;
  let fence = null;
  let yamlCount = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      const closeRe = fence.ch === '`' ? /^ {0,3}(`{3,})\s*$/ : /^ {0,3}(~{3,})\s*$/;
      const cm = closeRe.exec(line);
      if (cm && cm[1].length >= fence.len) {
        if (fence.yaml) blocks.push({ source: `yaml block ${++yamlCount}`, yaml: fence.buf.join('\n'), startLine: fence.start + 2 });
        fence = null;
      } else if (fence.yaml) {
        fence.buf.push(line.replace(new RegExp(`^ {0,${fence.indent}}`), ''));
      }
      continue;
    }
    const fm = /^( {0,3})(`{3,}|~{3,})\s*([^\s`]*)/.exec(line);
    if (fm) {
      const lang = fm[3].toLowerCase();
      fence = { ch: fm[2][0], len: fm[2].length, indent: fm[1].length, yaml: lang === 'yaml' || lang === 'yml', buf: [], start: i };
      continue;
    }
    const hm = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/.exec(line);
    if (hm) {
      const raw = (hm[2] || '').replace(/(^|[ \t]+)#+$/, '').trim();
      headings.push({ depth: hm[1].length, text: normalizeHeading(raw), line: i + 1 });
    }
  }
  if (fence && fence.yaml) throw new DesignMdError('```yaml code block is never closed', fence.start + 1);
  return { lines, blocks, headings, bodyStart };
}

// Splits the markdown body into h2 sections: [{ heading, body }] (heading '' = preamble).
function splitSections(ex) {
  const h2 = ex.headings.filter((h) => h.depth === 2);
  const out = [];
  const firstLine = h2.length ? h2[0].line - 1 : ex.lines.length;
  const preamble = ex.lines.slice(ex.bodyStart, firstLine).join('\n').trim();
  if (preamble) out.push({ heading: '', body: preamble });
  h2.forEach((h, k) => {
    const end = k + 1 < h2.length ? h2[k + 1].line - 1 : ex.lines.length;
    out.push({ heading: h.text, body: ex.lines.slice(h.line, end).join('\n').trim() });
  });
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Document model
// ═══════════════════════════════════════════════════════════════════════════

function flattenGroup(value, prefix, out, issues, group) {
  for (const [k, v] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${k}` : k;
    if (isObj(v)) { flattenGroup(v, name, out, issues, group); continue; }
    if (own(out, name)) issues.push({ severity: 'error', rule: 'duplicate-token', path: `${group}.${name}`, message: `token "${group}.${name}" is defined twice (once through a nested group)` });
    out[name] = v;
  }
  return out;
}

function buildModel(tree, issues) {
  const m = { version: undefined, name: undefined, description: undefined, omitted: undefined, colors: {}, typography: {}, rounded: {}, spacing: {}, components: {}, extensions: {} };
  for (const [k, v] of Object.entries(tree)) {
    if (['version', 'name', 'description'].includes(k)) {
      if (v !== null && typeof v !== 'string' && typeof v !== 'number') issues.push({ severity: 'error', rule: 'invalid-meta', path: k, message: `"${k}" must be a string` });
      m[k] = v === null ? undefined : String(v);
    } else if (k === 'omitted') {
      if (!Array.isArray(v)) { issues.push({ severity: 'error', rule: 'omitted-rules', path: k, message: '"omitted" must be a list' }); continue; }
      m.omitted = v.map((item, n) => {
        if (typeof item === 'string') return { section: item };
        if (isObj(item) && typeof item.section === 'string') return item.reason ? { section: item.section, reason: String(item.reason) } : { section: item.section };
        issues.push({ severity: 'error', rule: 'omitted-rules', path: `omitted[${n}]`, message: 'each omitted entry must be a section name or { section, reason }' });
        return null;
      }).filter(Boolean);
    } else if (FLAT_GROUPS.includes(k)) {
      if (v === null) continue;
      if (!isObj(v)) { issues.push({ severity: 'error', rule: 'invalid-group', path: k, message: `"${k}" must be a mapping of token names to values` }); continue; }
      m[k] = flattenGroup(v, '', {}, issues, k);
    } else if (k === 'typography' || k === 'components') {
      if (v === null) continue;
      if (!isObj(v)) { issues.push({ severity: 'error', rule: 'invalid-group', path: k, message: `"${k}" must be a mapping` }); continue; }
      m[k] = {};
      for (const [name, def] of Object.entries(v)) m[k][name] = isObj(def) ? Object.assign({}, def) : def;
    } else {
      m.extensions[k] = v;
    }
  }
  return m;
}

function parseDesignMd(content) {
  const ex = extractMarkdown(content);
  const warnings = [];
  const keyLines = {};
  const tree = {};
  const origin = {};
  for (const b of ex.blocks) {
    const parsed = parseYaml(b.yaml, b.startLine, warnings, keyLines);
    if (parsed === null) continue;
    if (!isObj(parsed)) throw new DesignMdError(`${b.source} must be a YAML mapping`, b.startLine);
    for (const k of Object.keys(parsed)) {
      if (own(origin, k)) throw new DesignMdError(`top-level key "${k}" is defined in both ${origin[k]} and ${b.source} — each key may appear only once`, b.startLine);
      origin[k] = b.source;
      tree[k] = parsed[k];
    }
  }
  const issues = [];
  const model = buildModel(tree, issues);
  const sections = ex.headings.filter((h) => h.depth === 2).map((h) => {
    const c = canonicalSection(h.text);
    return { heading: h.text, line: h.line, canonical: c ? c.name : null };
  });
  return { model, sections, prose: splitSections(ex), warnings, issues, keyLines, yamlBlocks: ex.blocks.length };
}

// Reference lookup over the model. Returns { found, value }.
function lookup(model, p) {
  const segs = p.split('.');
  const group = segs[0];
  if (FLAT_GROUPS.includes(group)) {
    const name = segs.slice(1).join('.');
    return own(model[group], name) ? { found: true, value: model[group][name] } : { found: false };
  }
  let node = group === 'typography' || group === 'components' ? model[group] : model.extensions[group];
  if (node === undefined) return { found: false };
  for (const s of segs.slice(1)) {
    if (!isObj(node) || !own(node, s)) return { found: false };
    node = node[s];
  }
  return { found: true, value: node };
}

// Follows references until a literal is reached. { ok, value, error, chain }
function resolveRef(model, value, chain = []) {
  if (!isRef(value)) return { ok: true, value, chain };
  const p = refPath(value);
  if (chain.includes(p)) return { ok: false, error: `circular reference ${chain.concat(p).join(' → ')}` };
  const hit = lookup(model, p);
  if (!hit.found) return { ok: false, error: `{${p}} does not resolve to a token` };
  return resolveRef(model, hit.value, chain.concat(p));
}

function parseDim(v) {
  if (typeof v !== 'string') return null;
  const m = DIM_RE.exec(v.trim());
  return m ? { value: Number(m[1]), unit: m[2] } : null;
}

function toPx(dim) {
  if (!dim) return null;
  return dim.unit === 'px' ? dim.value : dim.value * 16;
}

// ═══════════════════════════════════════════════════════════════════════════
// Colour parsing (CSS Color 4 subset) and WCAG contrast
// ═══════════════════════════════════════════════════════════════════════════

const NAMED_COLORS = Object.fromEntries((
  'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 ' +
  'black:000000 blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 ' +
  'cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc ' +
  'crimson:dc143c cyan:00ffff darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 ' +
  'darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 ' +
  'darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f darkslateblue:483d8b ' +
  'darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 ' +
  'deepskyblue:00bfff dimgray:696969 dimgrey:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 ' +
  'forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 ' +
  'green:008000 greenyellow:adff2f grey:808080 honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ' +
  'ivory:fffff0 khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd ' +
  'lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 ' +
  'lightgreen:90ee90 lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa ' +
  'lightskyblue:87cefa lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 ' +
  'lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa ' +
  'mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee ' +
  'mediumspringgreen:00fa9a mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa ' +
  'mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 ' +
  'orange:ffa500 orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee ' +
  'palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 ' +
  'purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f royalblue:4169e1 saddlebrown:8b4513 ' +
  'salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d silver:c0c0c0 skyblue:87ceeb ' +
  'slateblue:6a5acd slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c ' +
  'teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff ' +
  'whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32'
).split(' ').map((e) => e.split(':')));

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');

function makeColor(r, g, b, alpha = 1, space = 'srgb') {
  const c = { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), alpha: clamp(alpha, 0, 1), space };
  c.hex = `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return c;
}

function num(tok, pctScale) {
  if (tok === 'none') return 0;
  const m = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(%|deg|rad|grad|turn)?$/.exec(tok);
  if (!m) return NaN;
  const n = Number(m[1]);
  switch (m[2]) {
    case '%': return pctScale === undefined ? NaN : (n / 100) * pctScale;
    case 'rad': return (n * 180) / Math.PI;
    case 'grad': return n * 0.9;
    case 'turn': return n * 360;
    default: return n;
  }
}

function alphaOf(tok) {
  if (tok === undefined) return 1;
  const a = num(tok, 1);
  return Number.isNaN(a) ? NaN : clamp(a, 0, 1);
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const gammaEncode = (x) => {
  const s = Math.sign(x); const a = Math.abs(x);
  return 255 * (a <= 0.0031308 ? 12.92 * x : s * (1.055 * a ** (1 / 2.4) - 0.055));
};

function linearToColor(lr, lg, lb, alpha, space) {
  return makeColor(gammaEncode(lr), gammaEncode(lg), gammaEncode(lb), alpha, space);
}

function oklabToColor(L, a, b, alpha, space) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return linearToColor(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    alpha, space,
  );
}

function labToColor(L, a, b, alpha, space) {
  // CIE Lab (D50) → XYZ D50 → Bradford to D65 → linear sRGB.
  const eps = 216 / 24389; const kappa = 24389 / 27;
  const fy = (L + 16) / 116; const fx = fy + a / 500; const fz = fy - b / 200;
  const xr = fx ** 3 > eps ? fx ** 3 : (116 * fx - 16) / kappa;
  const yr = L > kappa * eps ? fy ** 3 : L / kappa;
  const zr = fz ** 3 > eps ? fz ** 3 : (116 * fz - 16) / kappa;
  const X50 = xr * 0.3457 / 0.3585; const Y50 = yr; const Z50 = zr * (1 - 0.3457 - 0.3585) / 0.3585;
  const X = 0.955473421488075 * X50 - 0.02309845494876471 * Y50 + 0.06325924320057072 * Z50;
  const Y = -0.0283697093338637 * X50 + 1.0099953980813041 * Y50 + 0.021041441191917323 * Z50;
  const Z = 0.012314014864481998 * X50 - 0.020507649298898964 * Y50 + 1.330365926242124 * Z50;
  return linearToColor(
    3.2409699419045226 * X - 1.537383177570094 * Y - 0.4986107602930034 * Z,
    -0.9692436362808796 * X + 1.8759675015077202 * Y + 0.04155505740717559 * Z,
    0.05563007969699366 * X - 0.20397695888897652 * Y + 1.0569715142428786 * Z,
    alpha, space,
  );
}

// Returns { r, g, b (0–255), alpha (0–1), hex, space } or null when the string
// is not a colour this parser understands.
function parseColor(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();
  if (s === 'transparent') return makeColor(0, 0, 0, 0);
  if (own(NAMED_COLORS, s)) { const h = NAMED_COLORS[s]; return makeColor(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)); }
  if (s[0] === '#') {
    const h = s.slice(1);
    if (!/^[0-9a-f]+$/.test(h) || ![3, 4, 6, 8].includes(h.length)) return null;
    const full = h.length <= 4 ? h.split('').map((x) => x + x).join('') : h;
    return makeColor(parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1);
  }
  const fm = /^([a-z]+)\((.*)\)$/.exec(s);
  if (!fm) return null;
  const fn = fm[1];
  let parts; let alphaTok;
  if (fm[2].includes(',')) {
    parts = fm[2].split(',').map((x) => x.trim());
    if (parts.length === 4) alphaTok = parts.pop();
  } else {
    const [left, right] = fm[2].split('/');
    parts = left.trim().split(/\s+/);
    alphaTok = right === undefined ? undefined : right.trim();
  }
  if (parts.length !== 3) return null;
  const alpha = alphaOf(alphaTok);
  let c = null;
  if (fn === 'rgb' || fn === 'rgba') {
    const v = parts.map((p) => num(p, 255));
    if (!v.some(Number.isNaN)) c = makeColor(v[0], v[1], v[2], alpha);
  } else if (fn === 'hsl' || fn === 'hsla') {
    const h = num(parts[0]); const sat = num(parts[1], 100); const l = num(parts[2], 100);
    if (![h, sat, l].some(Number.isNaN)) { const [r, g, b] = hslToRgb(h, clamp(sat, 0, 100) / 100, clamp(l, 0, 100) / 100); c = makeColor(r, g, b, alpha); }
  } else if (fn === 'hwb') {
    const h = num(parts[0]); let w = num(parts[1], 100) / 100; let bl = num(parts[2], 100) / 100;
    if (![h, w, bl].some(Number.isNaN)) {
      if (w + bl >= 1) { const gray = (w / (w + bl)) * 255; c = makeColor(gray, gray, gray, alpha); } else {
        const rgb = hslToRgb(h, 1, 0.5).map((x) => x * (1 - w - bl) + w * 255);
        c = makeColor(rgb[0], rgb[1], rgb[2], alpha);
      }
    }
  } else if (fn === 'lab') {
    const v = [num(parts[0], 100), num(parts[1], 125), num(parts[2], 125)];
    if (!v.some(Number.isNaN)) c = labToColor(v[0], v[1], v[2], alpha, 'lab');
  } else if (fn === 'lch') {
    const L = num(parts[0], 100); const C = num(parts[1], 150); const H = num(parts[2]);
    if (![L, C, H].some(Number.isNaN)) c = labToColor(L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180), alpha, 'lch');
  } else if (fn === 'oklab') {
    const v = [num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4)];
    if (!v.some(Number.isNaN)) c = oklabToColor(v[0], v[1], v[2], alpha, 'oklab');
  } else if (fn === 'oklch') {
    const L = num(parts[0], 1); const C = num(parts[1], 0.4); const H = num(parts[2]);
    if (![L, C, H].some(Number.isNaN)) c = oklabToColor(L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180), alpha, 'oklch');
  }
  if (c && Number.isNaN(alpha)) return null;
  return c;
}

const SPEC_COLOR_FUNCS = /^(color-mix|color)\(/i;

function relativeLuminance(c) {
  const ch = (v) => { const x = Math.round(v) / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a); const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function composite(top, bottom) {
  const a = top.alpha;
  return makeColor(top.r * a + bottom.r * (1 - a), top.g * a + bottom.g * (1 - a), top.b * a + bottom.b * (1 - a), 1);
}

// Worst-case contrast of fg over bg. A translucent background is checked over
// both a white and a black backdrop, since the real backdrop is unknown.
function pairContrast(fg, bg) {
  const backdrops = bg.alpha < 1 ? [makeColor(255, 255, 255), makeColor(0, 0, 0)].map((d) => composite(bg, d)) : [bg];
  let min = Infinity;
  for (const b of backdrops) {
    const f = fg.alpha < 1 ? composite(fg, b) : fg;
    min = Math.min(min, contrastRatio(f, b));
  }
  return { ratio: min, translucent: bg.alpha < 1 || fg.alpha < 1 };
}

// ═══════════════════════════════════════════════════════════════════════════
// Lint
// ═══════════════════════════════════════════════════════════════════════════

function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function resolvedColor(model, value) {
  const r = resolveRef(model, value);
  return r.ok ? parseColor(typeof r.value === 'string' ? r.value : '') : null;
}

function lintModel(parsed, opts = {}) {
  const { model, sections, keyLines = {} } = parsed;
  const findings = [];
  const add = (severity, rule, p, message) => findings.push({ severity, rule, path: p, message, line: keyLines[p] });
  const level = (opts.level || 'AA').toUpperCase();
  const minNormal = level === 'AAA' ? 7 : 4.5;
  const minLarge = level === 'AAA' ? 4.5 : 3;
  const isPage = Boolean(opts.page);

  for (const w of parsed.warnings || []) findings.push(Object.assign({ severity: 'warning' }, w));
  for (const i of parsed.issues || []) findings.push(Object.assign({ line: keyLines[i.path] }, i));

  const tokenCount = TOKEN_GROUPS.reduce((n, g) => n + Object.keys(model[g]).length, 0);
  if (parsed.yamlBlocks === 0 && !opts.merged) add('error', 'no-tokens', '', 'no design tokens found — add YAML front matter or a ```yaml block');

  // Metadata
  if (!isPage && !opts.merged && !model.name && parsed.yamlBlocks > 0) add('warning', 'missing-name', 'name', 'the token schema expects a "name" for the design system');
  if (model.version !== undefined && model.version !== SPEC.designMd) add('info', 'spec-version', 'version', `version "${model.version}" — this tool implements DESIGN.md "${SPEC.designMd}"`);

  // Unknown top-level keys
  for (const k of Object.keys(model.extensions)) {
    const near = KNOWN_TOP.find((known) => levenshtein(k.toLowerCase(), known) <= 2);
    if (near) add('warning', 'unknown-key', k, `unknown top-level key "${k}" — did you mean "${near}"? Its tokens are ignored`);
    else add('info', 'extension-key', k, `top-level key "${k}" is not part of the spec; preserved as an extension`);
  }

  // Colours
  for (const [name, v] of Object.entries(model.colors)) {
    const p = `colors.${name}`;
    if (isRef(v)) continue;
    if (v === null) { if (!findings.some((f) => f.path === p && f.rule === 'unquoted-hex')) add('error', 'invalid-color', p, 'colour has no value'); continue; }
    if (typeof v !== 'string') { add('error', 'invalid-color', p, `colour must be a CSS colour string, got ${JSON.stringify(v)}`); continue; }
    if (!parseColor(v)) {
      if (SPEC_COLOR_FUNCS.test(v.trim())) add('info', 'unverified-color', p, `${v} is valid CSS but cannot be evaluated here; it is skipped in contrast checks`);
      else add('error', 'invalid-color', p, `"${v}" is not a valid CSS colour`);
    }
  }

  // Dimensions
  for (const [name, v] of Object.entries(model.rounded)) {
    if (isRef(v)) continue;
    if (!parseDim(v)) add('warning', 'invalid-dimension', `rounded.${name}`, `rounded values should be dimensions (px, em or rem), got ${JSON.stringify(v)}`);
  }
  for (const [name, v] of Object.entries(model.spacing)) {
    if (isRef(v) || typeof v === 'number' || parseDim(v)) continue;
    add('info', 'non-dimension-spacing', `spacing.${name}`, `${JSON.stringify(v)} is not a dimension or number; kept as a string`);
  }

  // Typography
  for (const [name, def] of Object.entries(model.typography)) {
    const p = `typography.${name}`;
    if (isRef(def)) continue;
    if (!isObj(def)) { add('error', 'invalid-typography', p, 'typography tokens must be mappings of font properties'); continue; }
    for (const [prop, v] of Object.entries(def)) {
      const pp = `${p}.${prop}`;
      if (!TYPO_PROPS.includes(prop)) { add('warning', 'unknown-typography-property', pp, `"${prop}" is not a typography property (${TYPO_PROPS.join(', ')})`); continue; }
      if (isRef(v)) continue;
      if (prop === 'fontSize' || prop === 'letterSpacing') { if (!parseDim(v)) add('error', 'invalid-dimension', pp, `${prop} must be a dimension (px, em or rem), got ${JSON.stringify(v)}`); }
      if (prop === 'lineHeight' && typeof v !== 'number' && !NUM_RE.test(String(v)) && !parseDim(v)) add('error', 'invalid-dimension', pp, `lineHeight must be a unitless number or a dimension, got ${JSON.stringify(v)}`);
      if (prop === 'fontWeight') {
        const w = typeof v === 'number' ? v : (NUM_RE.test(String(v)) ? Number(v) : NaN);
        if (!(w >= 1 && w <= 1000)) add('error', 'invalid-font-weight', pp, `fontWeight must be a number from 1 to 1000, got ${JSON.stringify(v)}`);
      }
      if (['fontFamily', 'fontFeature', 'fontVariation'].includes(prop) && typeof v !== 'string') add('error', 'invalid-typography', pp, `${prop} must be a string`);
    }
  }

  // Components
  for (const [name, def] of Object.entries(model.components)) {
    const p = `components.${name}`;
    if (!isObj(def)) { add('error', 'invalid-component', p, 'components must be mappings of properties'); continue; }
    for (const [prop, v] of Object.entries(def)) {
      const pp = `${p}.${prop}`;
      if (!COMPONENT_PROPS.includes(prop)) add('warning', 'unknown-component-property', pp, `"${prop}" is not a defined component property (${COMPONENT_PROPS.join(', ')}); kept as-is`);
      if (isRef(v) || v === null) continue;
      if (COMPONENT_COLOR_PROPS.includes(prop) && !parseColor(String(v)) && !SPEC_COLOR_FUNCS.test(String(v))) add('error', 'invalid-color', pp, `"${v}" is not a valid CSS colour`);
      if (COMPONENT_DIM_PROPS.includes(prop) && typeof v === 'string' && !v.trim().split(/\s+/).every((x) => parseDim(x) || x === '0' || x === 'auto')) {
        add('warning', 'invalid-dimension', pp, `${prop} should be a dimension, got ${JSON.stringify(v)}`);
      }
    }
  }

  // References
  const refSites = [];
  for (const g of FLAT_GROUPS) for (const [n, v] of Object.entries(model[g])) refSites.push([`${g}.${n}`, v, false]);
  for (const [n, def] of Object.entries(model.typography)) {
    if (isObj(def)) for (const [k, v] of Object.entries(def)) refSites.push([`typography.${n}.${k}`, v, false]);
    else refSites.push([`typography.${n}`, def, true]);
  }
  for (const [n, def] of Object.entries(model.components)) if (isObj(def)) for (const [k, v] of Object.entries(def)) refSites.push([`components.${n}.${k}`, v, true]);
  const referenced = new Set();
  for (const [p, v, allowComposite] of refSites) {
    if (!isRef(v)) continue;
    referenced.add(refPath(v));
    const r = resolveRef(model, v);
    if (!r.ok) { add('error', 'broken-ref', p, r.error); continue; }
    if (isObj(r.value) && !allowComposite) add('error', 'broken-ref', p, `${v} points to a group or composite token; only components may reference composites`);
  }

  // Coverage
  const hasColors = Object.keys(model.colors).length > 0;
  if (!isPage && hasColors && !own(model.colors, 'primary')) add('warning', 'missing-primary', 'colors', 'no "primary" colour is defined — the spec requires at least a primary palette');
  const omitted = new Set((model.omitted || []).map((o) => o.section));
  if (!isPage && hasColors && !Object.keys(model.typography).length && !omitted.has('typography')) add('warning', 'missing-typography', 'typography', 'colours are defined but no typography tokens — agents will fall back to default fonts');
  if (!isPage && tokenCount > 0) {
    for (const g of ['spacing', 'rounded']) if (!Object.keys(model[g]).length && !omitted.has(g)) add('info', 'missing-sections', g, `no ${g} tokens (list "${g}" under omitted: to silence)`);
  }
  for (const o of model.omitted || []) {
    if (!OMITTABLE.includes(o.section)) add('warning', 'omitted-rules', 'omitted', `"${o.section}" is not an omittable section (${OMITTABLE.join(', ')})`);
    else if (Object.keys(model[o.section]).length) add('info', 'omitted-rules', 'omitted', `"${o.section}" is listed as omitted but defines tokens`);
  }
  if (Object.keys(model.components).length) {
    for (const n of Object.keys(model.colors)) {
      if (!referenced.has(`colors.${n}`)) add('info', 'orphaned-tokens', `colors.${n}`, 'colour is not referenced by any component');
    }
  }

  // Sections
  if (sections && !opts.merged) {
    const seen = new Map();
    let lastIdx = -1; let lastName = null;
    for (const s of sections) {
      const key = s.canonical || s.heading.toLowerCase();
      if (seen.has(key)) findings.push({ severity: 'error', rule: 'duplicate-section', path: `## ${s.heading}`, line: s.line, message: `section "${s.heading}" duplicates "${seen.get(key)}" — the spec rejects duplicate sections` });
      else seen.set(key, s.heading);
      if (!s.canonical) continue;
      const idx = SECTIONS.findIndex((x) => x.name === s.canonical);
      if (idx < lastIdx) findings.push({ severity: 'warning', rule: 'section-order', path: `## ${s.heading}`, line: s.line, message: `"${s.heading}" should come before "${lastName}" (order: ${SECTIONS.map((x) => x.name).join(' → ')})` });
      else { lastIdx = idx; lastName = s.heading; }
    }
  }

  // Contrast — component pairs (declared) and on-X / X-foreground naming pairs.
  const largeText = (def) => {
    if (!def || def.typography === undefined) return false;
    const t = resolveRef(model, def.typography);
    if (!t.ok || !isObj(t.value)) return false;
    const size = toPx(parseDim(resolveRef(model, t.value.fontSize).value));
    const weight = Number(resolveRef(model, t.value.fontWeight).value) || 400;
    return size !== null && (size >= 24 || (size >= 18.66 && weight >= 700));
  };
  const checkPair = (p, fgVal, bgVal, severity, large, label) => {
    if (!resolveRef(model, fgVal).ok || !resolveRef(model, bgVal).ok) return; // reported as broken-ref
    const fg = resolvedColor(model, fgVal); const bg = resolvedColor(model, bgVal);
    if (!fg || !bg) {
      if (fgVal !== undefined && bgVal !== undefined) add('info', 'contrast-unverified', p, `${label}: could not evaluate one of the colours`);
      return;
    }
    if (bg.alpha === 0) { add('info', 'contrast-unverified', p, `${label}: background is transparent, so contrast depends on the surface underneath`); return; }
    const min = large ? minLarge : minNormal;
    const { ratio, translucent } = pairContrast(fg, bg);
    if (ratio + 1e-9 < min) {
      const sev = translucent ? 'warning' : severity;
      add(sev, 'contrast-ratio', p, `${label}: ${fg.hex} on ${bg.hex} is ${ratio.toFixed(2)}:1 — below WCAG ${level} ${min}:1 for ${large ? 'large' : 'normal'} text${translucent ? ' (translucent colour; worst case over white/black backdrop)' : ''}`);
    }
  };
  for (const [name, def] of Object.entries(model.components)) {
    if (!isObj(def) || def.textColor === undefined || def.backgroundColor === undefined) continue;
    checkPair(`components.${name}`, def.textColor, def.backgroundColor, 'error', largeText(def), 'textColor on backgroundColor');
  }
  for (const name of Object.keys(model.colors)) {
    let base = null;
    if (name.startsWith('on-')) base = name.slice(3);
    else if (name.endsWith('-foreground')) base = name.slice(0, -'-foreground'.length);
    if (base && own(model.colors, base)) checkPair(`colors.${name}`, model.colors[name], model.colors[base], 'warning', false, `${name} on ${base}`);
  }

  const order = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  const summary = { errors: 0, warnings: 0, infos: 0 };
  for (const f of findings) summary[f.severity === 'info' ? 'infos' : `${f.severity}s`]++;
  return { findings, summary };
}

// ═══════════════════════════════════════════════════════════════════════════
// Export: DTCG
// ═══════════════════════════════════════════════════════════════════════════

function setNested(group, segs, token) {
  let node = group;
  for (let k = 0; k < segs.length - 1; k++) {
    const s = segs[k];
    if (!own(node, s)) node[s] = {};
    else if (own(node[s], '$value')) node[s] = { $root: node[s] };
    node = node[s];
  }
  const last = segs[segs.length - 1];
  if (own(node, last) && !own(node[last], '$value')) node[last].$root = token;
  else node[last] = token;
}

const DTCG_BAD_NAME = /[{}]|^\$/;
const TYPO_DEFAULTS = {
  fontFamily: 'sans-serif',
  fontSize: { value: 16, unit: 'px' },
  fontWeight: 400,
  letterSpacing: { value: 0, unit: 'px' },
  lineHeight: 1.2,
};

// Drops aliases whose target was not exported (e.g. a colour DTCG cannot
// express), so the file never contains a dangling reference.
function pruneDanglingAliases(out, notes) {
  const tokenAt = (segs) => {
    let node = out;
    for (const s of segs) { if (!isObj(node) || !own(node, s)) return null; node = node[s]; }
    if (isObj(node) && !own(node, '$value') && own(node, '$root')) node = node.$root;
    return isObj(node) && own(node, '$value') ? node : null;
  };
  const visit = (node, where) => {
    for (const [k, child] of Object.entries(node)) {
      if (k === '$extensions' || !isObj(child)) continue;
      if (own(child, '$value')) {
        const v = child.$value;
        const target = typeof v === 'string' && isRef(v) ? refPath(v).split('.') : null;
        const ptr = isObj(v) && typeof v.$ref === 'string' ? /^#\/(.+?)\/\$value\//.exec(v.$ref) : null;
        const segs = target || (ptr ? ptr[1].split('/') : null);
        if (segs && !tokenAt(segs)) {
          // Keep the original reference in $extensions so a round-trip restores it.
          const original = target ? v : `{${segs.join('.')}.${v.$ref.split('/').pop()}}`;
          node.$extensions = node.$extensions || {};
          node.$extensions[EXT] = node.$extensions[EXT] || {};
          node.$extensions[EXT].unmapped = Object.assign(node.$extensions[EXT].unmapped || {}, { [k]: original });
          notes.push(`${where}${k}: alias target ${segs.join('.')} was not exported — kept in $extensions`);
          delete node[k];
        }
      } else visit(child, `${where}${k}.`);
    }
  };
  visit(out, '');
  return out;
}

function dtcgColor(c) {
  const v = { colorSpace: 'srgb', components: [round(c.r / 255), round(c.g / 255), round(c.b / 255)] };
  if (c.alpha < 1) v.alpha = round(c.alpha);
  v.hex = c.hex;
  return v;
}

function dtcgAlias(value) {
  // {typography.h1.fontSize} points inside a composite: DTCG needs a JSON Pointer.
  const p = refPath(value);
  const segs = p.split('.');
  if (segs[0] === 'typography' && segs.length === 3) return { $ref: `#/typography/${segs[1]}/$value/${segs[2]}` };
  return `{${p}}`;
}

function dtcgDim(v, notes, where) {
  const d = parseDim(String(v));
  if (!d) return null;
  if (d.unit === 'em') { notes.push(`${where}: "${v}" uses em, which DTCG does not allow — exported as rem (1em = 1rem)`); return { value: d.value, unit: 'rem' }; }
  return { value: d.value, unit: d.unit };
}

function toDtcg(model, notes = []) {
  const out = { $schema: DTCG_SCHEMA };
  if (model.description || model.name) out.$description = model.description || model.name;
  const meta = { spec: `DESIGN.md ${SPEC.designMd}` };
  for (const k of ['name', 'version', 'description', 'omitted']) if (model[k] !== undefined) meta[k] = model[k];
  if (Object.keys(model.extensions).length) meta.extensions = model.extensions;
  out.$extensions = { [EXT]: meta };

  const checkName = (g, name) => {
    // Dotted names nest as groups in the flat groups; elsewhere a period is not allowed.
    const bad = FLAT_GROUPS.includes(g) ? name.split('.').some((s) => DTCG_BAD_NAME.test(s) || s === '') : DTCG_BAD_NAME.test(name) || name.includes('.');
    if (bad) { notes.push(`${g}.${name}: name is not a valid DTCG token name — skipped`); return false; }
    return true;
  };

  if (Object.keys(model.colors).length) {
    const group = { $type: 'color' };
    const unmapped = {};
    for (const [name, raw] of Object.entries(model.colors)) {
      if (!checkName('colors', name)) continue;
      if (isRef(raw)) { setNested(group, name.split('.'), { $value: dtcgAlias(raw) }); continue; }
      const c = parseColor(String(raw));
      if (!c) { unmapped[name] = raw; notes.push(`colors.${name}: "${raw}" cannot be converted to sRGB — kept in $extensions`); continue; }
      const token = { $value: dtcgColor(c) };
      if (String(raw).trim().toLowerCase() !== c.hex) token.$extensions = { [EXT]: { css: raw } };
      setNested(group, name.split('.'), token);
    }
    if (Object.keys(unmapped).length) group.$extensions = { [EXT]: { unmapped, order: Object.keys(model.colors) } };
    out.colors = group;
  }

  for (const g of ['rounded', 'spacing']) {
    if (!Object.keys(model[g]).length) continue;
    const group = { $type: 'dimension' };
    const unmapped = {};
    for (const [name, raw] of Object.entries(model[g])) {
      if (!checkName(g, name)) continue;
      if (isRef(raw)) { setNested(group, name.split('.'), { $value: dtcgAlias(raw) }); continue; }
      if (typeof raw === 'number') { setNested(group, name.split('.'), { $type: 'number', $value: raw }); continue; }
      const d = dtcgDim(raw, notes, `${g}.${name}`);
      if (!d) { unmapped[name] = raw; notes.push(`${g}.${name}: "${raw}" is not a DTCG dimension — kept in $extensions`); continue; }
      const token = { $value: d };
      if (parseDim(String(raw)).unit === 'em') token.$extensions = { [EXT]: { css: raw } };
      setNested(group, name.split('.'), token);
    }
    if (Object.keys(unmapped).length) group.$extensions = { [EXT]: { unmapped, order: Object.keys(model[g]) } };
    out[g] = group;
  }

  if (Object.keys(model.typography).length) {
    const group = {};
    for (const [name, def] of Object.entries(model.typography)) {
      if (!checkName('typography', name)) continue;
      if (isRef(def)) { group[name] = { $value: dtcgAlias(def) }; continue; }
      if (!isObj(def)) { notes.push(`typography.${name}: not a mapping — skipped`); continue; }
      const value = {};
      let lossy = false;
      const sizeRaw = isRef(def.fontSize) ? resolveRef(model, def.fontSize).value : def.fontSize;
      const size = parseDim(String(sizeRaw));
      if (def.fontFamily !== undefined) {
        if (isRef(def.fontFamily)) value.fontFamily = dtcgAlias(def.fontFamily);
        else {
          const fams = String(def.fontFamily).split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          value.fontFamily = fams.length > 1 ? fams : fams[0];
        }
      }
      if (def.fontSize !== undefined) {
        if (isRef(def.fontSize)) value.fontSize = dtcgAlias(def.fontSize);
        else {
          const d = dtcgDim(def.fontSize, notes, `typography.${name}.fontSize`);
          if (d) value.fontSize = d;
          if (!d || size.unit === 'em') lossy = true;
        }
      }
      if (def.fontWeight !== undefined) {
        if (isRef(def.fontWeight)) value.fontWeight = dtcgAlias(def.fontWeight);
        else if (NUM_RE.test(String(def.fontWeight)) && Number(def.fontWeight) >= 1 && Number(def.fontWeight) <= 1000) value.fontWeight = Number(def.fontWeight);
        else if (own(FONT_WEIGHT_ALIASES, def.fontWeight)) value.fontWeight = def.fontWeight;
        else lossy = true;
      }
      if (def.letterSpacing !== undefined) {
        if (isRef(def.letterSpacing)) value.letterSpacing = dtcgAlias(def.letterSpacing);
        else {
          const ls = parseDim(String(def.letterSpacing));
          if (ls && ls.unit === 'em' && size && size.unit !== 'em') {
            // em is relative to the font size, so it converts exactly.
            value.letterSpacing = { value: round(ls.value * size.value), unit: size.unit };
            lossy = true;
          } else if (ls) {
            value.letterSpacing = dtcgDim(def.letterSpacing, notes, `typography.${name}.letterSpacing`);
            if (ls.unit === 'em') lossy = true;
          } else lossy = true;
        }
      }
      if (def.lineHeight !== undefined) {
        if (isRef(def.lineHeight)) value.lineHeight = dtcgAlias(def.lineHeight);
        else if (typeof def.lineHeight === 'number') value.lineHeight = def.lineHeight;
        else if (NUM_RE.test(String(def.lineHeight))) value.lineHeight = Number(def.lineHeight);
        else {
          const lh = parseDim(String(def.lineHeight));
          if (lh && lh.unit === 'em') value.lineHeight = lh.value;
          else if (lh && size && toPx(lh) !== null && toPx(size)) value.lineHeight = round(toPx(lh) / toPx(size));
          lossy = true;
        }
      }
      if (def.fontFeature !== undefined || def.fontVariation !== undefined) lossy = true;
      for (const k of Object.keys(def)) if (!TYPO_PROPS.includes(k)) lossy = true;
      // DTCG requires all five typography fields; DESIGN.md does not. Fill the
      // gaps with CSS initial values and record which ones were filled.
      const defaulted = [];
      for (const [k, dflt] of Object.entries(TYPO_DEFAULTS)) {
        if (value[k] === undefined) { value[k] = dflt; defaulted.push(k); }
      }
      if (defaulted.length) { lossy = true; notes.push(`typography.${name}: DTCG requires ${defaulted.join(', ')} — filled with CSS defaults`); }
      const token = { $type: 'typography', $value: value };
      if (lossy) token.$extensions = { [EXT]: defaulted.length ? { designMd: def, defaulted } : { designMd: def } };
      group[name] = token;
    }
    out.typography = group;
  }

  if (Object.keys(model.components).length) {
    const group = {};
    for (const [name, def] of Object.entries(model.components)) {
      if (!checkName('components', name) || !isObj(def)) continue;
      const comp = {};
      const unmapped = {};
      for (const [prop, v] of Object.entries(def)) {
        if (isRef(v)) {
          const alias = dtcgAlias(v);
          comp[prop] = typeof alias === 'string' ? { $value: alias } : { $type: 'dimension', $value: alias };
          if (typeof alias !== 'string') {
            const field = refPath(v).split('.')[2];
            comp[prop].$type = { fontFamily: 'fontFamily', fontWeight: 'fontWeight', lineHeight: 'number' }[field] || 'dimension';
          }
          continue;
        }
        if (COMPONENT_COLOR_PROPS.includes(prop) && parseColor(String(v))) {
          const c = parseColor(String(v));
          comp[prop] = { $type: 'color', $value: dtcgColor(c) };
          if (String(v).trim().toLowerCase() !== c.hex) comp[prop].$extensions = { [EXT]: { css: v } };
          continue;
        }
        if (COMPONENT_DIM_PROPS.includes(prop) && dtcgDim(v, [], '')) { comp[prop] = { $type: 'dimension', $value: dtcgDim(v, notes, `components.${name}.${prop}`) }; continue; }
        unmapped[prop] = v;
      }
      if (Object.keys(unmapped).length) comp.$extensions = { [EXT]: { unmapped, order: Object.keys(def) } };
      group[name] = comp;
    }
    out.components = group;
  }
  return pruneDanglingAliases(out, notes);
}

// ═══════════════════════════════════════════════════════════════════════════
// Export: CSS custom properties and Tailwind
// ═══════════════════════════════════════════════════════════════════════════

const kebab = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
const CSS_GROUP_PREFIX = { colors: 'color', rounded: 'rounded', spacing: 'spacing', typography: 'typography' };
const CSS_TYPO_PROP = { fontFamily: 'font-family', fontSize: 'font-size', fontWeight: 'font-weight', lineHeight: 'line-height', letterSpacing: 'letter-spacing', fontFeature: 'font-feature-settings', fontVariation: 'font-variation-settings' };
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong']);

function cssFontFamily(v) {
  return String(v).split(',').map((f) => f.trim()).filter(Boolean)
    .map((f) => (/^["']/.test(f) || GENERIC_FAMILIES.has(f.toLowerCase()) || !/\s/.test(f) ? f : `"${f}"`)).join(', ');
}

function cssVarFor(refP, prefix) {
  const segs = refP.split('.');
  const pre = prefix ? `${prefix}-` : '';
  if (FLAT_GROUPS.includes(segs[0])) return `--${pre}${CSS_GROUP_PREFIX[segs[0]]}-${kebab(segs.slice(1).join('-'))}`;
  if (segs[0] === 'typography' && segs.length === 3) return `--${pre}typography-${kebab(segs[1])}-${CSS_TYPO_PROP[segs[2]] || kebab(segs[2])}`;
  if (segs[0] === 'components' && segs.length === 3) return `--${pre}${kebab(segs[1])}-${kebab(segs[2])}`;
  return null;
}

function cssValue(model, v, prefix, prop) {
  if (isRef(v)) {
    const name = cssVarFor(refPath(v), prefix);
    if (name) return `var(${name})`;
    const r = resolveRef(model, v);
    return r.ok ? cssValue(model, r.value, prefix, prop) : null;
  }
  if (v === null || v === undefined || isObj(v)) return null;
  if (prop === 'fontFamily') return cssFontFamily(v);
  return String(v);
}

function toCss(model, opts = {}) {
  const prefix = opts.prefix ? kebab(opts.prefix) : '';
  const pre = prefix ? `${prefix}-` : '';
  const lines = [];
  const push = (name, value) => { if (value !== null && value !== undefined && value !== '') lines.push(`  --${pre}${name}: ${value};`); };
  for (const [n, v] of Object.entries(model.colors)) push(`color-${kebab(n.replace(/\./g, '-'))}`, cssValue(model, v, prefix));
  for (const g of ['rounded', 'spacing']) for (const [n, v] of Object.entries(model[g])) push(`${g}-${kebab(n.replace(/\./g, '-'))}`, cssValue(model, v, prefix));
  for (const [n, def] of Object.entries(model.typography)) {
    if (!isObj(def)) continue;
    for (const [k, v] of Object.entries(def)) if (CSS_TYPO_PROP[k]) push(`typography-${kebab(n)}-${CSS_TYPO_PROP[k]}`, cssValue(model, v, prefix, k));
  }
  for (const [n, def] of Object.entries(model.components)) {
    if (!isObj(def)) continue;
    for (const [k, v] of Object.entries(def)) {
      if (k === 'typography' && isRef(v)) {
        const t = resolveRef(model, v);
        const tname = refPath(v).split('.')[1];
        if (t.ok && isObj(t.value)) for (const tk of Object.keys(t.value)) if (CSS_TYPO_PROP[tk]) push(`${kebab(n)}-${CSS_TYPO_PROP[tk]}`, `var(--${pre}typography-${kebab(tname)}-${CSS_TYPO_PROP[tk]})`);
        continue;
      }
      push(`${kebab(n)}-${kebab(k)}`, cssValue(model, v, prefix, k));
    }
  }
  const title = model.name ? ` for ${model.name}` : '';
  return `/* Design tokens${title} — generated from DESIGN.md (spec ${SPEC.designMd}) by naksha design-md.js */\n:root {\n${lines.join('\n')}\n}\n`;
}

function toTailwindV4(model) {
  const theme = [];
  const twVar = (refP) => {
    const segs = refP.split('.');
    if (segs[0] === 'colors') return `--color-${kebab(segs.slice(1).join('-'))}`;
    if (segs[0] === 'rounded') return segs[1] === 'DEFAULT' ? '--radius' : `--radius-${kebab(segs.slice(1).join('-'))}`;
    if (segs[0] === 'spacing') return `--spacing-${kebab(segs.slice(1).join('-'))}`;
    return null;
  };
  const val = (v, prop) => {
    if (isRef(v)) { const name = twVar(refPath(v)); if (name) return `var(${name})`; const r = resolveRef(model, v); return r.ok ? val(r.value, prop) : null; }
    if (v === null || v === undefined || isObj(v)) return null;
    return prop === 'fontFamily' ? cssFontFamily(v) : String(v);
  };
  const push = (name, v) => { if (v !== null && v !== undefined) theme.push(`  ${name}: ${v};`); };
  for (const [n, v] of Object.entries(model.colors)) push(`--color-${kebab(n.replace(/\./g, '-'))}`, val(v));
  for (const [n, def] of Object.entries(model.typography)) {
    if (!isObj(def)) continue;
    const k = kebab(n);
    if (def.fontFamily !== undefined) push(`--font-${k}`, val(def.fontFamily, 'fontFamily'));
    if (def.fontSize !== undefined) {
      push(`--text-${k}`, val(def.fontSize));
      if (def.lineHeight !== undefined) push(`--text-${k}--line-height`, val(def.lineHeight));
      if (def.letterSpacing !== undefined) push(`--text-${k}--letter-spacing`, val(def.letterSpacing));
      if (def.fontWeight !== undefined) push(`--text-${k}--font-weight`, val(def.fontWeight));
    } else {
      if (def.lineHeight !== undefined) push(`--leading-${k}`, val(def.lineHeight));
      if (def.letterSpacing !== undefined) push(`--tracking-${k}`, val(def.letterSpacing));
      if (def.fontWeight !== undefined) push(`--font-weight-${k}`, val(def.fontWeight));
    }
  }
  for (const [n, v] of Object.entries(model.rounded)) push(n === 'DEFAULT' ? '--radius' : `--radius-${kebab(n.replace(/\./g, '-'))}`, val(v));
  for (const [n, v] of Object.entries(model.spacing)) {
    if (typeof v === 'number') continue; // unitless spacing (column counts, ratios) has no Tailwind namespace
    push(`--spacing-${kebab(n.replace(/\./g, '-'))}`, val(v));
  }
  let css = `/* Tailwind v4 theme${model.name ? ` for ${model.name}` : ''} — generated from DESIGN.md (spec ${SPEC.designMd}) by naksha design-md.js. Import after @import "tailwindcss". */\n@theme {\n${theme.join('\n')}\n}\n`;
  if (Object.keys(model.components).length) {
    const decls = [];
    for (const [n, def] of Object.entries(model.components)) {
      if (!isObj(def)) continue;
      for (const [k, v] of Object.entries(def)) {
        if (k === 'typography') continue;
        const value = val(v, k);
        if (value !== null) decls.push(`  --${kebab(n)}-${kebab(k)}: ${value};`);
      }
    }
    if (decls.length) css += `\n/* Component tokens (no Tailwind namespace; use as arbitrary values, e.g. bg-(--button-primary-background-color)) */\n:root {\n${decls.join('\n')}\n}\n`;
  }
  return css;
}

function toTailwindV3(model) {
  const lit = (v) => { const r = resolveRef(model, v); return r.ok ? r.value : undefined; };
  const extend = { colors: {}, fontFamily: {}, fontSize: {}, borderRadius: {}, spacing: {} };
  for (const [n, v] of Object.entries(model.colors)) { const x = lit(v); if (typeof x === 'string') extend.colors[n.replace(/\./g, '-')] = x; }
  for (const [n, def] of Object.entries(model.typography)) {
    if (!isObj(def)) continue;
    const fam = lit(def.fontFamily);
    if (typeof fam === 'string') extend.fontFamily[n] = fam.split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    const size = lit(def.fontSize);
    if (size !== undefined) {
      const meta = {};
      if (def.lineHeight !== undefined) meta.lineHeight = String(lit(def.lineHeight));
      if (def.letterSpacing !== undefined) meta.letterSpacing = String(lit(def.letterSpacing));
      if (def.fontWeight !== undefined) meta.fontWeight = String(lit(def.fontWeight));
      extend.fontSize[n] = [String(size), meta];
    }
  }
  for (const [n, v] of Object.entries(model.rounded)) { const x = lit(v); if (x !== undefined) extend.borderRadius[n.replace(/\./g, '-')] = String(x); }
  for (const [n, v] of Object.entries(model.spacing)) { const x = lit(v); if (typeof x === 'string') extend.spacing[n.replace(/\./g, '-')] = x; }
  for (const k of Object.keys(extend)) if (!Object.keys(extend[k]).length) delete extend[k];
  return `${JSON.stringify({ theme: { extend } }, null, 2)}\n`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Import: DTCG / CSS variables / token JSON → model
// ═══════════════════════════════════════════════════════════════════════════

const FONT_WEIGHT_ALIASES = { thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300, normal: 400, regular: 400, book: 400, medium: 500, 'semi-bold': 600, 'demi-bold': 600, bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900, 'extra-black': 950, 'ultra-black': 950 };
const TYPE_GROUP_NAMES = new Set(['color', 'colors', 'colour', 'colours', 'spacing', 'space', 'size', 'sizes', 'sizing', 'radius', 'radii', 'rounded', 'border-radius', 'typography', 'font', 'fonts', 'text', 'type', 'dimension', 'dimensions']);
const RADIUS_RE = /(^|[-.])(radius|radii|rounded|corner|corners|border-radius)([-.]|$)/i;

function emptyModel(name) {
  return { version: SPEC.designMd, name, description: undefined, omitted: undefined, colors: {}, typography: {}, rounded: {}, spacing: {}, components: {}, extensions: {} };
}

function dtcgColorToCss(v, ext) {
  if (ext && typeof ext.css === 'string') return ext.css;
  if (typeof v === 'string') return v; // older drafts used CSS strings
  if (!isObj(v)) return null;
  const a = v.alpha === undefined ? 1 : v.alpha;
  const comps = (v.components || []).map((x) => (x === 'none' ? 0 : x));
  if (v.colorSpace === 'srgb' && comps.length === 3) {
    const c = makeColor(comps[0] * 255, comps[1] * 255, comps[2] * 255, a);
    return a < 1 ? `${c.hex}${hex2(a * 255)}` : c.hex;
  }
  const alphaPart = a < 1 ? ` / ${round(a, 3)}` : '';
  const fmt = { hsl: (c) => `hsl(${c[0]} ${c[1]}% ${c[2]}%`, hwb: (c) => `hwb(${c[0]} ${c[1]}% ${c[2]}%`, lab: (c) => `lab(${c[0]} ${c[1]} ${c[2]}`, lch: (c) => `lch(${c[0]} ${c[1]} ${c[2]}`, oklab: (c) => `oklab(${c[0]} ${c[1]} ${c[2]}`, oklch: (c) => `oklch(${c[0]} ${c[1]} ${c[2]}` };
  if (fmt[v.colorSpace] && comps.length === 3) return `${fmt[v.colorSpace](comps)}${alphaPart})`;
  if (typeof v.hex === 'string') return a < 1 ? `${v.hex.toLowerCase()}${hex2(a * 255)}` : v.hex.toLowerCase();
  return null;
}

const dimToString = (v) => (isObj(v) && typeof v.value === 'number' && typeof v.unit === 'string' ? `${v.value}${v.unit}` : (typeof v === 'string' ? v : null));

function fromDtcg(json, notes, name) {
  const model = emptyModel(name);
  const rootExt = json.$extensions && json.$extensions[EXT];
  if (rootExt) {
    for (const k of ['name', 'version', 'description', 'omitted']) if (rootExt[k] !== undefined) model[k] = rootExt[k];
    if (rootExt.extensions) model.extensions = rootExt.extensions;
  } else if (typeof json.$description === 'string') model.description = json.$description;
  const pathMap = {}; // DTCG path → DESIGN.md ref path
  const pending = []; // [group, name, prop|null, aliasPath]
  const tokens = [];
  const walk = (node, segs, inherited) => {
    const type = node.$type || inherited;
    for (const [k, child] of Object.entries(node)) {
      if (k.startsWith('$') && k !== '$root') continue;
      if (!isObj(child)) continue;
      const childSegs = k === '$root' ? segs : segs.concat(k);
      if (own(child, '$value')) tokens.push({ segs: childSegs, type: child.$type || type, token: child });
      else if (typeof child.$ref === 'string') tokens.push({ segs: childSegs, type: child.$type || type, token: Object.assign({}, child, { $value: { $ref: child.$ref } }) });
      else walk(child, childSegs, type);
    }
  };
  walk(json, [], undefined);

  // An alias without $type takes the type of the token it points to.
  const byPath = new Map(tokens.map((t) => [t.segs.join('.'), t]));
  const typeOf = (t, depth = 0) => {
    if (t.type || depth > 20) return t.type;
    const v = t.token.$value;
    let p = null;
    if (isRef(v)) p = refPath(v);
    else if (isObj(v) && typeof v.$ref === 'string') { const m = /^#\/(.+?)(?:\/\$value.*)?$/.exec(v.$ref); if (m) p = m[1].split('/').join('.'); }
    const target = p && byPath.get(p);
    return target ? typeOf(target, depth + 1) : undefined;
  };
  for (const t of tokens) t.type = typeOf(t);

  // Pass 1 — choose a destination for every token.
  const placed = [];
  for (const t of tokens) {
    const native = TOKEN_GROUPS.includes(t.segs[0]);
    let group = null;
    if (native && t.segs[0] !== 'components') group = t.segs[0];
    else if (native) group = 'components';
    else if (t.type === 'color') group = 'colors';
    else if (t.type === 'typography') group = 'typography';
    else if (t.type === 'dimension') group = RADIUS_RE.test(t.segs.join('.')) ? 'rounded' : 'spacing';
    else if (t.type === 'number' && /spac|space|size|grid/i.test(t.segs.join('.'))) group = 'spacing';
    if (!group) { notes.push(`${t.segs.join('.')}: DTCG type "${t.type || 'unknown'}" has no DESIGN.md equivalent — skipped`); continue; }
    let tname;
    if (group === 'components') {
      if (t.segs.length !== 3) { notes.push(`${t.segs.join('.')}: component tokens must be components.<name>.<property> — skipped`); continue; }
    } else if (native) tname = t.segs.slice(1).join('.');
    else {
      const rest = TYPE_GROUP_NAMES.has(t.segs[0].toLowerCase()) && t.segs.length > 1 ? t.segs.slice(1) : t.segs;
      tname = rest.join('-');
    }
    if (group !== 'components') pathMap[t.segs.join('.')] = `${group}.${tname}`;
    else pathMap[t.segs.join('.')] = t.segs.join('.');
    placed.push(Object.assign({ group, tname }, t));
  }
  const mapAlias = (v) => {
    if (isObj(v) && typeof v.$ref === 'string') {
      const m = /^#\/(.+?)(?:\/\$value(?:\/([^/]+))?)?$/.exec(v.$ref);
      const target = m && pathMap[m[1].split('/').join('.')];
      if (!target) return undefined;
      return m[2] ? `{${target}.${m[2]}}` : `{${target}}`;
    }
    if (!isRef(v)) return v;
    const target = pathMap[refPath(v)];
    return target ? `{${target}}` : undefined;
  };
  // Pass 2 — convert values.
  for (const t of placed) {
    const ext = t.token.$extensions && t.token.$extensions[EXT];
    const where = t.segs.join('.');
    let v = t.token.$value;
    if (isRef(v) || (isObj(v) && v.$ref)) {
      const mapped = mapAlias(v);
      if (mapped === undefined) { notes.push(`${where}: alias ${JSON.stringify(v)} points outside the imported tokens — skipped`); continue; }
      v = mapped;
      if (t.group === 'components') { model.components[t.segs[1]] = model.components[t.segs[1]] || {}; model.components[t.segs[1]][t.segs[2]] = v; } else model[t.group][t.tname] = v;
      continue;
    }
    if (t.group === 'colors') {
      const css = dtcgColorToCss(v, ext);
      if (css === null) { notes.push(`${where}: unsupported colour value — skipped`); continue; }
      model.colors[t.tname] = css;
    } else if (t.group === 'rounded' || t.group === 'spacing') {
      if (ext && ext.css !== undefined) model[t.group][t.tname] = ext.css;
      else if (typeof v === 'number') model[t.group][t.tname] = v;
      else { const d = dimToString(v); if (d === null) { notes.push(`${where}: unsupported dimension — skipped`); continue; } model[t.group][t.tname] = d; }
    } else if (t.group === 'typography') {
      if (ext && isObj(ext.designMd)) { model.typography[t.tname] = Object.assign({}, ext.designMd); continue; }
      if (!isObj(v)) { notes.push(`${where}: typography value must be an object — skipped`); continue; }
      const def = {};
      const conv = (x, fn) => { if (isRef(x) || (isObj(x) && x.$ref)) return mapAlias(x); return fn(x); };
      if (v.fontFamily !== undefined) def.fontFamily = conv(v.fontFamily, (x) => (Array.isArray(x) ? x.join(', ') : String(x)));
      if (v.fontSize !== undefined) def.fontSize = conv(v.fontSize, dimToString);
      if (v.fontWeight !== undefined) def.fontWeight = conv(v.fontWeight, (x) => (typeof x === 'number' ? x : FONT_WEIGHT_ALIASES[x]));
      if (v.lineHeight !== undefined) def.lineHeight = conv(v.lineHeight, (x) => (typeof x === 'number' ? x : dimToString(x)));
      if (v.letterSpacing !== undefined) def.letterSpacing = conv(v.letterSpacing, dimToString);
      for (const k of Object.keys(def)) if (def[k] === undefined || def[k] === null) delete def[k];
      model.typography[t.tname] = def;
    } else if (t.group === 'components') {
      const [, comp, prop] = t.segs;
      model.components[comp] = model.components[comp] || {};
      if (t.type === 'color') model.components[comp][prop] = dtcgColorToCss(v, ext);
      else if (t.type === 'dimension') model.components[comp][prop] = dimToString(v);
      else model.components[comp][prop] = typeof v === 'object' ? JSON.stringify(v) : v;
    }
  }
  // Component properties DTCG could not express travel in $extensions.
  const compGroup = json.components;
  if (isObj(compGroup)) {
    for (const [comp, g] of Object.entries(compGroup)) {
      const ext = isObj(g) && g.$extensions && g.$extensions[EXT];
      if (!ext || !ext.unmapped) continue;
      const merged = Object.assign(model.components[comp] || {}, ext.unmapped);
      const ordered = {};
      for (const n of (Array.isArray(ext.order) ? ext.order : []).concat(Object.keys(merged))) if (own(merged, n) && !own(ordered, n)) ordered[n] = merged[n];
      model.components[comp] = ordered;
    }
  }
  for (const g of ['colors', 'rounded', 'spacing']) {
    const ext = isObj(json[g]) && json[g].$extensions && json[g].$extensions[EXT];
    if (!ext || !ext.unmapped) continue;
    Object.assign(model[g], ext.unmapped);
    if (Array.isArray(ext.order)) {
      const ordered = {};
      for (const n of ext.order.concat(Object.keys(model[g]))) if (own(model[g], n) && !own(ordered, n)) ordered[n] = model[g][n];
      model[g] = ordered;
    }
  }
  return model;
}

function parseCssVars(css, notes) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack = [];
  const vars = [];
  let buf = '';
  let skipped = 0;
  const flush = () => {
    for (const decl of buf.split(';')) {
      const m = /^\s*(--[A-Za-z0-9_-]+)\s*:\s*([\s\S]+?)\s*$/.exec(decl);
      if (!m) continue;
      const ctx = stack.join(' > ');
      if (stack.length === 1 && /^(:root|html)(\s*,\s*(:root|html))*$/i.test(stack[0].trim())) vars.push([m[1].slice(2), m[2].replace(/\s*!important$/, '')]);
      else if (ctx) skipped++;
    }
    buf = '';
  };
  for (const ch of src) {
    if (ch === '{') { stack.push(buf.trim()); buf = ''; } else if (ch === '}') { flush(); stack.pop(); } else buf += ch;
  }
  if (skipped) notes.push(`${skipped} custom properties outside a top-level :root rule (dark mode, media queries, scoped themes) were not imported — DESIGN.md has no modes; describe them in prose or a page override`);
  return vars;
}

const COMPONENT_WORDS = 'btn|button|card|input|field|textfield|nav|navbar|chip|badge|tag|tooltip|modal|dialog|toast|alert|tab|tabs|menu|select|checkbox|radio|switch|toggle|list|table|avatar|link|sidebar|header|footer|banner|popover|dropdown';
const COMPONENT_VAR_RE = new RegExp(`^((?:${COMPONENT_WORDS})(?:-[a-z0-9]+)*?)-(bg|background|text|fg|foreground|color|radius|padding-x|padding-y|padding|height|width|size)$`);
const COMPONENT_PROP_MAP = { bg: 'backgroundColor', background: 'backgroundColor', text: 'textColor', fg: 'textColor', foreground: 'textColor', color: 'textColor', radius: 'rounded', padding: 'padding', 'padding-x': 'paddingX', 'padding-y': 'paddingY', height: 'height', width: 'width', size: 'size' };

function fromCssVars(css, notes, name) {
  const model = emptyModel(name);
  const vars = parseCssVars(css, notes);
  const values = new Map(vars);
  const literal = (v, depth = 0) => {
    const m = /^var\(\s*--([A-Za-z0-9_-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(v.trim());
    if (!m || depth > 20) return v.trim();
    if (values.has(m[1])) return literal(values.get(m[1]), depth + 1);
    return m[2] !== undefined ? literal(m[2], depth + 1) : v.trim();
  };
  const isFamily = (v) => /[A-Za-z]/.test(v) && !parseDim(v) && !parseColor(v) && !/\(/.test(v);
  const strip = (n, re) => n.replace(re, '') || n;
  const dest = new Map(); // var name → { group, tname, prop? }
  for (const [n, v] of vars) {
    const lit = literal(v);
    const cm = COMPONENT_VAR_RE.exec(n);
    if (cm) { dest.set(n, { group: 'components', tname: cm[1], prop: COMPONENT_PROP_MAP[cm[2]] }); continue; }
    if (RADIUS_RE.test(n) && (parseDim(lit) || lit === '0')) { dest.set(n, { group: 'rounded', tname: strip(n, /^(border-radius|radius|radii|rounded)-/) }); continue; }
    if (parseColor(lit)) { dest.set(n, { group: 'colors', tname: strip(n, /^(color|colour)-/) }); continue; }
    if (/^(space|spacing|gap|gutter|size|sizing|layout|container|breakpoint|margin|padding)(-|$)/.test(n) && (parseDim(lit) || NUM_RE.test(lit))) { dest.set(n, { group: 'spacing', tname: strip(n, /^(spacing|space)-/) }); continue; }
    if (/^(font-size|text|fs|type-size)-/.test(n) && parseDim(lit)) { dest.set(n, { group: 'typography', tname: strip(n, /^(font-size|text|fs|type-size)-/), prop: 'fontSize' }); continue; }
    if (/^(font-weight|fw|weight)-/.test(n) && NUM_RE.test(lit)) { dest.set(n, { group: 'typography', tname: strip(n, /^(font-weight|fw|weight)-/), prop: 'fontWeight' }); continue; }
    if (/^(leading|line-height|lh)-/.test(n) && (NUM_RE.test(lit) || parseDim(lit))) { dest.set(n, { group: 'typography', tname: strip(n, /^(leading|line-height|lh)-/), prop: 'lineHeight' }); continue; }
    if (/^(tracking|letter-spacing)-/.test(n) && parseDim(lit)) { dest.set(n, { group: 'typography', tname: strip(n, /^(tracking|letter-spacing)-/), prop: 'letterSpacing' }); continue; }
    if (/^(font-family|font|ff|typeface)-/.test(n) && isFamily(lit)) { dest.set(n, { group: 'typography', tname: strip(n, /^(font-family|font|ff|typeface)-/), prop: 'fontFamily' }); continue; }
    notes.push(`--${n}: no DESIGN.md token group fits "${v}" — listed under Additional tokens`);
    model.extensions.__unmapped = model.extensions.__unmapped || [];
    model.extensions.__unmapped.push([n, v]);
  }
  const refFor = (v) => {
    const m = /^var\(\s*--([A-Za-z0-9_-]+)\s*\)$/.exec(v.trim());
    if (!m || !dest.has(m[1])) return null;
    const d = dest.get(m[1]);
    if (d.group === 'components' || d.group === 'typography') return null;
    return `{${d.group}.${d.tname}}`;
  };
  for (const [n, v] of vars) {
    const d = dest.get(n);
    if (!d) continue;
    const lit = literal(v);
    if (d.group === 'components') {
      const comp = (model.components[d.tname] = model.components[d.tname] || {});
      comp[d.prop] = refFor(v) || lit;
    } else if (d.group === 'typography') {
      const t = (model.typography[d.tname] = model.typography[d.tname] || {});
      t[d.prop] = d.prop === 'fontWeight' || (d.prop === 'lineHeight' && NUM_RE.test(lit)) ? Number(lit) : lit;
    } else {
      const ref = refFor(v);
      let value = ref && ref.startsWith(`{${d.group}.`) ? ref : lit;
      if ((d.group === 'spacing' || d.group === 'rounded') && value === '0') value = '0px';
      if (d.group === 'spacing' && NUM_RE.test(String(value))) value = Number(value);
      model[d.group][d.tname] = value;
    }
  }
  // --x-padding-x / --x-padding-y collapse into the single `padding` property.
  for (const comp of Object.values(model.components)) {
    if (comp.paddingX === undefined && comp.paddingY === undefined) continue;
    const lit = (v) => (isRef(v) ? resolveRef(model, v).value : v);
    if (comp.padding === undefined) comp.padding = `${lit(comp.paddingY !== undefined ? comp.paddingY : '0px')} ${lit(comp.paddingX !== undefined ? comp.paddingX : '0px')}`;
    delete comp.paddingX;
    delete comp.paddingY;
  }
  return model;
}

// DESIGN.md requires a `primary` colour. When an import has none, alias the most
// likely brand colour rather than inventing a value.
function ensurePrimary(model, notes) {
  if (!Object.keys(model.colors).length || own(model.colors, 'primary')) return model;
  const pick = ['brand', 'brand-primary', 'interactive-primary', 'brand-600', 'brand-500', 'accent'].find((n) => own(model.colors, n));
  if (pick) {
    model.colors = Object.assign({ primary: `{colors.${pick}}` }, model.colors);
    notes.push(`no "primary" colour in the source — added primary: "{colors.${pick}}"; change it if another colour leads`);
  }
  return model;
}

function fromTokensFile(content, file, opts, notes) {
  return ensurePrimary(importTokens(content, file, opts, notes), notes);
}

function importTokens(content, file, opts, notes) {
  const name = opts.name || (file && file !== '-' ? path.basename(file).replace(/(\.(tokens|dtcg))?\.(json|css|scss|txt|tokens)$/i, '') : 'Design System');
  let kind = opts.from;
  if (!kind) {
    const trimmed = content.trim();
    if (/\.(css|scss)$/i.test(file || '') || (!trimmed.startsWith('{') && /--[A-Za-z0-9_-]+\s*:/.test(trimmed))) kind = 'css';
    else kind = /"\$value"\s*:/.test(content) ? 'dtcg' : 'json';
  }
  if (kind === 'css') return fromCssVars(content, notes, name);
  let json;
  try { json = JSON.parse(content); } catch (e) { throw new DesignMdError(`input is not valid JSON: ${e.message}`); }
  if (!isObj(json)) throw new DesignMdError('token JSON must be an object');
  if (kind === 'dtcg') return fromDtcg(json, notes, opts.name || (json.$extensions && json.$extensions[EXT] && json.$extensions[EXT].name) || name);
  if (kind !== 'json') throw new UsageError(`--from must be dtcg, css or json (got "${kind}")`);
  // Plain token JSON shaped like a DESIGN.md token tree (e.g. `parse` output).
  const tree = Object.assign({}, json);
  delete tree.sections; delete tree.spec;
  const issues = [];
  const model = buildModel(tree, issues);
  if (!model.name) model.name = name;
  if (!model.version) model.version = SPEC.designMd;
  for (const i of issues) notes.push(`${i.path}: ${i.message}`);
  return model;
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN.md writer
// ═══════════════════════════════════════════════════════════════════════════

function yamlKey(k) {
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(k) && !/^(true|false|null|yes|no|on|off|y|n)$/i.test(k) ? k : JSON.stringify(String(k));
}

function yamlScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  const plain = /^[A-Za-z0-9_(][A-Za-z0-9_ .,()%+-]*$/.test(s) && !/\s$/.test(s) && !NUM_RE.test(s) && !/^(true|false|null|yes|no|on|off|y|n|~)$/i.test(s);
  return plain ? s : JSON.stringify(s);
}

function yamlLines(value, indent, out) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isObj(item)) {
        const entries = Object.entries(item);
        entries.forEach(([k, v], idx) => {
          const lead = idx === 0 ? `${pad}- ` : `${pad}  `;
          if (isObj(v) || Array.isArray(v)) { out.push(`${lead}${yamlKey(k)}:`); yamlLines(v, indent + 4, out); } else out.push(`${lead}${yamlKey(k)}: ${yamlScalar(v)}`);
        });
      } else out.push(`${pad}- ${yamlScalar(item)}`);
    }
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if (isObj(v) && Object.keys(v).length) { out.push(`${pad}${yamlKey(k)}:`); yamlLines(v, indent + 2, out); } else if (Array.isArray(v) && v.length) { out.push(`${pad}${yamlKey(k)}:`); yamlLines(v, indent + 2, out); } else if (isObj(v)) out.push(`${pad}${yamlKey(k)}: {}`);
    else if (Array.isArray(v)) out.push(`${pad}${yamlKey(k)}: []`);
    else out.push(`${pad}${yamlKey(k)}: ${yamlScalar(v)}`);
  }
}

function modelToTree(model) {
  const tree = {};
  for (const k of ['version', 'name', 'description']) if (model[k] !== undefined && model[k] !== null) tree[k] = model[k];
  if (model.omitted && model.omitted.length) tree.omitted = model.omitted.map((o) => (o.reason ? { section: o.section, reason: o.reason } : o.section));
  for (const g of TOKEN_GROUPS) if (Object.keys(model[g]).length) tree[g] = model[g];
  for (const [k, v] of Object.entries(model.extensions)) if (!k.startsWith('__')) tree[k] = v;
  return tree;
}

function describeTypo(def) {
  if (!isObj(def)) return String(def);
  return [def.fontFamily, def.fontSize, def.fontWeight !== undefined ? `weight ${def.fontWeight}` : null, def.lineHeight !== undefined ? `line-height ${def.lineHeight}` : null, def.letterSpacing !== undefined ? `tracking ${def.letterSpacing}` : null].filter((x) => x !== undefined && x !== null).join(' · ');
}

function generatedProse(model, source) {
  const s = [];
  const note = `<!-- Generated by naksha design-md.js${source ? ` from ${source}` : ''}. Replace these notes with design rationale: the tokens are normative, the prose explains how to apply them. -->`;
  s.push({ heading: 'Overview', body: `${note}\n\n${model.description || `${model.name || 'This design system'} — describe the brand personality, audience and the feel the UI should have.`}` });
  const list = (obj, fmt) => Object.entries(obj).map(([n, v]) => `- **${n}**: ${fmt(v)}`).join('\n');
  if (Object.keys(model.colors).length) s.push({ heading: 'Colors', body: list(model.colors, (v) => `\`${v}\``) });
  if (Object.keys(model.typography).length) s.push({ heading: 'Typography', body: list(model.typography, describeTypo) });
  if (Object.keys(model.spacing).length) s.push({ heading: 'Layout', body: list(model.spacing, (v) => `\`${v}\``) });
  const unmapped = model.extensions.__unmapped || [];
  const shadows = unmapped.filter(([n]) => /shadow|elevation/i.test(n));
  if (shadows.length) s.push({ heading: 'Elevation & Depth', body: shadows.map(([n, v]) => `- **${n}**: \`${v}\``).join('\n') });
  if (Object.keys(model.rounded).length) s.push({ heading: 'Shapes', body: list(model.rounded, (v) => `\`${v}\``) });
  if (Object.keys(model.components).length) s.push({ heading: 'Components', body: list(model.components, (d) => (isObj(d) ? Object.entries(d).map(([k, v]) => `${k} \`${v}\``).join(', ') : String(d))) });
  s.push({ heading: "Do's and Don'ts", body: '- Do keep text at WCAG AA contrast or better (4.5:1 for body text, 3:1 for large text).\n- Do use tokens instead of hard-coded values.\n- Don\'t introduce colours, radii or type sizes that are not defined above.' });
  const rest = unmapped.filter(([n]) => !/shadow|elevation/i.test(n));
  if (rest.length) s.push({ heading: 'Additional tokens', body: `Values from the source that have no DESIGN.md token group:\n\n${rest.map(([n, v]) => `- \`--${n}\`: \`${v}\``).join('\n')}` });
  return s;
}

function toDesignMd(model, opts = {}) {
  const out = ['---'];
  yamlLines(modelToTree(model), 0, out);
  out.push('---', '');
  const prose = opts.prose && opts.prose.length ? opts.prose : generatedProse(model, opts.source);
  const hasH1 = prose.some((p) => p.heading === '' && /^# /m.test(p.body));
  if (!hasH1 && model.name) out.push(`# ${model.name}`, '');
  for (const p of prose) {
    if (p.heading) out.push(`## ${p.heading}`, '');
    if (p.body) out.push(p.body, '');
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTER.md + page overrides
// ═══════════════════════════════════════════════════════════════════════════

function findDir(dir) {
  if (dir) return fs.existsSync(dir) ? dir : null;
  let cur = process.cwd();
  for (let k = 0; k <= 3; k++) {
    const cand = path.join(cur, DEFAULT_DIR);
    if (fs.existsSync(path.join(cand, 'MASTER.md'))) return cand;
    const up = path.dirname(cur);
    if (up === cur) break;
    cur = up;
  }
  return null;
}

function mergeEntry(base, over) {
  if (over === null) return undefined;
  if (isObj(base) && isObj(over)) {
    const out = Object.assign({}, base);
    for (const [k, v] of Object.entries(over)) { if (v === null) delete out[k]; else out[k] = v; }
    return out;
  }
  return over;
}

function mergeModels(master, page, provenance) {
  const m = JSON.parse(JSON.stringify(master));
  for (const g of TOKEN_GROUPS) {
    for (const [n, v] of Object.entries(page[g])) {
      const merged = mergeEntry(m[g][n], v);
      if (merged === undefined) { delete m[g][n]; delete provenance[`${g}.${n}`]; continue; }
      const partial = isObj(m[g][n]) && isObj(v) && Object.keys(m[g][n]).some((k) => !own(v, k));
      m[g][n] = merged;
      provenance[`${g}.${n}`] = partial ? 'page+master' : 'page';
    }
  }
  return m;
}

function sectionKey(h) { const c = canonicalSection(h); return c ? c.name : h.toLowerCase(); }

function mergeProse(master, page, label) {
  const out = master.map((s) => Object.assign({}, s));
  for (const s of page) {
    if (!s.heading) continue;
    const body = `<!-- from ${label}; replaces the MASTER.md section -->\n${s.body}`;
    const idx = out.findIndex((x) => x.heading && sectionKey(x.heading) === sectionKey(s.heading));
    if (idx >= 0) out[idx] = { heading: out[idx].heading, body };
    else out.push({ heading: s.heading, body });
  }
  return out;
}

function readFileOrThrow(file) {
  try { return file === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(file, 'utf8'); } catch (e) {
    const err = new UsageError(`cannot read ${file}: ${e.code || e.message}`);
    throw err;
  }
}

function resolveSystem(opts) {
  const dir = findDir(opts.dir);
  if (!dir) throw new UsageError(`no design system found — expected ${opts.dir ? path.join(opts.dir, 'MASTER.md') : `${DEFAULT_DIR}/MASTER.md`} (create it with: node scripts/design-md.js from-tokens <tokens> --out ${DEFAULT_DIR}/MASTER.md)`);
  const masterFile = path.join(dir, 'MASTER.md');
  if (!fs.existsSync(masterFile)) throw new UsageError(`${masterFile} not found`);
  const master = parseDesignMd(readFileOrThrow(masterFile));
  const provenance = {};
  for (const g of TOKEN_GROUPS) for (const n of Object.keys(master.model[g])) provenance[`${g}.${n}`] = 'master';
  let model = JSON.parse(JSON.stringify(master.model));
  let prose = master.prose;
  const warnings = master.warnings.slice();
  const issues = master.issues.slice();
  const sources = { master: masterFile, page: null, project: null };

  if (opts.page) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.page)) throw new UsageError(`page name "${opts.page}" must be a lowercase slug (letters, digits, hyphens)`);
    const pageFile = path.join(dir, 'pages', `${opts.page}.md`);
    if (fs.existsSync(pageFile)) {
      const page = parseDesignMd(readFileOrThrow(pageFile));
      model = mergeModels(model, page.model, provenance);
      prose = mergeProse(prose, page.prose, `pages/${opts.page}.md`);
      warnings.push(...page.warnings.map((w) => Object.assign({}, w, { path: `[page] ${w.path}` })));
      issues.push(...page.issues);
      sources.page = pageFile;
    }
  }

  // Brand defaults from .naksha/project.json fill gaps only (lowest precedence).
  if (opts.brand !== false) {
    const projectFile = path.join(path.dirname(dir), 'project.json');
    if (fs.existsSync(projectFile)) {
      try {
        const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
        const brand = project.brand || {};
        sources.project = projectFile;
        for (const [key, val] of [['primary', brand.primary], ['secondary', brand.secondary]]) {
          if (typeof val === 'string' && !own(model.colors, key)) { model.colors[key] = val; provenance[`colors.${key}`] = 'brand'; }
        }
        if (typeof brand.font === 'string') model.extensions.__brandFont = brand.font;
      } catch (e) {
        warnings.push({ severity: 'warning', rule: 'project-json', path: projectFile, message: `could not read brand defaults: ${e.message}` });
      }
    }
  }
  return { model, prose, warnings, issues, sources, provenance, sections: null, yamlBlocks: 1, keyLines: {} };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

const HELP = `design-md.js — DESIGN.md toolkit (DESIGN.md ${SPEC.designMd}, DTCG ${SPEC.dtcg})

Commands:
  parse <file|->                 print normalized tokens as JSON (--resolve adds resolved colours)
  lint <file|->                  validate structure, references and WCAG contrast
                                 --json  --strict (warnings fail)  --level AA|AAA  --verbose (show info)
  export --to <target> <file|->  dtcg | css | tailwind (v4 @theme) | tailwind-v3 (theme.extend JSON)
                                 --prefix <p> namespaces css variables
  from-tokens <file|->           DTCG JSON, CSS custom properties or token JSON → DESIGN.md
                                 --from dtcg|css|json  --name "<system name>"
  resolve                        merge MASTER.md + page override (+ brand defaults) → JSON or DESIGN.md
                                 --page <name>  --format json|md  --no-brand

Sources: parse, lint and export take a file, or --page <name> / --dir <dir> to use
${DEFAULT_DIR}/MASTER.md merged with pages/<name>.md (page override > master > brand defaults).
All commands: --out <file> writes the result to a file.

Exit codes: 0 ok · 1 invalid document / lint errors / failed conversion · 2 usage or unreadable input`;

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  const valued = new Set(['to', 'from', 'name', 'out', 'prefix', 'level', 'dir', 'page', 'format']);
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '-') { args._.push(a); continue; }
    if (a.startsWith('--')) {
      const [key, inline] = a.slice(2).split(/=(.*)/s);
      if (valued.has(key)) {
        const v = inline !== undefined ? inline : argv[++k];
        if (v === undefined) throw new UsageError(`--${key} needs a value`);
        args.flags[key] = v;
      } else args.flags[key] = true;
    } else args._.push(a);
  }
  return args;
}

function loadSource(args) {
  const file = args._[1];
  if (file) {
    const parsed = parseDesignMd(readFileOrThrow(file));
    return Object.assign(parsed, { label: file === '-' ? 'stdin' : file, merged: false });
  }
  if (args.flags.page || args.flags.dir) {
    const sys = resolveSystem({ dir: args.flags.dir, page: args.flags.page, brand: !args.flags['no-brand'] });
    return Object.assign(sys, { label: sys.sources.page ? `${sys.sources.master} + ${sys.sources.page}` : sys.sources.master, merged: true });
  }
  throw new UsageError(`${args._[0]} needs a DESIGN.md file (or --page <name> / --dir <dir>)`);
}

function publicModel(model) {
  const out = { spec: `DESIGN.md ${SPEC.designMd}` };
  const tree = modelToTree(model);
  return Object.assign(out, tree);
}

function emit(text, flags) {
  if (flags.out) {
    fs.mkdirSync(path.dirname(path.resolve(flags.out)), { recursive: true });
    fs.writeFileSync(flags.out, text);
    process.stderr.write(`wrote ${flags.out}\n`);
  } else process.stdout.write(text);
}

function formatFindings(report, label, level, verbose) {
  const lines = [`DESIGN.md lint — ${label} (spec ${SPEC.designMd}, WCAG ${level})`];
  for (const f of report.findings) {
    if (f.severity === 'info' && !verbose) continue;
    lines.push(`  ${f.severity.padEnd(7)} ${f.rule.padEnd(26)} ${f.path || '(document)'}${f.line ? ` [line ${f.line}]` : ''}`);
    lines.push(`          ${f.message}`);
  }
  const { errors, warnings, infos } = report.summary;
  lines.push(`${errors} error(s), ${warnings} warning(s), ${infos} info${infos && !verbose ? ' (shown with --verbose)' : ''}`);
  return `${lines.join('\n')}\n`;
}

function run(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  const flags = args.flags;
  if (flags.version || cmd === 'version') { process.stdout.write(`${JSON.stringify(SPEC, null, 2)}\n`); return 0; }
  if (!cmd || flags.help || cmd === 'help') { process.stdout.write(`${HELP}\n`); return cmd || flags.help ? 0 : 2; }

  if (cmd === 'parse') {
    const src = loadSource(args);
    const out = publicModel(src.model);
    if (src.sections) out.sections = src.sections.map((s) => ({ heading: s.heading, canonical: s.canonical, line: s.line }));
    if (src.provenance) { out.sources = src.sources; out.provenance = src.provenance; }
    if (flags.resolve) {
      out.resolved = { colors: {} };
      for (const n of Object.keys(src.model.colors)) {
        const c = resolvedColor(src.model, src.model.colors[n]);
        out.resolved.colors[n] = c ? { hex: c.hex, alpha: round(c.alpha, 3) } : null;
      }
    }
    for (const w of src.warnings) process.stderr.write(`warning: ${w.message}${w.line ? ` (line ${w.line})` : ''}\n`);
    emit(`${JSON.stringify(out, null, 2)}\n`, flags);
    return src.issues.some((i) => i.severity === 'error') ? 1 : 0;
  }

  if (cmd === 'lint') {
    const level = String(flags.level || 'AA').toUpperCase();
    if (!['AA', 'AAA'].includes(level)) throw new UsageError('--level must be AA or AAA');
    const src = loadSource(args);
    const report = lintModel(src, { level, merged: src.merged, page: false });
    const out = flags.json ? `${JSON.stringify(Object.assign({ file: src.label, spec: SPEC.designMd, level }, report), null, 2)}\n` : formatFindings(report, src.label, level, flags.verbose);
    emit(out, flags);
    if (report.summary.errors > 0) return 1;
    if (flags.strict && report.summary.warnings > 0) return 1;
    return 0;
  }

  if (cmd === 'export') {
    const to = flags.to;
    if (!['dtcg', 'css', 'tailwind', 'tailwind-v3'].includes(to)) throw new UsageError('export needs --to dtcg|css|tailwind|tailwind-v3');
    const src = loadSource(args);
    const errors = src.issues.filter((i) => i.severity === 'error');
    if (errors.length) { for (const e of errors) process.stderr.write(`error: ${e.path}: ${e.message}\n`); return 1; }
    const notes = [];
    let text;
    if (to === 'dtcg') text = `${JSON.stringify(toDtcg(src.model, notes), null, 2)}\n`;
    else if (to === 'css') text = toCss(src.model, { prefix: flags.prefix });
    else if (to === 'tailwind') text = toTailwindV4(src.model);
    else text = toTailwindV3(src.model);
    for (const n of notes) process.stderr.write(`note: ${n}\n`);
    emit(text, flags);
    return 0;
  }

  if (cmd === 'from-tokens') {
    const file = args._[1];
    if (!file) throw new UsageError('from-tokens needs a tokens.json, CSS file or -');
    const notes = [];
    const model = fromTokensFile(readFileOrThrow(file), file, { from: flags.from, name: flags.name }, notes);
    const count = TOKEN_GROUPS.reduce((n, g) => n + Object.keys(model[g]).length, 0);
    for (const n of notes) process.stderr.write(`note: ${n}\n`);
    if (!count) { process.stderr.write('error: no tokens could be imported\n'); return 1; }
    emit(toDesignMd(model, { source: file === '-' ? 'stdin' : path.basename(file) }), flags);
    return 0;
  }

  if (cmd === 'resolve') {
    const sys = resolveSystem({ dir: flags.dir, page: flags.page, brand: !flags['no-brand'] });
    const format = flags.format || 'json';
    if (format === 'md') {
      const model = Object.assign({}, sys.model, { extensions: Object.assign({}, sys.model.extensions) });
      emit(toDesignMd(model, { prose: sys.prose }), flags);
    } else if (format === 'json') {
      const out = {
        sources: sys.sources,
        precedence: ['page override', 'MASTER.md', 'brand defaults (.naksha/project.json)'],
        tokens: publicModel(sys.model),
        provenance: sys.provenance,
      };
      if (sys.model.extensions.__brandFont) out.brandFont = sys.model.extensions.__brandFont;
      emit(`${JSON.stringify(out, null, 2)}\n`, flags);
    } else throw new UsageError('--format must be json or md');
    return sys.issues.some((i) => i.severity === 'error') ? 1 : 0;
  }

  throw new UsageError(`unknown command "${cmd}" (run with --help)`);
}

function main() {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (e) {
    if (e instanceof UsageError) { process.stderr.write(`design-md: ${e.message}\n`); process.exitCode = 2; return; }
    if (e instanceof DesignMdError) { process.stderr.write(`design-md: ${e.message}\n`); process.exitCode = 1; return; }
    process.stderr.write(`design-md: unexpected error: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  SPEC,
  parseYaml,
  extractMarkdown,
  parseDesignMd,
  lintModel,
  parseColor,
  contrastRatio,
  pairContrast,
  toDtcg,
  toCss,
  toTailwindV4,
  toTailwindV3,
  fromDtcg,
  fromCssVars,
  fromTokensFile,
  toDesignMd,
  resolveSystem,
  mergeModels,
  run,
  DesignMdError,
  UsageError,
};
