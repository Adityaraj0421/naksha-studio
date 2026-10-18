'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { REPO, tmpProject } = require('./helpers');
const { resolveProjectDir } = require('../lib/project');

const EMIT = path.join(REPO, 'dashboard', 'hooks', 'emit.js');

function emit(payload, env = {}) {
  const out = execFileSync(process.execPath, [EMIT], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: REPO, ...env },
    encoding: 'utf8',
  });
  assert.deepEqual(JSON.parse(out), {}); // always valid JSON, never adds context
  return out;
}

function eventsOf(dir) {
  const file = path.join(dir, '.naksha', 'events.jsonl');
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : null;
}

test('project resolution walks up at most 3 levels', () => {
  const p = tmpProject();
  try {
    const deep = path.join(p.dir, 'a', 'b', 'c');
    fs.mkdirSync(path.join(deep, 'd'), { recursive: true });
    const real = fs.realpathSync(p.dir);
    assert.equal(resolveProjectDir(p.dir, { pluginRoot: REPO }), real);
    assert.equal(resolveProjectDir(deep, { pluginRoot: REPO }), real); // 3 levels up
    assert.equal(resolveProjectDir(path.join(deep, 'd'), { pluginRoot: REPO }), null); // 4 levels: too far
  } finally {
    p.cleanup();
  }
});

test('project resolution never returns the plugin dir', () => {
  // The repo is the plugin; even with a .naksha/ present it must be refused.
  const nakshaInRepo = path.join(REPO, '.naksha');
  const existed = fs.existsSync(nakshaInRepo);
  if (!existed) fs.mkdirSync(nakshaInRepo);
  try {
    assert.equal(resolveProjectDir(REPO, { pluginRoot: REPO }), null);
    assert.equal(resolveProjectDir(path.join(REPO, 'dashboard', 'lib'), { pluginRoot: REPO }), null);
    const p = tmpProject();
    try {
      assert.equal(resolveProjectDir(p.dir, { pluginRoot: p.dir }), null); // pluginRoot option honoured
    } finally {
      p.cleanup();
    }
  } finally {
    if (!existed) fs.rmSync(nakshaInRepo, { recursive: true, force: true });
  }
});

test('emit is a no-op when the dashboard is disabled or not set up', () => {
  for (const enabled of [false, undefined]) {
    const p = tmpProject({ enabled });
    try {
      emit({ hook_event_name: 'UserPromptSubmit', session_id: 's1', cwd: p.dir, prompt: '/design hero' });
      emit({ hook_event_name: 'PreToolUse', session_id: 's1', cwd: p.dir, tool_name: 'Read' });
      assert.equal(eventsOf(p.dir), null);
      assert.equal(fs.existsSync(path.join(p.dir, '.naksha', 'dashboard.session')), false);
    } finally {
      p.cleanup();
    }
  }
});

test('emit exits 0 with {} on empty or garbage stdin and outside any project', () => {
  for (const input of ['', 'not json', '[]']) {
    const out = execFileSync(process.execPath, [EMIT], { input, cwd: require('os').tmpdir(), encoding: 'utf8' });
    assert.equal(out.trim(), '{}');
  }
});

test('emit records commands by name only, never prompt text', () => {
  const p = tmpProject({ enabled: true });
  try {
    const sub = path.join(p.dir, 'src');
    fs.mkdirSync(sub);
    emit({ hook_event_name: 'UserPromptSubmit', session_id: 'abc', cwd: sub, prompt: '/naksha:design-review my secret launch page' });
    emit({ hook_event_name: 'UserPromptSubmit', session_id: 'abc', cwd: sub, prompt: '/not-a-naksha-command secret' });
    emit({ hook_event_name: 'UserPromptSubmit', session_id: 'abc', cwd: sub, prompt: 'plain secret prompt' });
    emit({
      hook_event_name: 'PreToolUse', session_id: 'abc', cwd: sub, tool_name: 'Agent',
      tool_input: { subagent_type: 'general-purpose', description: 'UI Designer builds hero', prompt: 'secret brief' },
    });
    emit({ hook_event_name: 'SubagentStart', session_id: 'abc', cwd: sub, agent_type: 'naksha:design-critic', agent_id: 'ag-1' });
    emit({ hook_event_name: 'SubagentStop', session_id: 'abc', cwd: sub, agent_type: 'naksha:design-critic', agent_id: 'ag-1' });
    emit({ hook_event_name: 'Stop', session_id: 'abc', cwd: sub });
    emit({ hook_event_name: 'SessionEnd', session_id: 'abc', cwd: sub, reason: 'prompt_input_exit' });

    const raw = fs.readFileSync(path.join(p.dir, '.naksha', 'events.jsonl'), 'utf8');
    assert.doesNotMatch(raw, /secret/);
    const ev = eventsOf(p.dir);
    assert.deepEqual(ev.map((e) => e.type), [
      'session_start', 'command', 'tool', 'subagent_start', 'subagent_stop', 'turn_end', 'session_end',
    ]);
    assert.equal(ev[1].cmd, 'design-review');
    assert.deepEqual(ev[2].roles, ['UI Designer']);
    assert.deepEqual(ev[3].roles, ['UX Researcher', 'Creative Director']);
    assert.equal(ev[3].agent, 'design-critic');
    assert.equal(ev[6].reason, 'prompt_input_exit');
    assert.ok(ev.every((e) => e.sid === 'abc' && typeof e.ts === 'string'));
  } finally {
    p.cleanup();
  }
});

