'use strict';
// Tests for scripts/scan-transcripts.js. Transcripts are synthetic.
// Run: node --test scripts/test/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const scan = require('../scan-transcripts');

const vocab = scan.loadVocabulary();
const opts = { maxChars: 2000, includeDev: false };

function scanLines(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha-scan-'));
  try {
    const file = path.join(dir, 'sess.jsonl');
    fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    const counts = { lines: 0, unparseable: 0, ignored: 0, messages: 0, devTurnsSkipped: 0, filesUnreadable: 0 };
    return scan.scanFile(file, vocab, opts, counts);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const cwd = '/work/landing';
const user = (content) => ({ type: 'user', sessionId: 's', cwd, message: { role: 'user', content } });
const assistant = (content) => ({ type: 'assistant', sessionId: 's', cwd, message: { role: 'assistant', content } });
const skill = (name, args) => ({ type: 'tool_use', name: 'Skill', input: { skill: name, args } });
const read = (ref) => ({ type: 'tool_use', name: 'Read', input: { file_path: `/plugin/skills/design/references/${ref}` } });

test('skillCommand recognises naksha commands run through the Skill tool', () => {
  assert.equal(scan.skillCommand(skill('naksha:design-review'), vocab), '/design-review');
  assert.equal(scan.skillCommand(skill('naksha-studio:naksha-init'), vocab), '/naksha-init');
  assert.equal(scan.skillCommand(skill('naksha:design'), vocab), null, 'orchestrator skill, not a command run');
  assert.equal(scan.skillCommand(skill('other-plugin:design-review'), vocab), null);
  assert.equal(scan.skillCommand(skill('naksha:not-a-command'), vocab), null);
  assert.equal(scan.skillCommand({ type: 'tool_use', name: 'Read', input: {} }, vocab), null);
});

test('each naksha command Claude runs through Skill gets its own turn', () => {
  const inv = scanLines([
    user('build a landing page for naksha'),
    assistant([skill('naksha:naksha-init', 'landing page')]),
    user([{ type: 'tool_result', tool_use_id: 't1', content: 'Launching skill: naksha:naksha-init' }]),
    assistant([{ type: 'text', text: 'Initialised.' }, skill('naksha:design', 'hero')]),
    assistant([read('ui-designer.md'), { type: 'text', text: 'Built the hero.' }]),
    assistant([{ type: 'text', text: 'Now reviewing.' }, skill('naksha:design-review', 'index.html')]),
    assistant([read('ux-researcher.md'), { type: 'text', text: 'Review done.' }]),
    assistant([skill('naksha:design-review', 'again')]), // same command again: stays in its turn
  ]);
  assert.deepEqual(inv.map((i) => i.command), ['/naksha-init', '/design-review']);
  assert.match(inv[0].output, /Built the hero/, 'naksha:design is the orchestrator, not a new command');
  assert.deepEqual(inv[0].referencesLoaded, ['ui-designer.md']);
  assert.match(inv[1].task, /^\/design-review index\.html/);
  assert.deepEqual(inv[1].referencesLoaded, ['ux-researcher.md']);
  assert.doesNotMatch(inv[1].output, /Built the hero/);
});
