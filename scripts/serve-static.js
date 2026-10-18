#!/usr/bin/env node
'use strict';
// serve-static.js — zero-dependency static file server for headless browser checks.
// Headless capture blocks file:// pages, so the browser self-check serves the file
// over http first. Binds 127.0.0.1 on a free port (port 0) so parallel runs never
// collide, prints `port <n>` once listening, and exits by itself after --ttl seconds
// with no requests (default 900) so a forgotten server can't linger.
// Usage: node scripts/serve-static.js <dir> [--ttl <seconds>]

const fs = require('fs');
const http = require('http');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function createServer(dir, { ttl = 900 } = {}) {
  const root = path.resolve(dir);
  let timer;
  const server = http.createServer((req, res) => {
    arm();
    let rel;
    try { rel = decodeURIComponent((req.url || '/').split('?')[0]); } catch { rel = '/'; }
    let file = path.join(root, path.normalize(rel));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  function arm() {
    if (!ttl) return;
    clearTimeout(timer);
    timer = setTimeout(() => { server.close(); if (server.closeAllConnections) server.closeAllConnections(); }, ttl * 1000);
    timer.unref();
  }
  server.on('listening', arm);
  return server;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--ttl');
  const ttlIdx = args.indexOf('--ttl');
  const ttl = ttlIdx >= 0 ? Number(args[ttlIdx + 1]) : 900;
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error('usage: node scripts/serve-static.js <dir> [--ttl <seconds>]');
    process.exit(2);
  }
  const server = createServer(dir, { ttl: Number.isFinite(ttl) ? ttl : 900 });
  server.listen(0, '127.0.0.1', () => console.log(`port ${server.address().port}`));
}

module.exports = { createServer };
