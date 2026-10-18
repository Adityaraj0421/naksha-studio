'use strict';
// Naksha Live HTTP app: plain `http` + Server-Sent Events, zero dependencies.
//
// Security model (see docs/dashboard.md):
//   - binds 127.0.0.1 only
//   - every /api/* request needs the per-start random token (X-Naksha-Token
//     header, or ?token= for EventSource); the page itself needs ?token=
//   - Host header must be 127.0.0.1:<port> or localhost:<port> (DNS rebinding)
//   - no CORS headers at all; a cross-origin Origin header is rejected
//   - state-changing requests must be application/json (forces a preflight
//     that we never answer)
//   - strict CSP, no-referrer, no-store

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const project = require('./project');
const events = require('./events');
const rolesLib = require('./roles');
const { createState, reduce } = require('./state');

function pluginVersion(root) {
  const manifest = project.readJSONFile(path.join(root, '.claude-plugin', 'plugin.json'));
  return (manifest && manifest.version) || 'dev';
}
const VERSION = pluginVersion(project.PLUGIN_ROOT);
const MAX_BODY = 64 * 1024;
const RESERVED_SSE = new Set(['state', 'project', 'findings', 'message', 'open', 'error']);
const MAX_SSE_CLIENTS = 32;
const HEARTBEAT_MS = 15000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store',
};

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function sseName(type) {
  return String(type).replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 64) || 'message';
}

/** Compile '/votes/:id' into a matcher. */
function compilePath(p) {
  const keys = [];
  const re = p
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { re: new RegExp(`^${re}/?$`), keys };
}

function normalizeRoutePath(p) {
  let out = String(p || '/').trim();
  if (!out.startsWith('/')) out = '/' + out;
  if (out === '/api' || out.startsWith('/api/')) out = out.slice(4) || '/';
  return out;
}

function decayWeight(recordedAt, now) {
  const t = Date.parse(recordedAt);
  if (!Number.isFinite(t)) return 1;
  const days = (now - t) / 86400000;
  if (days <= 90) return 1;
  if (days <= 180) return 0.5;
  return 0;
}

/** Summarize taste.signals per the v5.3 schema (decay + per-trait weights). */
function summarizeTaste(taste) {
  if (!taste || typeof taste !== 'object') return null;
  const signals = Array.isArray(taste.signals) ? taste.signals.filter((s) => s && typeof s === 'object') : [];
  const now = Date.now();
  const approved = new Map();
  const rejected = new Map();
  let active = 0;
  for (const s of signals) {
    const w = decayWeight(s.recorded_at, now);
    if (w > 0) active++;
    const bucket = s.verdict === 'approved' ? approved : s.verdict === 'rejected' ? rejected : null;
    if (!bucket || !Array.isArray(s.traits)) continue;
    for (const t of s.traits) {
      if (typeof t !== 'string') continue;
      bucket.set(t, (bucket.get(t) || 0) + w);
    }
  }
  const top = (m) =>
    [...m.entries()]
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([trait, weight]) => ({ trait, weight }));
  const leans = top(approved);
  const avoids = top(rejected);
  const conflicted = leans.map((l) => l.trait).filter((t) => avoids.some((a) => a.trait === t));
  const recent = signals
    .slice()
    .sort((a, b) => String(b.recorded_at || '').localeCompare(String(a.recorded_at || '')))
    .slice(0, 5)
    .map((s) => ({
      verdict: s.verdict,
      direction: typeof s.direction === 'string' ? s.direction.slice(0, 200) : '',
      context: typeof s.context === 'string' ? s.context.slice(0, 80) : undefined,
      recorded_at: s.recorded_at,
    }));
  return {
    count: signals.length,
    active,
    leans,
    avoids,
    conflicted,
    recent,
    observations: taste.observations === undefined ? undefined : taste.observations,
  };
}

function summarizeProject(raw) {
  if (!raw || typeof raw !== 'object') return { available: false };
  const brand = raw.brand && typeof raw.brand === 'object' ? raw.brand : {};
  return {
    available: true,
    name: typeof raw.name === 'string' ? raw.name : null,
    brand: {
      primary: brand.primary,
      secondary: brand.secondary,
      font: brand.font,
      voice: brand.voice,
    },
    framework: raw.framework,
    tokenFormat: raw.tokenFormat,
    schema_version: raw.schema_version,
    constraints: raw.constraints && typeof raw.constraints === 'object' ? raw.constraints : {},
    component_patterns: Array.isArray(raw.component_patterns) ? raw.component_patterns.length : 0,
    taste: summarizeTaste(raw.taste),
    updatedAt: raw.updatedAt,
  };
}