test('emit caps events.jsonl at 5 MB, keeping the last 2,000 lines', () => {
  const p = tmpProject({ enabled: true });
  try {
    const file = path.join(p.dir, '.naksha', 'events.jsonl');
    const line = (i) => JSON.stringify({ ts: '2026-01-01T00:00:00Z', sid: 'old', type: 'tool', tool: 'Read', pad: 'x'.repeat(60), i });
    const lines = [];
    let size = 0;
    for (let i = 0; size <= 5 * 1024 * 1024; i++) {
      const l = line(i);
      lines.push(l);
      size += l.length + 1;
    }
    fs.writeFileSync(file, lines.join('\n') + '\n');
    emit({ hook_event_name: 'PreToolUse', session_id: 'new', cwd: p.dir, tool_name: 'Write' });
    const after = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    assert.ok(fs.statSync(file).size < 1024 * 1024, 'file was rotated');
    // 2,000 kept + session_start + tool
    assert.equal(after.length, 2002);
    assert.equal(JSON.parse(after[0]).i, lines.length - 2000);
    assert.equal(JSON.parse(after[after.length - 1]).tool, 'Write');
  } finally {
    p.cleanup();
  }
});

test('emit records a naksha command Claude runs through the Skill tool', () => {
  const p = tmpProject({ enabled: true });
  try {
    const skill = (s, event = 'PreToolUse') =>
      emit({ hook_event_name: event, session_id: 'sk', cwd: p.dir, tool_name: 'Skill', tool_input: { skill: s, args: 'secret args' } });
    skill('naksha:design-review');
    skill('naksha:design-review', 'PostToolUse'); // only the PreToolUse call starts a run
    skill('naksha-studio:naksha-init');
    skill('naksha:not-a-command');
    skill('other-plugin:design');
    skill('design-qa'); // un-namespaced: could be any plugin's skill
    const raw = fs.readFileSync(path.join(p.dir, '.naksha', 'events.jsonl'), 'utf8');
    assert.doesNotMatch(raw, /secret/);
    const ev = eventsOf(p.dir);
    assert.deepEqual(ev.filter((e) => e.type === 'command').map((e) => e.cmd), ['design-review', 'naksha-init']);
    assert.equal(ev.filter((e) => e.type === 'tool' && e.tool === 'Skill').length, 6);
  } finally {
    p.cleanup();
  }
});

test('emit maps /design-review verifier agents to the roles that own the findings', () => {
  const p = tmpProject({ enabled: true });
  try {
    const agent = (ti) => emit({ hook_event_name: 'PreToolUse', session_id: 'v', cwd: p.dir, tool_name: 'Agent', tool_input: ti });
    const brief = (dims) =>
      'You are an independent design-review verifier. Your job is to try to DISPROVE\nFinding: ' +
      dims.map((d) => JSON.stringify({ id: 'F-001', dimension: d, title: 'secret title' })).join('\n');
    agent({ subagent_type: 'general-purpose', description: 'Verify F-001', prompt: brief(['accessibility']) });
    agent({ subagent_type: 'general-purpose', description: 'Verify F-002', prompt: brief(['spacing', 'color']) });
    agent({ subagent_type: 'general-purpose', description: 'Verify F-003 (Content Designer)', prompt: brief(['typography']) });
    agent({ subagent_type: 'general-purpose', description: 'Explore', prompt: 'look at "dimension": "accessibility"' });
    const raw = fs.readFileSync(path.join(p.dir, '.naksha', 'events.jsonl'), 'utf8');
    assert.doesNotMatch(raw, /secret|DISPROVE/);
    const tools = eventsOf(p.dir).filter((e) => e.type === 'tool');
    assert.deepEqual(tools.map((e) => e.roles), [
      ['UX Researcher'],
      ['Design System Lead', 'UI Designer'],
      ['Content Designer'], // a role named in the description wins
      undefined, // not a verifier brief
    ]);
  } finally {
    p.cleanup();
  }
});
