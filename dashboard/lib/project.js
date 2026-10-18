'use strict';
// Project resolution and dashboard config for Naksha Live.
// Everything here works on the USER'S project — never the plugin install dir.

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_PORT = 7433;
const MAX_WALK_UP = 3;

function realish(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function dirExists(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function pluginRoots(extra) {
  return [extra, PLUGIN_ROOT, process.env.CLAUDE_PLUGIN_ROOT]
    .filter(Boolean)
    .map(realish);
}

/** True when `dir` is the plugin itself or anywhere inside it. */
function isPluginPath(dir, opts = {}) {
  const real = realish(dir);
  return pluginRoots(opts.pluginRoot).some((root) => isInside(real, root));
}

/**
 * Find the user's project root: the nearest directory, starting at `startDir`
 * and walking up at most 3 parents, that contains a `.naksha/` directory.
 * Returns null when nothing is found or when `startDir` lies inside the plugin
 * install dir (the defect in the old feature/dashboard branch).
 */
function resolveProjectDir(startDir, opts = {}) {
  if (!startDir) return null;
  let current = realish(startDir);
  if (isPluginPath(current, opts)) return null;
  for (let i = 0; i <= MAX_WALK_UP; i++) {
    if (dirExists(path.join(current, '.naksha'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

/** Like resolveProjectDir, but falls back to `startDir` itself (for setup). */
function resolveSetupDir(startDir, opts = {}) {
  const found = resolveProjectDir(startDir, opts);
  if (found) return found;
  if (!startDir || isPluginPath(startDir, opts)) return null;
  return realish(startDir);
}

function readJSONFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function configPath(projectDir) {
  return path.join(projectDir, '.naksha', 'dashboard.json');
}

/** Returns the parsed .naksha/dashboard.json, or null. */
function readConfig(projectDir) {
  const cfg = readJSONFile(configPath(projectDir));
  return cfg && typeof cfg === 'object' && !Array.isArray(cfg) ? cfg : null;
}

function isEnabled(cfg) {
  return Boolean(cfg && cfg.enabled === true);
}

function configuredPort(cfg) {
  const port = cfg && Number(cfg.port);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

/** Atomic JSON write (tmp + rename) with owner-only permissions. */
function writeJSONAtomic(file, data, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode });
  fs.renameSync(tmp, file);
}

module.exports = {
  PLUGIN_ROOT,
  DEFAULT_PORT,
  MAX_WALK_UP,
  isInside,
  isPluginPath,
  resolveProjectDir,
  resolveSetupDir,
  readJSONFile,
  readConfig,
  isEnabled,
  configuredPort,
  configPath,
  writeJSONAtomic,
};
