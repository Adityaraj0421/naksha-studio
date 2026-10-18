'use strict';
// Append-only event log at <project>/.naksha/events.jsonl, capped in size.

const fs = require('fs');
const path = require('path');

const EVENTS_FILE = 'events.jsonl';
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // rotate past 5 MB…
const KEEP_LINES = 2000; // …keeping the newest 2,000 events

function eventsPath(projectDir) {
  return path.join(projectDir, '.naksha', EVENTS_FILE);
}

function rotate(file, keepLines = KEEP_LINES) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  const lines = text.split('\n').filter(Boolean);
  const kept = lines.slice(-keepLines);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, kept.length ? kept.join('\n') + '\n' : '', { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/**
 * Append one event as a single JSON line. Small appends with O_APPEND are
 * atomic on local filesystems, so concurrent hooks do not interleave lines.
 */
function appendEvent(projectDir, evt, opts = {}) {
  const maxBytes = opts.maxBytes || DEFAULT_MAX_BYTES;
  const file = eventsPath(projectDir);
  const line = JSON.stringify(evt) + '\n';
  let size = 0;
  try {
    size = fs.statSync(file).size;
  } catch {
    /* first event */
  }
  if (size + Buffer.byteLength(line) > maxBytes) rotate(file, opts.keepLines || KEEP_LINES);
  fs.appendFileSync(file, line, { mode: 0o600 });
}

function parseLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const evt = JSON.parse(line);
      if (evt && typeof evt === 'object' && typeof evt.type === 'string') out.push(evt);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}

/** Read every event currently in the log (the file is capped, so this is bounded). */
function readEvents(projectDir) {
  try {
    return parseLines(fs.readFileSync(eventsPath(projectDir), 'utf8'));
  } catch {
    return [];
  }
}

module.exports = {
  EVENTS_FILE,
  DEFAULT_MAX_BYTES,
  KEEP_LINES,
  eventsPath,
  appendEvent,
  rotate,
  parseLines,
  readEvents,
};
