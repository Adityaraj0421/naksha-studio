#!/usr/bin/env node
'use strict';
/**
 * Naksha — Design Lint (free, deterministic eval tier)
 *
 * Checks HTML, CSS/SCSS and component files (JSX/TSX/Vue/Svelte) for design
 * quality issues with plain static analysis: no network, no LLM, no
 * dependencies. Every rule has an id, a severity, a message and a fix hint.
 *
 * Usage:
 *   node scripts/design-lint.js [files...] [--json] [--rules a,b] [--report | --no-report]
 *   node scripts/design-lint.js --list-rules [--json]
 *   CHANGED_FILES="a.html b.css" node scripts/design-lint.js   # CI mode
 *   node scripts/design-lint.js                                # scan src/, public/, dist/, .
 *
 * Exit codes: 0 clean (warnings allowed), 1 errors found or score below
 * failThreshold, 2 bad usage (unknown flag or rule, missing file).
 *
 * Configuration: .design-lint.json in the working directory (optional).
 * Project memory: constraints.grid / min_contrast_ratio / accessibility_target
 * and brand colors are read from .naksha/project.json (cwd or up to 3 parents).
 * Output: console, or JSON on stdout with --json. design-lint-report.json, which
 * the design-check workflow turns into a PR comment, is written only in CI mode
 * (CHANGED_FILES set) or with --report, so local runs leave no file behind;
 * --json and --no-report never write it.
 *
 * Also used as a library by scripts/design-lint-hook.js and the unit tests.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  failThreshold: 70,      // score below this fails CI
  warnOnTokens: true,     // hardcoded colors, off-grid spacing, inline styles
  checkContrast: true,    // WCAG text contrast from CSS color pairs
  checkSemantic: true,    // semantic HTML, alt text, labels, clickable divs
  checkFocus: true,       // focus-visible styles
  checkResponsive: true,  // viewport, fixed widths, breakpoints
  checkTypography: true,  // type scale and number of font sizes
  checkMotion: true,      // prefers-reduced-motion
  checkSlop: true,        // generic "AI template" clichés
  maxFontSizes: 8,        // more distinct font sizes than this in one file is a warning
  typeScale: null,        // optional explicit list of allowed font sizes in px
  grid: null,             // spacing grid in px; defaults to project memory, then 4
  contrastMin: null,      // overrides the 4.5:1 AA floor for normal text
  rules: {},              // per-rule override: { "rule-id": "off" | "error" | "warning" }
  hook: true,             // set false to silence the PostToolUse lint hook
  ignorePatterns: [],     // simple globs: "dir/**", "dir/", "*.min.html", exact paths
};

const REPORT_FILE = 'design-lint-report.json';
const SUPPORTED_EXT = /\.(html?|css|scss|jsx|tsx|vue|svelte)$/i;

function loadConfig(cwd) {
  const configPath = path.join(cwd || process.cwd(), '.design-lint.json');
  if (fs.existsSync(configPath)) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
    } catch {
      process.stderr.write('Warning: could not parse .design-lint.json, using defaults\n');
    }
  }
  return { ...DEFAULT_CONFIG };
}

/** Finds .naksha/project.json in cwd or up to 3 parent directories. */
function loadProject(cwd) {
  let dir = path.resolve(cwd || process.cwd());
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, '.naksha', 'project.json');
    if (fs.existsSync(candidate)) {
      try { return JSON.parse(fs.readFileSync(candidate, 'utf-8')); } catch { return null; }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function toPx(raw) {
  if (typeof raw === 'number' && isFinite(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^(\d*\.?\d+)\s*(px|rem)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] && m[2].toLowerCase() === 'rem' ? n * 16 : n;
}

function resolveSettings(config, project) {
  const constraints = (project && project.constraints) || {};
  const grid = toPx(config.grid) || toPx(constraints.grid) || 4;
  let contrastMin = Number(config.contrastMin) || 0;
  let contrastLarge = 3;
  if (!contrastMin) {
    const target = String(constraints.accessibility_target || '').toUpperCase();
    if (target.includes('AAA')) { contrastMin = 7; contrastLarge = 4.5; }
    const fromMemory = Number(constraints.min_contrast_ratio);
    if (fromMemory > (contrastMin || 0)) contrastMin = fromMemory;
  }
  if (!contrastMin) contrastMin = 4.5;
  const brand = (project && project.brand) || {};
  const brandColors = [brand.primary, brand.secondary].map(c => parseColor(c)).filter(Boolean);
  return { grid, contrastMin, contrastLarge: Math.min(contrastLarge, contrastMin), brandColors };
}

// ─── File collection ──────────────────────────────────────────────────────────

function globToRegex(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*' && pattern[i + 1] === '*') { re += '.*'; i++; if (pattern[i + 1] === '/') i++; }
    else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}

function matchesIgnore(relPath, pattern) {
  const norm = relPath.replace(/\\/g, '/');
  const pat = pattern.replace(/\\/g, '/');
  if (pat.endsWith('/**')) {
    const dir = pat.slice(0, -3);
    return norm === dir || norm.startsWith(dir + '/');
  }
  if (pat.endsWith('/')) {
    const dir = pat.slice(0, -1);
    return norm === dir || norm.startsWith(dir + '/');
  }
  if (pat.includes('*') || pat.includes('?')) {
    const re = globToRegex(pat);
    // A pattern without a slash ("*.min.html") matches the basename anywhere.
    return re.test(norm) || (!pat.includes('/') && re.test(norm.split('/').pop()));
  }
  return norm === pat;
}

function scanDir(dir, result, depth = 0) {
  if (depth > 4) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanDir(full, result, depth + 1);
    else if (SUPPORTED_EXT.test(entry.name)) result.push(full);
  }
}

function classifyFile(file) {
  if (/\.html?$/i.test(file)) return 'html';
  if (/\.(css|scss)$/i.test(file)) return 'css';
  if (/\.(jsx|tsx|vue|svelte)$/i.test(file)) return 'component';
  return null;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

/** Replaces every character except newlines with a space, so indices and line numbers survive. */
function blank(str) {
  return str.replace(/[^\n]/g, ' ');
}

function makeLineOf(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') starts.push(i + 1);
  return index => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * Finds opening tags by name, honoring quotes and JSX braces so that
 * `onClick={() => a > b}` does not end the tag early.
 * Returns [{ name, attrs, index, end }].
 */
function findTags(markup, names) {
  const out = [];
  const re = new RegExp('<(' + names.join('|') + ')(?=[\\s/>])', 'gi');
  let m;
  while ((m = re.exec(markup))) {
    let i = m.index + m[0].length;
    let quote = null, brace = 0;
    for (; i < markup.length; i++) {
      const ch = markup[i];
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'" || (ch === '`' && brace > 0)) { quote = ch; continue; }
      if (ch === '{') brace++;
      else if (ch === '}') brace = Math.max(0, brace - 1);
      else if (ch === '>' && brace === 0) break;
    }
    out.push({ name: m[1].toLowerCase(), rawName: m[1], attrs: markup.slice(m.index + m[0].length, i), index: m.index, end: i + 1 });
    re.lastIndex = i;
  }
  return out;
}

// In JSX/Vue/Svelte a capitalized tag (<Img>, <Button>) is a component, not the element.
function tagsNamed(ctx, names) {
  return ctx.allTags.filter(t => names.includes(t.name) && (ctx.type !== 'component' || t.rawName === t.name));
}

function attrValue(attrs, names) {
  const re = new RegExp('(?:^|\\s)(?:' + names.join('|') + ')\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|\\{\\s*["\'`]([^"\'`]*)["\'`]\\s*\\}|\\{([^}]*)\\})', 'i');
  const m = attrs.match(re);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
}

function hasAttr(attrs, names) {
  return new RegExp('(?:^|\\s)(?:' + names.join('|') + ')(?=\\s*=|\\s|/|$)', 'i').test(attrs);
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const NAMED_COLORS = {
  black: '000000', white: 'ffffff', red: 'ff0000', green: '008000', blue: '0000ff',
  yellow: 'ffff00', orange: 'ffa500', purple: '800080', gray: '808080', grey: '808080',
  silver: 'c0c0c0', maroon: '800000', navy: '000080', teal: '008080', olive: '808000',
  lime: '00ff00', aqua: '00ffff', cyan: '00ffff', fuchsia: 'ff00ff', magenta: 'ff00ff',
  lightgray: 'd3d3d3', lightgrey: 'd3d3d3', darkgray: 'a9a9a9', darkgrey: 'a9a9a9',
  dimgray: '696969', dimgrey: '696969', whitesmoke: 'f5f5f5', gainsboro: 'dcdcdc',
  indigo: '4b0082', violet: 'ee82ee', pink: 'ffc0cb', rebeccapurple: '663399',
  slategray: '708090', slategrey: '708090', royalblue: '4169e1', blueviolet: '8a2be2',
  mediumpurple: '9370db', slateblue: '6a5acd',
};

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return null;
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function parseAlpha(raw) {
  if (raw === undefined) return 1;
  const v = raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
  return Number.isNaN(v) ? 1 : Math.max(0, Math.min(1, v));
}

/**
 * Parses a single CSS color value into {r,g,b,a}. Resolves var(--x) through
 * `tokens` (a Map of custom property name → raw value). Returns null when the
 * color is not statically determinable (currentColor, inherit, calc, ...).
 */
function parseColor(value, tokens, depth = 0) {
  if (typeof value !== 'string' || depth > 6) return null;
  const v = value.trim().replace(/\s*!important$/i, '').toLowerCase();
  if (!v) return null;
  const varMatch = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (varMatch) {
    if (tokens && tokens.has(varMatch[1])) return parseColor(tokens.get(varMatch[1]), tokens, depth + 1);
    return varMatch[2] ? parseColor(varMatch[2], tokens, depth + 1) : null;
  }
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (/^#[0-9a-f]{3,8}$/.test(v)) return hexToRgb(v);
  const fn = v.match(/^(rgba?|hsla?)\(([^()]*)\)$/);
  if (fn) {
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    if (fn[1].startsWith('rgb')) {
      const ch = parts.slice(0, 3).map(p => (p.endsWith('%') ? parseFloat(p) * 2.55 : parseFloat(p)));
      if (ch.some(Number.isNaN)) return null;
      return { r: Math.round(ch[0]), g: Math.round(ch[1]), b: Math.round(ch[2]), a: parseAlpha(parts[3]) };
    }
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    if ([h, s, l].some(Number.isNaN)) return null;
    return { ...hslToRgb(h, s, l), a: parseAlpha(parts[3]) };
  }
  if (NAMED_COLORS[v]) return hexToRgb(NAMED_COLORS[v]);
  return null;
}

function toHex(c) {
  return '#' + [c.r, c.g, c.b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
}

function relativeLuminance(c) {
  const lin = n => { const s = n / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function composite(fg, bg) {
  const a = fg.a === undefined ? 1 : fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

/** Mixes fg toward black or white until it reaches `min` contrast against bg. */
function suggestPassingColor(fg, bg, min) {
  const targets = [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }];
  let best = null;
  for (const t of targets) {
    for (let step = 1; step <= 20; step++) {
      const k = step / 20;
      const c = { r: fg.r + (t.r - fg.r) * k, g: fg.g + (t.g - fg.g) * k, b: fg.b + (t.b - fg.b) * k };
      if (contrastRatio(c, bg) >= min) {
        if (!best || step < best.step) best = { step, color: toHex(c) };
        break;
      }
    }
  }
  return best ? best.color : null;
}

function rgbToHsl(c) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

/** Splits a CSS value on top-level whitespace/commas (not inside parentheses). */
function splitTopLevel(value, separators = /[\s,]/) {
  const out = [];
  let buf = '', depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && separators.test(ch)) { if (buf) out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

/** Background color of a declaration, or null if it is an image/gradient or not determinable. */
function backgroundColor(prop, value, tokens) {
  if (/gradient\(|url\(|image-set\(|element\(/i.test(value)) return null;
  if (prop === 'background-color') return parseColor(value, tokens);
  const parts = splitTopLevel(value.replace(/\s*!important$/i, ''));
  let found = null;
  for (const p of parts) { const c = parseColor(p, tokens); if (c) found = c; }
  return found;
}

const COLOR_LITERAL_RE = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^()]*\)/gi;

// ─── CSS parsing ──────────────────────────────────────────────────────────────

/**
 * Minimal tolerant CSS/SCSS parser. Returns a flat list of blocks:
 * [{ selector, parents: [selectors], decls: [{ prop, value, index }], index }]
 * Indices are absolute positions in the original file (via `offset`).
 * Top-level declarations (inline style attributes, styled-components) land in
 * a root block named `rootSelector`.
 */
function parseCss(text, offset = 0, rootSelector = '', scss = false) {
  let src = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (scss) src = src.replace(/(^|[\s;{}])(\/\/[^\n]*)/g, (m, pre, c) => pre + blank(c));
  const root = { selector: rootSelector, parents: [], decls: [], index: offset };
  const rules = [root];
  const stack = [root];
  let buf = '', bufStart = 0, quote = null, paren = 0;

  const flushDecl = () => {
    const s = buf;
    buf = '';
    if (!s.trim()) return;
    const colon = s.indexOf(':');
    if (colon <= 0) return;
    const prop = s.slice(0, colon).trim().toLowerCase();
    if (!/^-?-?[a-z][\w-]*$/.test(prop)) return;
    let value = s.slice(colon + 1).trim();
    const important = /!important\s*$/i.test(value);
    value = value.replace(/\s*!important\s*$/i, '');
    stack[stack.length - 1].decls.push({ prop, value, important, index: offset + bufStart });
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (!quote && paren === 0 && !buf.trim()) {
      if (/\s/.test(ch)) { buf = ''; continue; }
      if (!'{};'.includes(ch)) bufStart = i;
    }
    if (quote) { buf += ch; if (ch === quote && src[i - 1] !== '\\') quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '(') paren++;
    if (ch === ')') paren = Math.max(0, paren - 1);
    if (paren > 0) { buf += ch; continue; }
    if (ch === '{') {
      const rule = {
        selector: buf.trim(),
        parents: stack.map(r => r.selector).filter(Boolean),
        decls: [],
        index: offset + bufStart,
      };
      rules.push(rule);
      stack.push(rule);
      buf = '';
      continue;
    }
    if (ch === ';') { flushDecl(); continue; }
    if (ch === '}') { flushDecl(); if (stack.length > 1) stack.pop(); continue; }
    buf += ch;
  }
  flushDecl();
  return rules;
}

function inKeyframes(rule) {
  return [rule.selector, ...rule.parents].some(s => /^@(-[a-z]+-)?keyframes\b/i.test(s));
}

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Splits a file into markup (for HTML rules) and CSS sources (for style rules).
 * Markup keeps original indices: comments, <style> and <script> bodies are blanked.
 */
function buildContext(file, content, settings, tokens) {
  const type = classifyFile(file);
  const isScss = /\.scss$/i.test(file);
  const cssSources = [];
  let markup = '';

  if (type === 'css') {
    cssSources.push({ text: content, offset: 0, scss: isScss, root: '' });
  } else {
    let m = content;
    m = m.replace(/<!--[\s\S]*?-->/g, blank);
    const styleRe = /(<style\b([^>]*)>)([\s\S]*?)<\/style>/gi;
    let s;
    while ((s = styleRe.exec(m))) {
      const bodyStart = s.index + s[1].length;
      let body = s[3];
      let bodyOffset = bodyStart;
      // <style jsx>{`...`}</style>
      const tpl = body.match(/^\s*\{\s*`([\s\S]*)`\s*\}\s*$/);
      if (tpl) { bodyOffset = bodyStart + body.indexOf('`') + 1; body = tpl[1].replace(/\$\{[^}]*\}/g, x => 'x'.repeat(x.length)); }
      cssSources.push({ text: body, offset: bodyOffset, scss: /lang\s*=\s*["']?s[ac]ss/i.test(s[2]), root: '' });
    }
    m = m.replace(styleRe, (all, open, attrs, body) => open + blank(body) + '</style>');
    if (type === 'html' || /\.(vue|svelte)$/i.test(file)) {
      m = m.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (all, open, body, close) => open + blank(body) + close);
    } else {
      // JSX/TSX: block comments are not markup; tagged CSS templates are styles.
      m = m.replace(/\/\*[\s\S]*?\*\//g, blank);
      const tagged = /(?:\bstyled(?:\.\w+|\([^)]*\))(?:\.attrs\([^)]*\))?|\bcss|\bcreateGlobalStyle|\bkeyframes|\binjectGlobal)\s*`([^`]*)`/g;
      let t;
      while ((t = tagged.exec(m))) {
        const bodyOffset = t.index + t[0].indexOf('`') + 1;
        const body = t[1].replace(/\$\{[^}]*\}/g, x => 'x'.repeat(x.length));
        cssSources.push({ text: body, offset: bodyOffset, scss: true, root: '&' });
      }
    }
    // Inline style attributes become root-level declaration blocks.
    const inlineRe = /\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi;
    let a;
    while ((a = inlineRe.exec(m))) {
      const val = a[2] ?? a[3];
      cssSources.push({ text: val, offset: a.index + a[0].indexOf(a[1]) + 1, scss: false, root: '[style]' });
    }
    markup = m;
  }

  const rules = [];
  for (const src of cssSources) rules.push(...parseCss(src.text, src.offset, src.root, src.scss));
  const cssText = cssSources.map(s => s.text).join('\n');

  return {
    file, type, content, markup, cssSources, cssText, rules,
    decls: rules.flatMap(r => r.decls.map(d => ({ ...d, rule: r }))),
    tokens, settings,
    lineOf: makeLineOf(content),
    hasCss: rules.some(r => r.decls.length > 0) || /@keyframes|@media/i.test(cssText),
    hasMarkup: type !== 'css',
    allTags: type === 'css' ? [] : findTags(markup, ['[a-zA-Z][\\w.-]*']),
  };
}

/**
 * Collects custom properties (`--name: value`) so var() can be resolved.
 * Tokens from stylesheets are shared by every file in the run (a tokens.css
 * linted with its components); tokens defined inside an HTML/component file
 * only apply to that file.
 */
function collectTokens(file, content, into) {
  const tokens = into || new Map();
  const ctx = buildContext(file, content, {}, tokens);
  for (const d of ctx.decls) if (d.prop.startsWith('--') && !tokens.has(d.prop)) tokens.set(d.prop, d.value);
  return tokens;
}

/**
 * Local stylesheets a file pulls in: CSS @import and HTML <link rel="stylesheet">.
 * Remote URLs and missing files are ignored. Paths are absolute.
 */
function importedSheets(file, content) {
  const dir = path.dirname(file);
  const refs = [];
  const importRe = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?/gi;
  let m;
  while ((m = importRe.exec(content))) refs.push(m[1]);
  if (classifyFile(file) !== 'css') {
    const linkRe = /<link\b[^>]*>/gi;
    while ((m = linkRe.exec(content))) {
      if (!/\brel\s*=\s*["']?stylesheet/i.test(m[0])) continue;
      const href = m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (href) refs.push(href[1]);
    }
  }
  return refs
    .filter(r => !/^([a-z]+:)?\/\//i.test(r) && !r.startsWith('data:'))
    .map(r => path.resolve(dir, r.split(/[?#]/)[0]))
    .filter(p => SUPPORTED_EXT.test(p) && fs.existsSync(p) && fs.statSync(p).isFile());
}

/** Tokens from the stylesheets a file imports (recursively, up to 4 levels). */
function collectImportedTokens(file, content, into, seen = new Set([file]), depth = 0) {
  if (depth >= 4) return into;
  for (const sheet of importedSheets(file, content)) {
    if (seen.has(sheet)) continue;
    seen.add(sheet);
    let text;
    try { text = fs.readFileSync(sheet, 'utf-8'); } catch { continue; }
    collectTokens(sheet, text, into);
    collectImportedTokens(sheet, text, into, seen, depth + 1);
  }
  return into;
}

function colorTokens(tokens) {
  const out = new Map(); // normalized hex → token name
  for (const [name, value] of tokens) {
    const c = parseColor(value, tokens);
    if (c && c.a === 1 && !out.has(toHex(c))) out.set(toHex(c), name);
  }
  return out;
}

// ─── Rules ────────────────────────────────────────────────────────────────────
//
// Each rule: id, label, category, role (the Naksha role that owns the fix),
// severity, configKey (legacy group toggle), applies(ctx), fix, and
// run(ctx) → null | { message, locations: [index], fix? }.
// One issue is reported per rule per file; `locations` become line numbers.

const RULES = [];
function rule(def) { RULES.push(def); }

const isHtml = ctx => ctx.type === 'html';
const hasMarkup = ctx => ctx.hasMarkup;
const hasCss = ctx => ctx.hasCss;

// Screen readers pick pronunciation from lang; WCAG 3.1.1 (A).
rule({
  id: 'html-lang', label: 'HTML lang attribute', category: 'accessibility', role: 'UX Researcher',
  severity: 'error', configKey: 'checkSemantic', applies: isHtml,
  fix: 'Add a language to the root element, e.g. <html lang="en">.',
  run(ctx) {
    const tag = tagsNamed(ctx, ['html'])[0];
    if (tag && !hasAttr(tag.attrs, ['lang'])) {
      return { message: '<html> is missing a lang attribute (screen readers need it to pick a voice)', locations: [tag.index] };
    }
    return null;
  },
});

// Images without alt are announced by file name; WCAG 1.1.1 (A).
// A bare `alt` or alt="" is valid for decorative images. Spread props may carry alt, so they are skipped.
rule({
  id: 'img-alt', label: 'Image alt text', category: 'accessibility', role: 'UX Researcher',
  severity: 'error', configKey: 'checkSemantic', applies: hasMarkup,
  fix: 'Describe the image in alt="…"; use alt="" for purely decorative images.',
  run(ctx) {
    const bad = tagsNamed(ctx, ['img'])
      .filter(t => !/\{\s*\.\.\./.test(t.attrs) && !hasAttr(t.attrs, ['alt', ':alt', 'v-bind:alt']));
    if (!bad.length) return null;
    return { message: `${bad.length} <img> element(s) missing an alt attribute`, locations: bad.map(t => t.index) };
  },
});

// A clickable <div>/<span> is invisible to keyboards and assistive tech unless
// it has both a role and a tabindex; WCAG 2.1.1 (A) and 4.1.2 (A).
rule({
  id: 'clickable-div', label: 'Non-semantic clickable element', category: 'accessibility', role: 'UX Researcher',
  severity: 'error', configKey: 'checkSemantic', applies: hasMarkup,
  fix: 'Use <button> for actions and <a href> for navigation. If you must keep the element, add role="button", tabindex="0" and Enter/Space key handlers.',
  run(ctx) {
    const bad = tagsNamed(ctx, ['div', 'span', 'li', 'p', 'td', 'section', 'article'])
      .filter(t => hasAttr(t.attrs, ['onclick', 'onClick', '@click', 'v-on:click', 'on:click']))
      .filter(t => !(/\brole\s*=/.test(t.attrs) && /\btab[iI]ndex\s*=/.test(t.attrs)));
    if (!bad.length) return null;
    const names = [...new Set(bad.map(t => `<${t.name}>`))].join(', ');
    return { message: `${bad.length} clickable ${names} element(s) without a role and tabindex; keyboard users cannot reach them`, locations: bad.map(t => t.index) };
  },
});

// Inputs need a programmatic name; placeholders vanish on input. WCAG 1.3.1 / 4.1.2.
rule({
  id: 'input-label', label: 'Form input labels', category: 'accessibility', role: 'UX Researcher',
  severity: 'warning', configKey: 'checkSemantic', applies: hasMarkup,
  fix: 'Pair each field with <label for="id"> (htmlFor in JSX), wrap it in a <label>, or add aria-label/aria-labelledby.',
  run(ctx) {
    const labelFor = new Set();
    for (const l of tagsNamed(ctx, ['label'])) {
      const v = attrValue(l.attrs, ['for', 'htmlFor']);
      if (v) labelFor.add(v.trim());
    }
    const opens = [], closes = [];
    const lre = /<label\b|<\/label>/gi;
    let lm;
    while ((lm = lre.exec(ctx.markup))) (lm[0][1] === '/' ? closes : opens).push(lm.index);
    const wrapped = idx => {
      const lastOpen = Math.max(-1, ...opens.filter(i => i < idx));
      const lastClose = Math.max(-1, ...closes.filter(i => i < idx));
      return lastOpen > lastClose;
    };
    const bad = tagsNamed(ctx, ['input', 'select', 'textarea']).filter(t => {
      const type = (attrValue(t.attrs, ['type']) || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return false;
      if (/\{\s*\.\.\./.test(t.attrs)) return false;
      if (hasAttr(t.attrs, ['aria-label', 'aria-labelledby', ':aria-label', 'v-bind:aria-label', 'title'])) return false;
      const id = attrValue(t.attrs, ['id']);
      if (id && labelFor.has(id.trim())) return false;
      return !wrapped(t.index);
    });
    if (!bad.length) return null;
    return { message: `${bad.length} form field(s) without an associated label`, locations: bad.map(t => t.index) };
  },
});

// Landmarks let screen-reader users jump around a page; a page of bare divs has none.
rule({
  id: 'semantic-html', label: 'Semantic HTML', category: 'structure', role: 'Framework Specialist',
  severity: 'warning', configKey: 'checkSemantic', applies: isHtml,
  fix: 'Wrap regions in <header>, <nav>, <main>, <section>, <footer> and use real headings.',
  run(ctx) {
    const hasSemantics = /<(nav|main|section|article|header|footer|aside|figure|figcaption|h[1-6])\b/i.test(ctx.markup);
    const divs = (ctx.markup.match(/<div\b/gi) || []).length;
    if (divs > 10 && !hasSemantics) {
      return { message: `Page uses ${divs} <div> elements but no semantic landmarks (<nav>, <main>, <section>, …)`, locations: [] };
    }
    return null;
  },
});

// Without a viewport meta, mobile browsers render a zoomed-out desktop page.
rule({
  id: 'viewport-meta', label: 'Viewport meta tag', category: 'responsive', role: 'Framework Specialist',
  severity: 'error', configKey: 'checkResponsive', applies: isHtml,
  fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to <head>.',
  run(ctx) {
    if (/<head\b/i.test(ctx.markup) && !/name\s*=\s*["']?viewport/i.test(ctx.markup)) {
      return { message: 'Missing <meta name="viewport">; the page will not be responsive on mobile', locations: [ctx.markup.search(/<head\b/i)] };
    }
    return null;
  },
});

// WCAG 1.4.3 (AA): 4.5:1 for body text, 3:1 for large text (≥24px, or ≥18.66px bold).
// Only pairs declared in the same block are checked, since inheritance needs a DOM.
// Floor is raised by .naksha/project.json (min_contrast_ratio, accessibility_target AAA).
rule({
  id: 'contrast-aa', label: 'Text contrast (WCAG AA)', category: 'accessibility', role: 'UX Researcher',
  severity: 'error', configKey: 'checkContrast', applies: hasCss,
  fix: 'Darken the text or lighten the background until it meets the ratio; the message suggests the nearest passing text color.',
  run(ctx) {
    const { contrastMin, contrastLarge } = ctx.settings;
    const found = [];
    for (const r of ctx.rules) {
      if (!r.decls.length || inKeyframes(r)) continue;
      let fg = null, bg = null, size = null, bold = false, fgDecl = null;
      for (const d of r.decls) {
        if (d.prop === 'color') { fg = parseColor(d.value, ctx.tokens); fgDecl = d; }
        else if (d.prop === 'background-color' || d.prop === 'background') bg = backgroundColor(d.prop, d.value, ctx.tokens);
        else if (d.prop === 'font-size') size = toPx(d.value);
        else if (d.prop === 'font-weight') bold = /bold|bolder|[7-9]00/.test(d.value);
      }
      if (!fg || !bg || bg.a < 1) continue;
      const fgSolid = composite(fg, bg);
      const large = size !== null && (size >= 24 || (size >= 18.66 && bold));
      const min = large ? contrastLarge : contrastMin;
      const ratio = contrastRatio(fgSolid, bg);
      if (ratio + 1e-9 < min) {
        const suggestion = suggestPassingColor(fgSolid, bg, min);
        found.push({
          index: fgDecl.index,
          text: `${r.selector || 'inline style'}: ${toHex(fgSolid)} on ${toHex(bg)} is ${ratio.toFixed(2)}:1 (needs ${min}:1)` +
            (suggestion ? `, try ${suggestion}` : ''),
        });
      }
    }
    if (!found.length) return null;
    const shown = found.slice(0, 3).map(f => f.text).join('; ');
    return { message: `${found.length} text/background pair(s) below contrast minimum: ${shown}${found.length > 3 ? '; …' : ''}`, locations: found.map(f => f.index) };
  },
});

// Removing the focus ring without a replacement strands keyboard users; WCAG 2.4.7 (AA).
// The `:focus:not(:focus-visible) { outline: none }` pattern is allowed, as is any
// :focus/:focus-visible block that draws its own indicator.
rule({
  id: 'focus-visible', label: 'Visible focus styles', category: 'accessibility', role: 'UX Researcher',
  severity: 'error', configKey: 'checkFocus', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Add a :focus-visible style (e.g. outline: 2px solid var(--focus-ring); outline-offset: 2px) wherever the outline is removed. In Tailwind pair outline-none with focus-visible:ring-2.',
  run(ctx) {
    const cssRemoved = [];
    let replaced = false;
    for (const r of ctx.rules) {
      const sel = r.selector;
      const isFocusSel = /:focus/i.test(sel);
      for (const d of r.decls) {
        const kills = (d.prop === 'outline' && /^(none|0(px)?)$/i.test(d.value)) || (d.prop === 'outline-style' && d.value === 'none');
        if (kills && !/:focus:not\(\s*:focus-visible\s*\)/i.test(sel)) cssRemoved.push(d.index);
        if (isFocusSel && !kills && /^(outline|outline-color|outline-width|box-shadow|border|border-color|border-bottom|background|background-color|text-decoration)$/.test(d.prop)) replaced = true;
      }
    }
    // Tailwind: outline-none with no focus/focus-visible variant on the same element.
    const markupRemoved = ctx.allTags.filter(t => {
      const cls = attrValue(t.attrs, ['class', 'className']) || '';
      return /(^|\s)outline-none(\s|$)/.test(cls) && !/(^|\s)focus(-visible|-within)?:/.test(cls);
    }).map(t => t.index);
    const removed = (replaced ? [] : cssRemoved).concat(markupRemoved);
    if (!removed.length) return null;
    return { message: `Focus outline removed in ${removed.length} place(s) with no :focus-visible replacement; keyboard users lose their place`, locations: removed };
  },
});

// Interactive elements that react to hover but never to focus give mouse users
// feedback that keyboard users never see. Only fires when the file has no :focus styles at all.
rule({
  id: 'hover-without-focus', label: 'Hover without focus', category: 'accessibility', role: 'UX Researcher',
  severity: 'warning', configKey: 'checkFocus', applies: hasCss,
  fix: 'Mirror each interactive :hover style with :focus-visible (e.g. `.btn:hover, .btn:focus-visible { … }`).',
  run(ctx) {
    if (ctx.rules.some(r => /:focus/i.test(r.selector))) return null;
    const interactive = /(^|[\s>+~,(&])(a|button|input|select|textarea|summary)\b|\.(btn|button|link|cta)\b|\[role=/i;
    const hovers = ctx.rules.filter(r => /:hover/i.test(r.selector) && r.decls.length && interactive.test(r.selector));
    if (!hovers.length) return null;
    return { message: `${hovers.length} interactive :hover rule(s) but no :focus or :focus-visible styles in this file`, locations: hovers.map(r => r.index) };
  },
});

// Animation can trigger vestibular symptoms; users opt out with the OS setting,
// which only works if the CSS honors prefers-reduced-motion (WCAG 2.3.3).
// Short transitions are not counted: they are feedback, not motion sequences.
rule({
  id: 'reduced-motion', label: 'prefers-reduced-motion', category: 'motion', role: 'Motion Designer',
  severity: 'warning', configKey: 'checkMotion', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Wrap animations in @media (prefers-reduced-motion: no-preference) { … }, or add a @media (prefers-reduced-motion: reduce) block that disables them. Tailwind: use motion-safe:/motion-reduce: variants.',
  run(ctx) {
    if (/prefers-reduced-motion/i.test(ctx.content) || /\bmotion-(safe|reduce):/.test(ctx.markup || '')) return null;
    const locations = [];
    for (const d of ctx.decls) {
      if ((d.prop === 'animation' || d.prop === 'animation-name') && !/^none\b/i.test(d.value)) locations.push(d.index);
      if (d.prop === 'scroll-behavior' && /smooth/i.test(d.value)) locations.push(d.index);
    }
    for (const r of ctx.rules) if (/^@(-[a-z]+-)?keyframes\b/i.test(r.selector)) locations.push(r.index);
    const tw = /(^|[\s"'`])animate-(spin|ping|pulse|bounce|[\w-]+)/g;
    let m;
    while ((m = tw.exec(ctx.markup || ''))) if (!/animate-none/.test(m[0])) locations.push(m.index);
    if (!locations.length) return null;
    return { message: `Animations found (${locations.length}) but no prefers-reduced-motion handling`, locations };
  },
});

// Spacing off the base grid breaks vertical rhythm and multiplies one-off values.
// Grid comes from .naksha/project.json constraints.grid (default 4px). 0, auto,
// %, em, calc() and var() are ignored; values ≤ 2px are treated as optical nudges.
rule({
  id: 'spacing-grid', label: 'Spacing grid', category: 'tokens', role: 'Design System Lead',
  severity: 'warning', configKey: 'warnOnTokens', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Round each value to a multiple of the grid, or better, use a spacing token (var(--space-*)).',
  run(ctx) {
    const grid = ctx.settings.grid;
    const off = [];
    const check = (raw, index) => {
      const px = toPx(raw.replace(/^-/, ''));
      if (px === null || px <= 2) return;
      const rem = px % grid;
      if (Math.min(rem, grid - rem) > 0.01) off.push({ index, raw });
    };
    for (const d of ctx.decls) {
      if (!/^(margin|padding)(-[a-z-]+)?$|^(grid-)?(row-|column-)?gap$/.test(d.prop)) continue;
      for (const tok of splitTopLevel(d.value)) if (/^-?\d*\.?\d+(px|rem)$/i.test(tok)) check(tok, d.index);
    }
    const tw = /(?:^|[\s"'`:])-?(?:[pm][xytrblse]?|gap(?:-[xy])?|space-[xy])-\[(-?\d*\.?\d+(?:px|rem))\]/g;
    let m;
    while ((m = tw.exec(ctx.markup || ''))) check(m[1], m.index);
    if (!off.length) return null;
    const examples = [...new Set(off.map(o => o.raw))].slice(0, 5).join(', ');
    return { message: `${off.length} spacing value(s) off the ${grid}px grid (${examples})`, locations: off.map(o => o.index) };
  },
});

function collectFontSizes(ctx) {
  const sizes = [];
  for (const d of ctx.decls) {
    if (d.prop === 'font-size') {
      const px = toPx(d.value);
      if (px !== null) sizes.push({ px, index: d.index });
    } else if (d.prop === 'font') {
      const m = d.value.match(/(?:^|\s)(\d*\.?\d+(?:px|rem))(?=\s*\/|\s)/i);
      if (m) sizes.push({ px: toPx(m[1]), index: d.index });
    }
  }
  const tw = /(?:^|[\s"'`:])text-\[(\d*\.?\d+(?:px|rem))\]/g;
  let m;
  while ((m = tw.exec(ctx.markup || ''))) sizes.push({ px: toPx(m[1]), index: m.index });
  return sizes.map(s => ({ ...s, px: Math.round(s.px * 100) / 100 }));
}

// A type scale works because adjacent steps are clearly different. Sizes within
// 8% of each other (15px next to 16px) read as a mistake, and fractional pixel
// sizes (13.6px) usually come from unrounded rem math. With `typeScale` set in
// .design-lint.json, any size outside that list is flagged instead.
rule({
  id: 'type-scale', label: 'Type scale', category: 'typography', role: 'UI Designer',
  severity: 'warning', configKey: 'checkTypography', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Snap sizes to one modular scale (e.g. 12/14/16/20/24/32/40) and expose them as tokens (var(--text-*)).',
  run(ctx) {
    const sizes = collectFontSizes(ctx);
    if (!sizes.length) return null;
    const problems = [];
    const locations = [];
    const scale = Array.isArray(ctx.config.typeScale) ? ctx.config.typeScale.map(toPx).filter(n => n !== null) : null;
    if (scale && scale.length) {
      const offScale = sizes.filter(s => !scale.some(v => Math.abs(v - s.px) < 0.01));
      if (offScale.length) {
        problems.push(`${[...new Set(offScale.map(s => s.px + 'px'))].join(', ')} not in the configured scale`);
        locations.push(...offScale.map(s => s.index));
      }
    } else {
      const distinct = [...new Set(sizes.map(s => s.px))].sort((a, b) => a - b);
      const pairs = [];
      for (let i = 1; i < distinct.length; i++) {
        if (distinct[i] / distinct[i - 1] < 1.08) pairs.push([distinct[i - 1], distinct[i]]);
      }
      if (pairs.length) {
        problems.push('near-duplicate sizes ' + pairs.map(p => `${p[0]}px/${p[1]}px`).join(', '));
        const involved = new Set(pairs.flat());
        locations.push(...sizes.filter(s => involved.has(s.px)).map(s => s.index));
      }
      const fractional = sizes.filter(s => Math.abs(s.px - Math.round(s.px)) > 0.01);
      if (fractional.length) {
        problems.push(`fractional sizes ${[...new Set(fractional.map(s => s.px + 'px'))].join(', ')}`);
        locations.push(...fractional.map(s => s.index));
      }
    }
    if (!problems.length) return null;
    return { message: `Font sizes off a modular scale: ${problems.join('; ')}`, locations };
  },
});

// More than a handful of font sizes in one file means there is no type system,
// just ad-hoc values. Limit is `maxFontSizes` (default 8).
rule({
  id: 'type-count', label: 'Distinct font sizes', category: 'typography', role: 'UI Designer',
  severity: 'warning', configKey: 'checkTypography', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Collapse sizes into a short scale (6–8 steps) defined once as tokens.',
  run(ctx) {
    const max = Number(ctx.config.maxFontSizes) || 8;
    const distinct = [...new Set(collectFontSizes(ctx).map(s => s.px))].sort((a, b) => a - b);
    if (distinct.length <= max) return null;
    return { message: `${distinct.length} distinct font sizes (limit ${max}): ${distinct.map(s => s + 'px').join(', ')}`, locations: [] };
  },
});

// Once a project has color tokens, a raw hex value is a fork of the palette:
// it will not follow theme or dark-mode changes. Without tokens, many unique
// literals suggest the palette should become tokens in the first place.
rule({
  id: 'hardcoded-color', label: 'CSS token compliance (colors)', category: 'tokens', role: 'Design System Lead',
  severity: 'warning', configKey: 'warnOnTokens', applies: hasCss,
  fix: 'Replace literals with the matching custom property (var(--color-*)); add a token if none fits.',
  run(ctx) {
    const byHex = colorTokens(ctx.tokens);
    const literals = [];
    for (const d of ctx.decls) {
      if (d.prop.startsWith('--')) continue;
      const value = d.value.replace(/var\([^()]*(\([^()]*\)[^()]*)*\)/g, ' ');
      let m;
      COLOR_LITERAL_RE.lastIndex = 0;
      while ((m = COLOR_LITERAL_RE.exec(value))) literals.push({ raw: m[0], index: d.index });
    }
    if (!literals.length) return null;
    if (byHex.size > 0) {
      const examples = literals.slice(0, 3).map(l => {
        const c = parseColor(l.raw);
        const token = c && c.a === 1 ? byHex.get(toHex(c)) : null;
        return token ? `${l.raw} → var(${token})` : l.raw;
      }).join(', ');
      return { message: `${literals.length} hardcoded color(s) while ${byHex.size} color token(s) exist: ${examples}`, locations: literals.map(l => l.index) };
    }
    const unique = new Set(literals.map(l => l.raw.toLowerCase().replace(/\s+/g, '')));
    if (unique.size > 5) {
      return { message: `${unique.size} unique hardcoded colors and no color tokens; define them once as CSS custom properties`, locations: literals.map(l => l.index) };
    }
    return null;
  },
});

// Wide fixed widths overflow small screens.
rule({
  id: 'fixed-width', label: 'Responsive widths', category: 'responsive', role: 'UI Designer',
  severity: 'warning', configKey: 'checkResponsive', applies: hasCss,
  fix: 'Use max-width with a fluid width (width: 100%; max-width: 960px) or grid/flex sizing.',
  run(ctx) {
    const hits = ctx.decls.filter(d => d.prop === 'width' && /^([5-9]\d{2}|[1-9]\d{3})px$/.test(d.value));
    if (hits.length > 3) return { message: `${hits.length} fixed pixel widths ≥ 500px; use % or max-width for responsive layouts`, locations: hits.map(d => d.index) };
    return null;
  },
});

// Large stylesheets with no breakpoints are almost always desktop-only.
rule({
  id: 'media-queries', label: 'Responsive breakpoints', category: 'responsive', role: 'UI Designer',
  severity: 'warning', configKey: 'checkResponsive', applies: hasCss,
  fix: 'Add breakpoints (e.g. 768px tablet, 1024px desktop) or use container queries / fluid clamp() sizing.',
  run(ctx) {
    if (ctx.cssText.length < 2000) return null;
    // A tokens file (only custom properties, e.g. a generated tokens.css) has no layout.
    if (ctx.decls.length && ctx.decls.every(d => d.prop.startsWith('--'))) return null;
    if (!/@media|@container|clamp\(/i.test(ctx.cssText)) return { message: 'Substantial CSS with no @media or @container queries', locations: [] };
    return null;
  },
});

// Long inline styles bypass the stylesheet and its tokens.
rule({
  id: 'inline-styles', label: 'Inline style attributes', category: 'tokens', role: 'Framework Specialist',
  severity: 'warning', configKey: 'warnOnTokens', applies: hasMarkup,
  fix: 'Move repeated inline styles into classes that use tokens.',
  run(ctx) {
    const hits = [];
    const re = /\sstyle\s*=\s*["'][^"']{20,}/gi;
    let m;
    while ((m = re.exec(ctx.markup))) hits.push(m.index);
    if (hits.length > 5) return { message: `${hits.length} inline style attributes with significant CSS; move them to a stylesheet`, locations: hits };
    return null;
  },
});

// ── AI-slop clichés ──────────────────────────────────────────────────────────
// Patterns that show up when a UI is generated from a generic template instead
// of a brand. Each is a warning: legitimate in isolation, a smell by default.

const SLOP_BAND = c => { const h = rgbToHsl(c); return h.s >= 0.3 && h.l >= 0.2 && h.l <= 0.85 && h.h >= 215 && h.h <= 295; };

// The blue-to-violet gradient (#6366f1 → #a855f7 and friends) is the default
// "AI startup" hero. It says nothing about the brand, so it is only allowed when
// project memory says the brand itself lives in that hue band.
rule({
  id: 'slop-gradient-hero', label: 'Purple-blue gradient cliché', category: 'slop', role: 'Creative Director',
  severity: 'warning', configKey: 'checkSlop', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Derive the hero background from the brand palette (a single brand hue, a tint, or a photo) instead of the stock blue-violet gradient.',
  run(ctx) {
    if (ctx.settings.brandColors.some(SLOP_BAND)) return null;
    const hits = [];
    for (const d of ctx.decls) {
      if (!/^background(-image)?$/.test(d.prop) || !/gradient\(/i.test(d.value)) continue;
      const stops = [];
      const re = /var\(\s*--[\w-]+\s*(?:,[^()]*)?\)|#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^()]*\)|\b[a-z]+\b/gi;
      let m;
      while ((m = re.exec(d.value))) { const c = parseColor(m[0], ctx.tokens); if (c && c.a > 0) stops.push(c); }
      if (stops.length < 2 || !stops.every(SLOP_BAND)) continue;
      const hues = stops.map(c => rgbToHsl(c).h);
      if (Math.max(...hues) - Math.min(...hues) >= 20) hits.push(d.index);
    }
    // Tailwind: bg-gradient-to-* from-indigo-500 to-purple-600 (and v4 bg-linear-to-*).
    const band = '(indigo|violet|purple|blue|fuchsia)';
    for (const t of ctx.allTags) {
      const cls = attrValue(t.attrs, ['class', 'className']) || '';
      if (!/bg-(gradient|linear)-to-/.test(cls)) continue;
      const from = cls.match(new RegExp('from-' + band + '-\\d+'));
      const to = cls.match(new RegExp('to-' + band + '-\\d+'));
      if (from && to && from[1] !== to[1]) hits.push(t.index);
    }
    if (!hits.length) return null;
    return { message: `${hits.length} blue-to-purple gradient(s), the stock "AI SaaS" hero look`, locations: hits };
  },
});

// Frosted glass on every card: text contrast over a blurred, changing backdrop
// cannot be verified, backdrop-filter is costly on low-end GPUs, and blanket use
// is a template tell. Fires at 3+ blurred surfaces; one overlay (nav, modal) is fine.
rule({
  id: 'slop-glassmorphism', label: 'Glassmorphism everywhere', category: 'slop', role: 'Creative Director',
  severity: 'warning', configKey: 'checkSlop', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Keep backdrop blur for one floating layer (nav or modal); give cards a solid surface token so contrast is predictable.',
  run(ctx) {
    const hits = ctx.decls.filter(d => /^(-webkit-)?backdrop-filter$/.test(d.prop) && /blur\(/i.test(d.value)).map(d => d.index);
    const tw = /(?:^|[\s"'`])backdrop-blur(?:-\w+)?(?=[\s"'`])/g;
    let m;
    while ((m = tw.exec(ctx.markup || ''))) hits.push(m.index);
    if (hits.length < 3) return null;
    return { message: `${hits.length} surfaces use backdrop blur; glass on every card hurts legibility and performance`, locations: hits };
  },
});

// Gradient-filled headline text: contrast varies along the gradient and some
// stops usually fail, and it is one of the most common generated-UI flourishes.
rule({
  id: 'slop-gradient-text', label: 'Gradient text', category: 'slop', role: 'Creative Director',
  severity: 'warning', configKey: 'checkSlop', applies: ctx => ctx.hasCss || ctx.hasMarkup,
  fix: 'Use a solid brand color for headings; if you keep the gradient, verify every stop passes contrast against the background.',
  run(ctx) {
    const hits = [];
    for (const r of ctx.rules) {
      const clip = r.decls.find(d => /^(-webkit-)?background-clip$/.test(d.prop) && /text/i.test(d.value));
      const grad = r.decls.some(d => /^background(-image)?$/.test(d.prop) && /gradient\(/i.test(d.value));
      if (clip && grad) hits.push(clip.index);
    }
    for (const t of ctx.allTags) {
      const cls = attrValue(t.attrs, ['class', 'className']) || '';
      if (/(^|\s)bg-clip-text(\s|$)/.test(cls) && /bg-(gradient|linear)-to-/.test(cls)) hits.push(t.index);
    }
    if (!hits.length) return null;
    return { message: `${hits.length} gradient-filled text element(s); contrast cannot be guaranteed across the gradient`, locations: hits };
  },
});

// Emoji as bullet or heading icons: screen readers read them out by name
// ("rocket", "sparkles") before every item, and they replace a real icon system.
const EMOJI_START = '(?:<[^>]+>\\s*)*(?![\\u00a9\\u00ae\\u2122])\\p{Extended_Pictographic}';
rule({
  id: 'slop-emoji-bullets', label: 'Emoji bullets', category: 'slop', role: 'Content Designer',
  severity: 'warning', configKey: 'checkSlop', applies: hasMarkup,
  fix: 'Use list styling or an SVG icon set with aria-hidden="true"; keep emoji out of headings and bullet starts.',
  run(ctx) {
    const items = [...ctx.markup.matchAll(new RegExp('<li\\b[^>]*>\\s*' + EMOJI_START, 'giu'))].map(m => m.index);
    const heads = [...ctx.markup.matchAll(new RegExp('<h[1-6]\\b[^>]*>\\s*' + EMOJI_START, 'giu'))].map(m => m.index);
    if (items.length < 3 && heads.length < 2) return null;
    return { message: `${items.length} list item(s) and ${heads.length} heading(s) start with an emoji`, locations: [...items, ...heads] };
  },
});

// Headline filler that could describe any product. Naksha's own list, checked
// only in headings and buttons, where it replaces a concrete value proposition.
const GENERIC_COPY = [
  /unlock the (full )?power/i, /harness the power/i, /revolutioni[sz]e/i, /supercharge/i,
  /\bseamless(ly)?\b/i, /next[- ]level/i, /game[- ]chang/i, /elevate your/i, /cutting[- ]edge/i,
  /\bunleash\b/i, /transform the way you/i, /in today'?s fast[- ]paced/i, /take .{1,30} to new heights/i,
];
rule({
  id: 'slop-generic-copy', label: 'Generic headline copy', category: 'slop', role: 'Content Designer',
  severity: 'warning', configKey: 'checkSlop', applies: hasMarkup,
  fix: 'Say what the product does for whom, with a concrete outcome ("Close your books in 2 days"), instead of stock superlatives.',
  run(ctx) {
    const hits = [];
    const re = /<(h[1-3]|button)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = re.exec(ctx.markup))) {
      const text = stripTags(m[2]);
      const phrase = GENERIC_COPY.find(p => p.test(text));
      if (phrase) hits.push({ index: m.index, text: text.match(phrase)[0] });
    }
    if (!hits.length) return null;
    return { message: `${hits.length} heading/button(s) use stock copy: ${[...new Set(hits.map(h => `"${h.text}"`))].slice(0, 4).join(', ')}`, locations: hits.map(h => h.index) };
  },
});

const RULE_IDS = RULES.map(r => r.id);

// ─── Runner ───────────────────────────────────────────────────────────────────

function ruleSeverity(r, config) {
  const override = config.rules && config.rules[r.id];
  if (override === 'error' || override === 'warning') return override;
  return r.severity;
}

function ruleEnabled(r, config, only) {
  if (only && !only.includes(r.id)) return false;
  const override = config.rules && config.rules[r.id];
  if (override === 'off' || override === false) return false;
  // Legacy group toggles stay authoritative unless a rule is explicitly re-enabled.
  if (r.configKey && config[r.configKey] === false && !override) return false;
  return true;
}

function lintContent(file, content, opts) {
  const { config, settings, tokens, only, cwd } = opts;
  const ctx = buildContext(file, content, settings, tokens);
  ctx.config = config;
  const issues = [];
  let passed = 0;
  for (const r of RULES) {
    if (!ruleEnabled(r, config, only) || !r.applies(ctx)) continue;
    let result = null;
    try { result = r.run(ctx); } catch (e) { result = null; }
    if (!result) { passed++; continue; }
    const lines = [...new Set((result.locations || []).map(ctx.lineOf))].sort((a, b) => a - b);
    issues.push({
      file: displayPath(cwd, path.resolve(cwd, file)),
      rule: r.id,
      check: r.label,
      category: r.category,
      role: r.role,
      severity: ruleSeverity(r, config),
      message: result.message,
      fix: result.fix || r.fix,
      line: lines[0] || null,
      lines: lines.slice(0, 20),
      count: (result.locations || []).length || 1,
    });
  }
  return { issues, passed };
}

/** Path relative to cwd, or absolute when the file lives outside it. */
function displayPath(cwd, abs) {
  const rel = path.relative(cwd, abs);
  return !rel || rel.startsWith('..') || path.isAbsolute(rel) ? abs : rel.split(path.sep).join('/');
}

function calculateScore(allIssues) {
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  return Math.max(0, Math.min(100, 100 - errors * 10 - warnings * 3));
}

/**
 * Lints files and returns the report object (does not print or write anything).
 * opts: { cwd, config, rules: [ids] }
 */
function lintFiles(files, opts = {}) {
  const cwd = path.resolve(opts.cwd || process.cwd());
  const config = opts.config || loadConfig(cwd);
  const project = opts.project !== undefined ? opts.project : loadProject(cwd);
  const settings = resolveSettings(config, project);
  const skipped = [];
  const seen = new Set();
  const targets = [];

  for (const f of files) {
    const abs = path.resolve(cwd, f);
    const rel = displayPath(cwd, abs);
    if (seen.has(abs)) continue;
    seen.add(abs);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { skipped.push({ file: rel, reason: 'not found' }); continue; }
    if (!classifyFile(abs)) { skipped.push({ file: rel, reason: 'unsupported file type' }); continue; }
    if ((config.ignorePatterns || []).some(p => matchesIgnore(rel, p))) { skipped.push({ file: rel, reason: 'ignored by .design-lint.json' }); continue; }
    targets.push({ file: abs, rel, content: fs.readFileSync(abs, 'utf-8') });
  }

  const shared = new Map();
  for (const t of targets) if (classifyFile(t.file) === 'css') collectTokens(t.file, t.content, shared);
  // A stylesheet that @imports tokens.css (or a page that links it) uses those tokens
  // even when tokens.css is not part of this run, e.g. the edit hook linting one file.
  for (const t of targets) collectImportedTokens(t.file, t.content, shared);
  const allIssues = [];
  let totalPassed = 0;
  for (const t of targets) {
    const tokens = classifyFile(t.file) === 'css' ? shared : collectTokens(t.file, t.content, new Map(shared));
    const { issues, passed } = lintContent(t.file, t.content, { config, settings, tokens, only: opts.rules || null, cwd });
    allIssues.push(...issues);
    totalPassed += passed;
  }

  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const nothing = targets.length === 0;
  const score = nothing ? null : calculateScore(allIssues);
  const failing = !nothing && (errors > 0 || score < config.failThreshold);

  return {
    tool: 'naksha-design-lint',
    version: 2,
    status: nothing ? 'nothing-to-lint' : allIssues.length ? 'issues' : 'clean',
    score,
    issues: allIssues,
    passed: totalPassed,
    failed: errors,
    warnings,
    files: targets.length,
    filesLinted: targets.map(t => t.rel),
    skipped,
    settings: { grid: settings.grid, contrastMin: settings.contrastMin, failThreshold: config.failThreshold },
    exitCode: failing ? 1 : 0,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const USAGE = `Usage: node scripts/design-lint.js [files...] [options]

Options:
  --json            Print the report as JSON on stdout (no report file)
  --rules a,b       Run only these rule ids
  --report          Also write ${REPORT_FILE} (default in CI mode only)
  --no-report       Never write ${REPORT_FILE}
  --list-rules      List rule ids, severities and owners
  -h, --help        Show this help

With no files, lints $CHANGED_FILES (CI) or scans src/, public/, dist/ and .
Exit codes: 0 clean, 1 errors or score below failThreshold, 2 bad usage.`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { files: [], json: false, report: null, rules: null, listRules: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--no-report') opts.report = false;
    else if (a === '--report') opts.report = true;
    else if (a === '--list-rules') opts.listRules = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--rules' || a.startsWith('--rules=')) {
      const val = a === '--rules' ? argv[++i] : a.slice('--rules='.length);
      if (!val || val.startsWith('--')) throw new UsageError('--rules needs a comma-separated list of rule ids');
      const ids = val.split(',').map(s => s.trim()).filter(Boolean);
      const unknown = ids.filter(id => !RULE_IDS.includes(id));
      if (unknown.length) throw new UsageError(`unknown rule(s): ${unknown.join(', ')}. Known rules: ${RULE_IDS.join(', ')}`);
      opts.rules = ids;
    } else if (a === '--') { opts.files.push(...argv.slice(i + 1)); break; }
    else if (a.startsWith('-')) throw new UsageError(`unknown option: ${a}`);
    else opts.files.push(a);
  }
  return opts;
}

function collectDefaultFiles(cwd) {
  // CI mode: the workflow sets CHANGED_FILES (possibly empty → nothing to lint).
  if (Object.prototype.hasOwnProperty.call(process.env, 'CHANGED_FILES')) {
    return { files: process.env.CHANGED_FILES.split(/\s+/).filter(Boolean), mode: 'ci' };
  }
  const found = [];
  for (const dir of ['src', 'public', 'dist', '.']) {
    const full = path.join(cwd, dir);
    if (fs.existsSync(full)) scanDir(full, found);
  }
  return { files: found, mode: 'scan' };
}

/** Ignored files are summarized as a count; other skips are listed. */
function skippedLines(skipped) {
  const ignored = skipped.filter(s => s.reason.startsWith('ignored'));
  const lines = skipped.filter(s => !s.reason.startsWith('ignored')).map(s => `  ↷ skipped ${s.file} (${s.reason})`);
  if (ignored.length) lines.push(`  ↷ ${ignored.length} file(s) ignored by .design-lint.json`);
  return lines;
}

function printHuman(report) {
  const out = [];
  if (report.status === 'nothing-to-lint') {
    out.push('Naksha design lint: nothing to lint (no supported files after filters).');
    out.push(...skippedLines(report.skipped));
    console.log(out.join('\n'));
    return;
  }
  out.push(`\n🎨 Naksha design lint — ${report.files} file(s), ${report.settings.grid}px grid, contrast ≥ ${report.settings.contrastMin}:1\n`);
  for (const file of report.filesLinted) {
    const issues = report.issues.filter(i => i.file === file);
    if (!issues.length) { out.push(`  ✅ ${file}`); continue; }
    out.push(`  ${issues.some(i => i.severity === 'error') ? '❌' : '⚠️ '} ${file}`);
    for (const i of issues) {
      const where = i.lines.length ? ` (line ${i.lines.slice(0, 6).join(', ')}${i.lines.length > 6 ? ', …' : ''})` : '';
      out.push(`    ${i.severity === 'error' ? '🔴 error  ' : '🟡 warning'} ${i.rule}: ${i.message}${where}`);
      out.push(`               fix: ${i.fix}`);
    }
  }
  out.push(...skippedLines(report.skipped));
  out.push('\n─────────────────────────────────────────');
  out.push(`  Score: ${report.score}/100`);
  out.push(`  ✅ ${report.passed} checks passed`);
  out.push(`  ⚠️  ${report.warnings} warnings`);
  out.push(`  ❌ ${report.failed} errors`);
  out.push('─────────────────────────────────────────\n');
  console.log(out.join('\n'));
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    process.stderr.write(`design-lint: ${e.message}\n\n${USAGE}\n`);
    return 2;
  }
  if (opts.help) { console.log(USAGE); return 0; }
  if (opts.listRules) {
    const list = RULES.map(r => ({ id: r.id, severity: r.severity, category: r.category, role: r.role, label: r.label, fix: r.fix }));
    if (opts.json) console.log(JSON.stringify(list, null, 2));
    else for (const r of list) console.log(`${r.id.padEnd(20)} ${r.severity.padEnd(8)} ${r.category.padEnd(14)} ${r.role}`);
    return 0;
  }

  const cwd = process.cwd();
  let files = opts.files;
  if (files.length) {
    const missing = files.filter(f => !fs.existsSync(path.resolve(cwd, f)));
    if (missing.length) {
      process.stderr.write(`design-lint: file(s) not found: ${missing.join(', ')}\n`);
      return 2;
    }
    // A directory argument means "everything supported inside it".
    files = files.flatMap(f => {
      const abs = path.resolve(cwd, f);
      if (!fs.statSync(abs).isDirectory()) return [f];
      const found = [];
      scanDir(abs, found);
      return found;
    });
  } else {
    files = collectDefaultFiles(cwd).files;
  }

  const report = lintFiles(files, { cwd, rules: opts.rules });
  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    printHuman(report);
    if (report.exitCode === 1 && report.score < report.settings.failThreshold) {
      process.stderr.write(`Design quality score ${report.score} is below threshold ${report.settings.failThreshold}.\n`);
    }
  }
  const ciMode = Object.prototype.hasOwnProperty.call(process.env, 'CHANGED_FILES');
  if ((opts.report === null ? ciMode : opts.report) && !opts.json) {
    try { fs.writeFileSync(path.join(cwd, REPORT_FILE), JSON.stringify(report, null, 2)); } catch { /* read-only cwd */ }
  }
  return report.exitCode;
}

module.exports = {
  RULES, RULE_IDS, DEFAULT_CONFIG,
  lintFiles, lintContent, parseArgs, parseCss, parseColor, contrastRatio,
  loadConfig, loadProject, resolveSettings, matchesIgnore, classifyFile, main,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
