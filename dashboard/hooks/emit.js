#!/usr/bin/env node
'use strict';
// Naksha Live event emitter — a Claude Code command hook.
//
// Registered in hooks/hooks.json for UserPromptSubmit, PreToolUse, SubagentStart,
// SubagentStop, Stop and SessionEnd. It appends ONE compact line to the user's
// <project>/.naksha/events.jsonl — but only when .naksha/dashboard.json has
// "enabled": true. Otherwise it is an immediate no-op.
//
// Privacy: prompt text is never stored. A prompt is recorded only when it starts
// with a naksha /command, and then only the command name. Agent/Task calls are
// reduced to the naksha role names they mention.
//
// Contract with Claude Code: always exit 0 and print `{}` (valid JSON, adds no
// context, makes no decision), whatever happens.

const fs = require('fs');
const path = require('path');

function done() {
  try {
    process.stdout.write('{}\n');
  } catch {
    /* stdout closed */
  }
  process.exit(0);
}

function readStdin() {
  if (process.stdin.isTTY) return {};
  try {
    const raw = fs.readFileSync(0, 'utf8');
    const data = raw.trim() ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function shortId(v) {
  return typeof v === 'string' && v ? v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12) : undefined;
}

function main() {
  const input = readStdin();
  const lib = path.join(__dirname, '..', 'lib');
  const project = require(path.join(lib, 'project.js'));

  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || project.PLUGIN_ROOT;
  const startDir =
    (typeof input.cwd === 'string' && input.cwd) || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const projectDir = project.resolveProjectDir(startDir, { pluginRoot });
  if (!projectDir) return;
  const cfg = project.readConfig(projectDir);
  if (!project.isEnabled(cfg)) return;

  const events = require(path.join(lib, 'events.js'));
  const roles = require(path.join(lib, 'roles.js'));

  const ts = new Date().toISOString();
  const sid = shortId(input.session_id);
  const base = sid ? { ts, sid } : { ts };
  const out = [];

  // A new session_id means a new session — synthesize session_start, so we do
  // not need a SessionStart hook entry of our own.
  if (sid) {
    const marker = path.join(projectDir, '.naksha', 'dashboard.session');
    let last = '';
    try {
      last = fs.readFileSync(marker, 'utf8').trim();
    } catch {
      /* first run */
    }
    if (last !== sid) {
      try {
        fs.writeFileSync(marker, sid + '\n', { mode: 0o600 });
      } catch {
        /* read-only project */
      }
      out.push({ ...base, type: 'session_start' });
    }
  }

  const event = input.hook_event_name;
  let roster = null;
  const getRoster = () => roster || (roster = roles.loadRoles(pluginRoot));

  switch (event) {
    case 'SessionStart':
      // Only if integration also wires us into SessionStart; the marker above already fired.
      if (!out.length) out.push({ ...base, type: 'session_start' });
      if (typeof input.source === 'string') out[out.length - 1].source = input.source.slice(0, 16);
      break;

    case 'UserPromptSubmit': {
      const prompt = typeof input.prompt === 'string' ? input.prompt : '';
      const m = /^\s*\/(?:naksha(?:-studio)?:)?([a-z0-9][a-z0-9-]{0,63})(?=\s|$)/i.exec(prompt);
      if (m) {
        const cmd = m[1].toLowerCase();
        if (fs.existsSync(path.join(pluginRoot, 'commands', `${cmd}.md`))) {
          out.push({ ...base, type: 'command', cmd });
        }
      }
      break;
    }

    case 'PreToolUse':
    case 'PostToolUse': {
      const tool = typeof input.tool_name === 'string' ? input.tool_name.slice(0, 80) : 'unknown';
      const evt = { ...base, type: 'tool', tool };
      if (tool === 'Task' || tool === 'Agent') {
        const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};
        const hint = [ti.subagent_type, ti.description].filter((s) => typeof s === 'string').join(' \n ');
        const found = new Set([
          ...roles.rolesForAgent(ti.subagent_type, getRoster()),
          ...roles.rolesInText(hint, getRoster()),
        ]);
        if (found.size) evt.roles = [...found].slice(0, 6);
      }
      out.push(evt);
      break;
    }

    case 'SubagentStart':
    case 'SubagentStop': {
      const agent = roles.normalizeAgent(input.agent_type) || 'agent';
      const evt = {
        ...base,
        type: event === 'SubagentStart' ? 'subagent_start' : 'subagent_stop',
        agent,
        roles: roles.rolesForAgent(agent, getRoster()),
      };
      const aid = shortId(input.agent_id);
      if (aid) evt.aid = aid;
      out.push(evt);
      break;
    }

    case 'Stop':
      out.push({ ...base, type: 'turn_end' });
      break;

    case 'SessionEnd':
      out.push({
        ...base,
        type: 'session_end',
        reason: typeof input.reason === 'string' ? input.reason.slice(0, 32) : undefined,
      });
      break;

    default:
      break;
  }

  const maxBytes = Number(cfg.maxEventsBytes) >= 4096 ? Number(cfg.maxEventsBytes) : undefined;
  for (const evt of out) events.appendEvent(projectDir, evt, { maxBytes });
}

try {
  main();
} catch (err) {
  if (process.env.NAKSHA_DEBUG) process.stderr.write(`naksha emit: ${err && err.message}\n`);
}
done();
