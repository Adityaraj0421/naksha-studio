#!/usr/bin/env node
'use strict';
// Naksha Live — opt-in local dashboard. Zero dependencies (node:http + SSE).
//
//   node dashboard/server.js setup   [--project DIR]   enable + write .naksha/dashboard.json
//   node dashboard/server.js start   [--project DIR] [--port N]   run in background, print URL
//   node dashboard/server.js stop    [--project DIR]
//   node dashboard/server.js status  [--project DIR] [--json]
//   node dashboard/server.js disable [--project DIR]   stop + "enabled": false
//   node dashboard/server.js serve   [--project DIR] [--port N]   foreground (used by start)
//
// DIR defaults to the current directory; the project root is found by walking
// up at most 3 levels to a `.naksha/` directory. The plugin dir is never used.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const project = require('./lib/project');
const events = require('./lib/events');

const RUNTIME_FILE = 'dashboard.runtime.json';
const LOG_FILE = 'dashboard.log';
const GITIGNORE_ENTRIES = ['events.jsonl', 'events.jsonl.*.tmp', RUNTIME_FILE, LOG_FILE, 'dashboard.session'];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project' || a === '--port') args[a.slice(2)] = argv[++i];
    else if (a.startsWith('--project=') || a.startsWith('--port=')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v;
    } else if (a === '--json') args.json = true;
    else args._.push(a);
  }
  return args;
}

function fail(msg, code = 1) {
  process.stderr.write(`naksha live: ${msg}\n`);
  process.exit(code);
}

function runtimePath(dir) {
  return path.join(dir, '.naksha', RUNTIME_FILE);
}