/**
 * createApp({ projectDir, pluginRoot?, publicDir?, routesDir?, token?, pollMs? })
 * → { server, token, listen(port) → Promise<{ port, url }>, close(), broadcast, snapshot }
 */
function createApp(opts) {
  if (!opts || !opts.projectDir) throw new Error('createApp: projectDir is required');
  const projectDir = path.resolve(opts.projectDir);
  const pluginRoot = path.resolve(opts.pluginRoot || project.PLUGIN_ROOT);
  if (project.isPluginPath(projectDir, { pluginRoot })) {
    throw new Error('refusing to serve the plugin directory — pass the user project dir');
  }
  const nakshaDir = path.join(projectDir, '.naksha');
  const publicDir = path.resolve(opts.publicDir || path.join(__dirname, '..', 'public'));
  const routesDir = path.resolve(opts.routesDir || path.join(__dirname, '..', 'routes'));
  const token = opts.token || crypto.randomBytes(24).toString('base64url');
  const pollMs = opts.pollMs || 400;
  const log = opts.log || ((...a) => console.error('[naksha live]', ...a));

  const roles = rolesLib.loadRoles(pluginRoot);
  const groups = rolesLib.groupRoles(roles);
  const ctx = { commandRoles: (cmd) => rolesLib.commandRoles(pluginRoot, cmd, roles) };

  let port = 0;
  let state = createState();
  const clients = new Set();
  const routes = []; // { method, path, matcher, handler, owner }

  // ── State from the event log ───────────────────────────────────────────────
  const evFile = events.eventsPath(projectDir);
  let offset = 0;
  let ino = null;
  let partial = '';

  function rebuild() {
    state = createState();
    let size = 0;
    try {
      const st = fs.statSync(evFile);
      size = st.size;
      ino = st.ino;
    } catch {
      ino = null;
    }
    for (const evt of events.readEvents(projectDir)) reduce(state, evt, ctx);
    offset = size;
    partial = '';
  }
  rebuild();

  function snapshot() {
    return { ...state, pending: undefined, version: VERSION };
  }

  function send(res, type, data) {
    try {
      res.write(`event: ${sseName(type)}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      clients.delete(res);
    }
  }

  function broadcast(type, data) {
    for (const res of clients) send(res, type, data);
  }

  let stateTimer = null;
  function scheduleState() {
    if (stateTimer) return;
    stateTimer = setTimeout(() => {
      stateTimer = null;
      broadcast('state', snapshot());
    }, 60);
  }

  function readNewBytes(size) {
    const len = size - offset;
    const buf = Buffer.alloc(len);
    const fd = fs.openSync(evFile, 'r');
    try {
      fs.readSync(fd, buf, 0, len, offset);
    } finally {
      fs.closeSync(fd);
    }
    offset = size;
    const text = partial + buf.toString('utf8');
    const lastNl = text.lastIndexOf('\n');
    partial = lastNl === -1 ? text : text.slice(lastNl + 1);
    return lastNl === -1 ? '' : text.slice(0, lastNl);
  }

  const watched = {
    project: { file: path.join(nakshaDir, 'project.json'), mtime: 0 },
    findings: { file: path.join(projectDir, 'naksha-review', 'findings.json'), mtime: 0 },
  };
  for (const w of Object.values(watched)) {
    try {
      w.mtime = fs.statSync(w.file).mtimeMs;
    } catch {
      w.mtime = 0;
    }
  }

  function poll() {
    try {
      let st = null;
      try {
        st = fs.statSync(evFile);
      } catch {
        /* no log yet */
      }
      if (!st && ino !== null) {
        rebuild(); // log deleted: reset to an empty session
        scheduleState();
      }
      if (st && ino === null) {
        ino = st.ino; // log created after start: stream it from the beginning
        offset = 0;
        partial = '';
      }
      if (st && (st.ino !== ino || st.size < offset)) {
        rebuild(); // rotated or replaced
        scheduleState();
      } else if (st && st.size > offset) {
        const fresh = events.parseLines(readNewBytes(st.size));
        for (const evt of fresh) {
          reduce(state, evt, ctx);
          // Server-owned SSE types can't be spoofed by a line in the log.
          if (!RESERVED_SSE.has(evt.type)) broadcast(evt.type, evt);
        }
        if (fresh.length) scheduleState();
      }
      for (const [type, w] of Object.entries(watched)) {
        let m = 0;
        try {
          m = fs.statSync(w.file).mtimeMs;
        } catch {
          m = 0;
        }
        if (m !== w.mtime) {
          w.mtime = m;
          broadcast(type, { changed: true, at: new Date().toISOString() });
        }
      }
    } catch (err) {
      log('poll error:', err.message);
    }
  }
  const pollTimer = setInterval(poll, pollMs);
  pollTimer.unref();
  const heartbeat = setInterval(() => {
    for (const res of clients) {
      try {
        res.write(': ping\n\n');
      } catch {
        clients.delete(res);
      }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  // ── Helpers handed to route modules ───────────────────────────────────────
  function insideProject(rel) {
    const full = path.resolve(projectDir, rel);
    if (!project.isInside(full, projectDir)) throw new Error(`path escapes the project: ${rel}`);
    return full;
  }

  const naksha = {
    version: VERSION,
    projectDir,
    nakshaDir,
    pluginRoot,
    roles,
    groups,
    readJSON: (rel) => project.readJSONFile(insideProject(rel)),
    readProject: () => project.readJSONFile(path.join(nakshaDir, 'project.json')),
    updateProject(mutator) {
      const file = path.join(nakshaDir, 'project.json');
      const current = project.readJSONFile(file);
      if (!current || typeof current !== 'object') {
        throw new Error('.naksha/project.json not found — run /naksha-init first');
      }
      const next = mutator(current) || current;
      next.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      project.writeJSONAtomic(file, next);
      return next;
    },
    broadcast,
    state: snapshot,
    log,
  };

  // ── Routing ───────────────────────────────────────────────────────────────
  function route(method, p, handler, owner = 'core') {
    if (typeof handler !== 'function') throw new Error(`route ${method} ${p}: handler must be a function`);
    const m = String(method || 'GET').toUpperCase();
    const norm = normalizeRoutePath(p);
    const clash = routes.find((r) => r.method === m && r.path === norm);
    if (clash) {
      if (clash.owner === 'core') {
        log(`route ${m} /api${norm} from ${owner} ignored: reserved by core`);
        return;
      }
      log(`route ${m} /api${norm} from ${owner} replaces ${clash.owner}`);
      routes.splice(routes.indexOf(clash), 1);
    }
    routes.push({ method: m, path: norm, matcher: compilePath(norm), handler, owner });
  }

  function listPanels() {
    try {
      return fs
        .readdirSync(path.join(publicDir, 'panels'))
        .filter((f) => /^[A-Za-z0-9_-]+\.js$/.test(f))
        .sort()
        .map((f) => `panels/${f}`);
    } catch {
      return [];
    }
  }

  // Core endpoints.
  route('GET', '/health', async (req, res, { json }) =>
    json(200, { ok: true, pid: process.pid, version: VERSION, project: path.basename(projectDir) }),
  );
  route('GET', '/state', async (req, res, { json }) => json(200, snapshot()));
  route('GET', '/roles', async (req, res, { json }) => json(200, { groups }));
  route('GET', '/project', async (req, res, { json }) => json(200, summarizeProject(naksha.readProject())));
  route('GET', '/panels', async (req, res, { json }) => json(200, { panels: listPanels() }));

  // Plugin routes: dashboard/routes/*.js, each exporting register({ route, projectDir, naksha }).
  const loadedRoutes = [];
  try {
    const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.js')).sort();
    for (const f of files) {
      try {
        const mod = require(path.join(routesDir, f));
        if (!mod || typeof mod.register !== 'function') {
          log(`routes/${f}: no register() export — skipped`);
          continue;
        }
        mod.register({
          route: (method, p, handler) => route(method, p, handler, f),
          projectDir,
          naksha,
        });
        loadedRoutes.push(f);
      } catch (err) {
        log(`routes/${f} failed to load: ${err.message}`);
      }
    }
  } catch {
    /* no routes dir */
  }

  // ── Request handling ──────────────────────────────────────────────────────
  function writeHead(res, status, headers) {
    res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  }

  function sendJSON(res, status, obj) {
    if (res.headersSent) return;
    const body = JSON.stringify(obj === undefined ? null : obj);
    writeHead(res, status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
  }

  function hostAllowed(req) {
    const host = String(req.headers.host || '').toLowerCase();
    return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
  }

  function originAllowed(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    return origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`;
  }

  function tokenFrom(req, url) {
    return req.headers['x-naksha-token'] || url.searchParams.get('token') || '';
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(Object.assign(new Error('body too large'), { status: 413 }));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  function serveStatic(req, res, url) {
    let rel = url.pathname === '/' ? '/index.html' : url.pathname;
    try {
      rel = decodeURIComponent(rel);
    } catch {
      return sendJSON(res, 400, { error: 'bad path' });
    }
    if (rel.includes('\0') || rel.split('/').some((seg) => seg.startsWith('.'))) {
      return sendJSON(res, 404, { error: 'not found' });
    }
    const full = path.resolve(publicDir, '.' + rel);
    if (!project.isInside(full, publicDir)) return sendJSON(res, 404, { error: 'not found' });
    const ext = path.extname(full);
    if (ext === '.html' && !safeEqual(url.searchParams.get('token') || '', token)) {
      writeHead(res, 401, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Naksha Live — token required</title></head>' +
          '<body><main><h1>Token required</h1><p>Open the tokenized URL printed by <code>/naksha-dashboard start</code> ' +
          '(or run <code>/naksha-dashboard status</code> to see it again).</p></main></body></html>',
      );
    }
    fs.readFile(full, (err, data) => {
      if (err) return sendJSON(res, 404, { error: 'not found' });
      writeHead(res, 200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  }

  function openStream(req, res) {
    if (clients.size >= MAX_SSE_CLIENTS) return sendJSON(res, 503, { error: 'too many streams' });
    writeHead(res, 200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    clients.add(res);
    send(res, 'state', snapshot());
    req.on('close', () => clients.delete(res));
  }

  async function handleApi(req, res, url) {
    const p = normalizeRoutePath(url.pathname);
    if (req.method === 'GET' && p === '/stream') return openStream(req, res);

    let matched = null;
    let params = {};
    let pathKnown = false;
    for (const r of routes) {
      const m = r.matcher.re.exec(p);
      if (!m) continue;
      pathKnown = true;
      if (r.method !== req.method) continue;
      matched = r;
      params = Object.fromEntries(r.matcher.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      break;
    }
    if (!matched) return sendJSON(res, pathKnown ? 405 : 404, { error: pathKnown ? 'method not allowed' : 'not found' });

    let body = null;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const ctype = String(req.headers['content-type'] || '');
      const raw = await readBody(req);
      if (raw.length) {
        if (!ctype.startsWith('application/json')) return sendJSON(res, 415, { error: 'use application/json' });
        try {
          body = JSON.parse(raw);
        } catch {
          return sendJSON(res, 400, { error: 'invalid JSON body' });
        }
      }
    }
    req.params = params;
    const query = Object.fromEntries(url.searchParams);
    delete query.token;
    let responded = false;
    const json = (status, obj) => {
      responded = true;
      sendJSON(res, status, obj);
    };
    await matched.handler(req, res, { body, query, json, params });
    if (!responded && !res.headersSent && !res.writableEnded) sendJSON(res, 204, null);
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (!hostAllowed(req)) return sendJSON(res, 403, { error: 'host not allowed' });
      if (!originAllowed(req)) return sendJSON(res, 403, { error: 'cross-origin request refused' });
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        if (!safeEqual(String(tokenFrom(req, url)), token)) return sendJSON(res, 401, { error: 'token required' });
        return await handleApi(req, res, url);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJSON(res, 405, { error: 'method not allowed' });
      return serveStatic(req, res, url);
    } catch (err) {
      log('request error:', err.message);
      sendJSON(res, err.status || 500, { error: err.status ? err.message : 'internal error' });
    }
  });

  function listen(wantPort) {
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(wantPort, '127.0.0.1', () => {
        server.off('error', reject);
        port = server.address().port;
        resolve({ port, url: `http://127.0.0.1:${port}/?token=${token}` });
      });
    });
  }

  function close() {
    clearInterval(pollTimer);
    clearInterval(heartbeat);
    if (stateTimer) clearTimeout(stateTimer);
    for (const res of clients) {
      try {
        res.end();
      } catch {
        /* already gone */
      }
    }
    clients.clear();
    return new Promise((resolve) => {
      server.close(() => resolve());
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    });
  }

  return { server, token, listen, close, broadcast, snapshot, routes, loadedRoutes, naksha, poll };
}

module.exports = { createApp, summarizeProject, summarizeTaste, normalizeRoutePath, VERSION };
