'use strict';
// Shared test helpers (not a test file itself — node --test only runs *.test.js).

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const REPO = path.resolve(__dirname, '..', '..');

function tmpProject(opts = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha live test '));
  const dir = path.join(root, 'proj');
  fs.mkdirSync(path.join(dir, '.naksha'), { recursive: true });
  if (opts.enabled !== undefined) {
    fs.writeFileSync(path.join(dir, '.naksha', 'dashboard.json'), JSON.stringify({ enabled: opts.enabled, ...(opts.config || {}) }));
  }
  return { root, dir, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

/** Minimal HTTP client that lets tests set any Host header. */
function request(port, pathname, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: pathname, method, headers: { Host: `127.0.0.1:${port}`, ...headers } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            /* not JSON */
          }
          resolve({ status: res.statusCode, headers: res.headers, text: data, json });
        });
      },
    );
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

module.exports = { REPO, tmpProject, request };