function readRuntime(dir) {
  return project.readJSONFile(runtimePath(dir));
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/** Ask a running server for /api/health with its token. Resolves null on failure. */
function health(rt, timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!rt || !rt.port || !rt.token) return resolve(null);
    const req = http.get(
      {
        host: '127.0.0.1',
        port: rt.port,
        path: '/api/health',
        headers: { 'X-Naksha-Token': rt.token, Host: `127.0.0.1:${rt.port}` },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(res.statusCode === 200 ? JSON.parse(body) : null);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}

/** The running server for this project, verified by pid AND token-authenticated health. */
async function running(dir) {
  const rt = readRuntime(dir);
  if (!rt || !pidAlive(rt.pid)) return null;
  const h = await health(rt);
  return h && h.pid === rt.pid ? rt : null;
}

function ensureGitignore(nakshaDir) {
  const file = path.join(nakshaDir, '.gitignore');
  let existing = '';
  try {
    existing = fs.readFileSync(file, 'utf8');
  } catch {
    /* new file */
  }
  const have = new Set(existing.split('\n').map((l) => l.trim()));
  const missing = GITIGNORE_ENTRIES.filter((e) => !have.has(e));
  if (!missing.length) return false;
  const header = existing ? '' : '# Naksha Live — local runtime files (never commit the token or event log)\n';
  const sep = existing && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(file, existing + sep + header + missing.join('\n') + '\n');
  return true;
}

function resolveDir(args, { forSetup = false } = {}) {
  const start = path.resolve(args.project || process.cwd());
  const dir = forSetup ? project.resolveSetupDir(start) : project.resolveProjectDir(start);
  if (!dir) {
    if (project.isPluginPath(start)) fail('this is the naksha plugin directory — run from your own project.');
    fail(`no .naksha/ found in ${start} or up to 3 parents — run /naksha-dashboard setup (or /naksha-init) first.`);
  }
  return dir;
}

function writeConfig(dir, patch) {
  const file = project.configPath(dir);
  const current = project.readConfig(dir) || {};
  const next = { ...current, ...patch };
  project.writeJSONAtomic(file, next);
  return next;
}

// ── Commands ─────────────────────────────────────────────────────────────────

function cmdSetup(args) {
  const dir = resolveDir(args, { forSetup: true });
  const nakshaDir = path.join(dir, '.naksha');
  fs.mkdirSync(nakshaDir, { recursive: true });
  const prev = project.readConfig(dir) || {};
  const cfg = writeConfig(dir, {
    enabled: true,
    port: project.configuredPort(prev),
    enabledAt: prev.enabledAt || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  const gi = ensureGitignore(nakshaDir);
  console.log(`Naksha Live enabled for ${dir}`);
  console.log(`  config     .naksha/dashboard.json  (enabled: true, port: ${cfg.port})`);
  console.log(`  events     .naksha/events.jsonl    (written by hooks; capped at 5 MB → last 2,000 events)`);
  console.log(`  gitignore  .naksha/.gitignore      ${gi ? '(updated)' : '(already covered)'}`);
  console.log('Next: /naksha-dashboard start');
}

async function cmdDisable(args) {
  const dir = resolveDir(args);
  const rt = await running(dir);
  if (rt) await stopServer(dir, rt);
  writeConfig(dir, { enabled: false });
  console.log(`Naksha Live disabled for ${dir} — hooks are now no-ops${rt ? ' and the server was stopped' : ''}.`);
  const ev = events.eventsPath(dir);
  if (fs.existsSync(ev)) console.log(`Event history kept at .naksha/events.jsonl — delete it to remove it.`);
}

async function cmdStatus(args) {
  const dir = resolveDir(args);
  const cfg = project.readConfig(dir);
  const rt = await running(dir);
  let size = 0;
  let lines = 0;
  try {
    const text = fs.readFileSync(events.eventsPath(dir), 'utf8');
    size = Buffer.byteLength(text);
    lines = text.split('\n').filter(Boolean).length;
  } catch {
    /* no events */
  }
  const status = {
    project: dir,
    enabled: project.isEnabled(cfg),
    port: rt ? rt.port : project.configuredPort(cfg),
    running: Boolean(rt),
    pid: rt ? rt.pid : null,
    url: rt ? rt.url : null,
    startedAt: rt ? rt.startedAt : null,
    events: lines,
    eventsBytes: size,
  };
  if (args.json) return console.log(JSON.stringify(status, null, 2));
  console.log(`Naksha Live — ${dir}`);
  console.log(`  enabled   ${status.enabled ? 'yes' : 'no (run /naksha-dashboard setup)'}`);
  console.log(`  server    ${rt ? `running (pid ${rt.pid}, since ${rt.startedAt})` : 'stopped'}`);
  if (rt) console.log(`  url       ${rt.url}`);
  console.log(`  events    ${lines} (${(size / 1024).toFixed(1)} KB)`);
}

async function stopServer(dir, rt) {
  try {
    process.kill(rt.pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
  for (let i = 0; i < 30 && pidAlive(rt.pid); i++) await new Promise((r) => setTimeout(r, 100));
  const cur = readRuntime(dir);
  if (cur && cur.pid === rt.pid) fs.rmSync(runtimePath(dir), { force: true });
}

async function cmdStop(args) {
  const dir = resolveDir(args);
  const rt = await running(dir);
  if (!rt) {
    // Stale runtime file (crashed or reused pid) — never kill a pid we cannot verify.
    if (readRuntime(dir)) fs.rmSync(runtimePath(dir), { force: true });
    return console.log('Naksha Live is not running.');
  }
  await stopServer(dir, rt);
  console.log(`Naksha Live stopped (pid ${rt.pid}).`);
}

async function cmdStart(args) {
  const dir = resolveDir(args);
  const cfg = project.readConfig(dir);
  if (!project.isEnabled(cfg)) fail('Naksha Live is not enabled here — run /naksha-dashboard setup first.');
  const existing = await running(dir);
  if (existing) {
    console.log(`Naksha Live is already running (pid ${existing.pid}).`);
    console.log(`Open: ${existing.url}`);
    return;
  }
  const nakshaDir = path.join(dir, '.naksha');
  ensureGitignore(nakshaDir);
  const logFd = fs.openSync(path.join(nakshaDir, LOG_FILE), 'a', 0o600);
  const childArgs = [__filename, 'serve', '--project', dir];
  if (args.port) childArgs.push('--port', String(args.port));
  const child = spawn(process.execPath, childArgs, {
    cwd: dir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  });
  child.unref();
  fs.closeSync(logFd);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const rt = readRuntime(dir);
    if (rt && rt.pid === child.pid) {
      console.log(`Naksha Live is running (pid ${rt.pid}) — local only, 127.0.0.1:${rt.port}.`);
      console.log(`Open: ${rt.url}`);
      console.log('The token in this URL changes on every start. Stop with /naksha-dashboard stop.');
      return;
    }
    if (!pidAlive(child.pid)) break;
  }
  let tail = '';
  try {
    tail = fs.readFileSync(path.join(nakshaDir, LOG_FILE), 'utf8').trim().split('\n').slice(-3).join('\n');
  } catch {
    /* no log */
  }
  fail(`server did not start.${tail ? `\n${tail}` : ''}`);
}

async function cmdServe(args) {
  const { createApp } = require('./lib/app');
  const dir = resolveDir(args);
  const cfg = project.readConfig(dir) || {};
  const port = args.port !== undefined ? Number(args.port) : project.configuredPort(cfg);
  const app = createApp({ projectDir: dir });
  let info;
  try {
    info = await app.listen(port);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      fail(`port ${port} is in use — set a different "port" in .naksha/dashboard.json.`);
    }
    throw err;
  }
  const rt = {
    pid: process.pid,
    port: info.port,
    url: info.url,
    token: app.token,
    startedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    project: dir,
  };
  project.writeJSONAtomic(runtimePath(dir), rt, 0o600);
  console.log(`[${rt.startedAt}] Naksha Live serving ${dir} on 127.0.0.1:${info.port}`);
  if (process.stdout.isTTY) console.log(`Open: ${info.url}`);
  if (app.loadedRoutes.length) console.log(`  route modules: ${app.loadedRoutes.join(', ')}`);

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    const cur = readRuntime(dir);
    if (cur && cur.pid === process.pid) fs.rmSync(runtimePath(dir), { force: true });
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGHUP', shutdown);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'status';
  const table = {
    setup: cmdSetup,
    start: cmdStart,
    stop: cmdStop,
    status: cmdStatus,
    disable: cmdDisable,
    serve: cmdServe,
  };
  if (!table[cmd]) fail(`unknown command "${cmd}" — use setup | start | stop | status | disable | serve`, 2);
  await table[cmd](args);
}

if (require.main === module) {
  main().catch((err) => fail(err && err.stack ? err.stack : String(err)));
}

module.exports = { parseArgs, ensureGitignore, GITIGNORE_ENTRIES };
