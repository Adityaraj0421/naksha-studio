'use strict';
// Pure reducer: folds events.jsonl lines into the live state of the CURRENT session.
// A new session_id resets the state, so the org chart always shows this session.

const { DESIGN_MANAGER } = require('./roles');

const FEED_LIMIT = 40;
const TRAIL_LIMIT = 40;
const COMMAND_LIMIT = 20;

function createState() {
  return {
    sid: null,
    startedAt: null,
    endedAt: null,
    lastEventAt: null,
    command: null,
    commands: [],
    roles: {}, // name → { state: 'active'|'done', count, lastAt }
    staffed: [], // roles the current command is expected to use
    trail: [], // role names in activation order → handoff lines
    tools: {},
    toolTotal: 0,
    subagents: {}, // agent_id → { agent, roles, startedAt }
    pending: [], // role groups announced by an Agent/Task call, awaiting SubagentStart
    feed: [],
    eventCount: 0,
  };
}

function activate(state, role, ts) {
  const cur = state.roles[role] || { state: 'idle', count: 0, lastAt: null };
  if (cur.state !== 'active') cur.count += 1;
  cur.state = 'active';
  cur.lastAt = ts;
  state.roles[role] = cur;
  if (state.trail[state.trail.length - 1] !== role) {
    state.trail.push(role);
    if (state.trail.length > TRAIL_LIMIT) state.trail.splice(0, state.trail.length - TRAIL_LIMIT);
  }
}

function rolesHeldBySubagents(state) {
  const held = new Set();
  for (const sa of Object.values(state.subagents)) for (const r of sa.roles) held.add(r);
  return held;
}

function finish(state, role, ts) {
  const cur = state.roles[role];
  if (!cur || cur.state !== 'active') return;
  if (rolesHeldBySubagents(state).has(role)) return; // still busy in another subagent
  cur.state = 'done';
  cur.lastAt = ts;
}

function finishAll(state, ts, { keepSubagents }) {
  const held = keepSubagents ? rolesHeldBySubagents(state) : new Set();
  for (const [name, cur] of Object.entries(state.roles)) {
    if (cur.state === 'active' && !held.has(name)) {
      cur.state = 'done';
      cur.lastAt = ts;
    }
  }
}

function list(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}

/**
 * reduce(state, evt, ctx) → state (mutated in place and returned).
 * ctx.commandRoles(cmd) → role names a command staffs (optional).
 */
function reduce(state, evt, ctx = {}) {
  if (!evt || typeof evt.type !== 'string') return state;
  const ts = typeof evt.ts === 'string' ? evt.ts : new Date().toISOString();

  if (evt.sid && evt.sid !== state.sid) {
    const fresh = createState();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh, { sid: evt.sid, startedAt: ts });
  }
  if (!state.startedAt) state.startedAt = ts;
  state.lastEventAt = ts;
  state.eventCount += 1;

  switch (evt.type) {
    case 'session_start':
      state.endedAt = null;
      break;

    case 'command': {
      if (typeof evt.cmd !== 'string') break;
      state.command = evt.cmd;
      state.commands.unshift({ cmd: evt.cmd, at: ts });
      if (state.commands.length > COMMAND_LIMIT) state.commands.length = COMMAND_LIMIT;
      const staffed = ctx.commandRoles ? ctx.commandRoles(evt.cmd) : [DESIGN_MANAGER];
      state.staffed = staffed.filter((r) => r !== DESIGN_MANAGER);
      activate(state, DESIGN_MANAGER, ts);
      break;
    }

    case 'tool': {
      const tool = typeof evt.tool === 'string' ? evt.tool : 'unknown';
      state.tools[tool] = (state.tools[tool] || 0) + 1;
      state.toolTotal += 1;
      const roles = list(evt.roles);
      if (roles.length) {
        state.pending.push(roles);
        roles.forEach((r) => activate(state, r, ts));
      }
      break;
    }

    case 'subagent_start': {
      let roles = list(evt.roles);
      if (!roles.length && state.pending.length) roles = state.pending.shift();
      else if (roles.length && state.pending.length) state.pending.shift();
      const id = typeof evt.aid === 'string' && evt.aid ? evt.aid : `anon-${state.eventCount}`;
      state.subagents[id] = { agent: evt.agent || 'agent', roles, startedAt: ts };
      roles.forEach((r) => activate(state, r, ts));
      break;
    }

    case 'subagent_stop': {
      const id = typeof evt.aid === 'string' ? evt.aid : '';
      let sa = state.subagents[id];
      if (!sa) {
        // No id match (older payloads): close the oldest subagent of the same type.
        const match = Object.entries(state.subagents).find(([, v]) => v.agent === evt.agent);
        if (match) {
          sa = match[1];
          delete state.subagents[match[0]];
        }
      } else {
        delete state.subagents[id];
      }
      const roles = sa ? sa.roles : list(evt.roles);
      roles.forEach((r) => finish(state, r, ts));
      break;
    }

    case 'turn_end':
      state.pending = [];
      finishAll(state, ts, { keepSubagents: true });
      break;

    case 'session_end':
      state.pending = [];
      state.subagents = {};
      state.endedAt = ts;
      finishAll(state, ts, { keepSubagents: false });
      break;

    default:
      break;
  }

  if (evt.type !== 'tool' || list(evt.roles).length) {
    state.feed.unshift(evt);
    if (state.feed.length > FEED_LIMIT) state.feed.length = FEED_LIMIT;
  }
  return state;
}

module.exports = { createState, reduce, FEED_LIMIT, TRAIL_LIMIT };
