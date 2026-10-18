'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { REPO } = require('./helpers');
const { createState, reduce } = require('../lib/state');
const roles = require('../lib/roles');

const roster = roles.loadRoles(REPO);
const ctx = { commandRoles: (cmd) => roles.commandRoles(REPO, cmd, roster) };
const run = (events) => events.reduce((s, e, i) => reduce(s, { ts: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`, sid: 's1', ...e }, ctx), createState());

test('roster has 30 roles in groups, Leadership first', () => {
  assert.equal(roster.length, 30);
  const groups = roles.groupRoles(roster);
  assert.equal(groups[0].name, 'Leadership');
  assert.equal(groups.reduce((n, g) => n + g.roles.length, 0), 30);
});

test('command staffs roles; subagents move them active → done; handoff trail recorded', () => {
  const s = run([
    { type: 'command', cmd: 'design-review' },
    { type: 'tool', tool: 'Agent', roles: ['UI Designer'] },
    { type: 'subagent_start', agent: 'general-purpose', aid: 'a1', roles: [] },
    { type: 'subagent_start', agent: 'design-critic', aid: 'a2', roles: ['UX Researcher', 'Creative Director'] },
    { type: 'subagent_stop', agent: 'general-purpose', aid: 'a1', roles: [] },
  ]);
  assert.equal(s.roles['Design Manager'].state, 'active');
  assert.ok(s.staffed.includes('UX Researcher'));
  assert.equal(s.roles['UI Designer'].state, 'done'); // inherited a1 via the pending Agent call
  assert.equal(s.roles['UX Researcher'].state, 'active');
  assert.deepEqual(s.trail, ['Design Manager', 'UI Designer', 'UX Researcher', 'Creative Director']);
  assert.deepEqual(Object.keys(s.subagents), ['a2']);
  assert.equal(s.tools.Agent, 1);
});

test('turn_end finishes roles except those held by running subagents; session_end finishes all', () => {
  let s = run([
    { type: 'command', cmd: 'design' },
    { type: 'subagent_start', agent: 'design-critic', aid: 'a2', roles: ['UX Researcher'] },
    { type: 'turn_end' },
  ]);
  assert.equal(s.roles['Design Manager'].state, 'done');
  assert.equal(s.roles['UX Researcher'].state, 'active');
  s = reduce(s, { ts: '2026-01-01T00:01:00Z', sid: 's1', type: 'session_end' }, ctx);
  assert.equal(s.roles['UX Researcher'].state, 'done');
  assert.ok(s.endedAt);
});

test('a new session id resets the state', () => {
  let s = run([{ type: 'command', cmd: 'design' }, { type: 'tool', tool: 'Read' }]);
  s = reduce(s, { ts: '2026-01-02T00:00:00Z', sid: 's2', type: 'session_start' }, ctx);
  assert.equal(s.sid, 's2');
  assert.deepEqual(s.roles, {});
  assert.equal(s.toolTotal, 0);
});

test('agent and text heuristics return role names only', () => {
  assert.deepEqual(roles.rolesForAgent('naksha:figma-creator', roster), ['UI Designer']);
  assert.deepEqual(roles.rolesForAgent('ux-researcher', roster), ['UX Researcher']);
  assert.deepEqual(roles.rolesInText('Have the Video/Content Producer draft it', roster), ['Video/Content Producer']);
  assert.deepEqual(roles.rolesInText('nothing relevant', roster), []);
});
