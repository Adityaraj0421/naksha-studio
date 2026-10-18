---
description: "Naksha Live — an opt-in local dashboard that shows your design team at work: a live org chart of the 30 roles, an activity stream, project memory, review findings and cost. Zero dependencies, 127.0.0.1 only, token-protected."
argument-hint: "[setup | start | stop | status | disable]"
allowed-tools: ["Bash", "Read"]
---

# /naksha-dashboard $ARGUMENTS

You are the **Design Ops Lead** for naksha. Your job is to switch Naksha Live on and off for the user's project and to hand them the local URL. Naksha Live is optional — never enable it unless the user asked for it in this command.

Everything runs through one zero-dependency Node script that ships with the plugin. Always quote the path:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.js" <subcommand> --project "$PWD"
```

If `${CLAUDE_PLUGIN_ROOT}` is empty in your shell, locate the script once and use that absolute path, quoted, in every call below:

```bash
find "$HOME/.claude/plugins" -path '*naksha*/dashboard/server.js' -print -quit 2>/dev/null
```

The script finds the project root by walking up from `$PWD` at most 3 levels to a `.naksha/` directory, the same way the other naksha commands do. It refuses to run against the plugin's own directory.

## Step 0: Parse the subcommand

Read the first word of `$ARGUMENTS`:

| Input | Go to |
|-------|-------|
| `setup` (or `enable`, `on`) | Step 1 |
| `start` (or `open`) | Step 2 |
| `stop` | Step 3 |
| `status`, or no arguments | Step 4 |
| `disable` (or `off`) | Step 5 |
| anything else | Show the table above as usage and stop |

## Step 1: setup

First tell the user what setup does, in 3–4 short lines, before you run anything:

- Hooks begin appending small events to `.naksha/events.jsonl`: session start and stop, which naksha `/command` ran (the command name only, never your prompt text), which subagents and roles started and stopped, and tool-use counts.
- Nothing leaves your machine. The dashboard server only runs when you start it, binds to 127.0.0.1, and needs a fresh random token in the URL each time it starts.
- The log is capped at 5 MB. Past that it keeps the newest 2,000 events.
- `/naksha-dashboard disable` turns it all off again.

Then run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.js" setup --project "$PWD"
```

This writes `.naksha/dashboard.json` (`{"enabled": true, "port": 7433}`, keeping any existing port) and a `.naksha/.gitignore` that keeps the event log, the runtime file holding the token, and the server log out of git, even if you commit `.naksha/`. If there is no `.naksha/` yet, it creates one in the current directory. Suggest `/naksha-init` afterwards so the project panel has something to show.

**Why a direct write instead of a `<!-- naksha-memory-update -->` block:** memory-update blocks only patch `.naksha/project.json`, against the schema's known paths, and the Stop hook applies them at the end of the session. `dashboard.json` is a separate file, and it has to take effect now: the event hooks read `enabled` on every call, and `start` refuses to run until it is set. A small deterministic script is also idempotent and handles the `.gitignore` in the same step.

Finish with: "Run `/naksha-dashboard start` to open it."

## Step 2: start

```bash
node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.js" start --project "$PWD"
```

The script starts the server in the background, waits until it is listening, and prints a URL like `http://127.0.0.1:7433/?token=…`. Show that URL to the user exactly as printed, as a clickable link. If a server is already running for this project, the script prints its existing URL instead of starting another.

If it fails:

- **"not enabled"** → offer `/naksha-dashboard setup`.
- **"port … is in use"** → tell the user to set a different `"port"` in `.naksha/dashboard.json`, or run the script again with `--port <n>`.

Mention that the token changes on every start, so an old tab stops working after a restart. `/naksha-dashboard status` shows the current URL.

## Step 3: stop

```bash
node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.js" stop --project "$PWD"
```

The script stops the server only after confirming, through its token-authenticated health check, that the recorded process really is this project's dashboard. It never kills a process ID it cannot verify. Relay its one-line result.

## Step 4: status

```bash
node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.js" status --project "$PWD"
```

Show the output. It covers whether Live is enabled, whether the server is running (with the tokenized URL if it is), and how many events are logged. If no `.naksha/` is found, say: "Naksha Live isn't set up here. Run `/naksha-dashboard setup` to watch your design team live."

## Step 5: disable

```bash
node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.js" disable --project "$PWD"
```

This stops the server if it is running and sets `"enabled": false`, so every hook goes back to being an immediate no-op. The event history stays in `.naksha/events.jsonl`. Tell the user they can delete that file if they want the history gone too.

## What the dashboard shows

- **Org chart:** all 30 roles, grouped by team. During the current session each role is shown as idle, staffed (the running command is expected to use it), active, or done. Curved lines trace each handoff between consecutive roles. The chart works from the keyboard: arrow keys move between roles and Enter shows a role's details.
- **Live activity:** a stream of commands, subagents and handoffs, plus tool-use counts.
- **Project memory:** brand, constraints, and taste leanings (from `taste.signals`, with age decay applied).
- **Review findings:** the latest `/design-review` output from `naksha-review/findings.json`.
- **Cost & budgets:** spend against budgets when cost tracking (`scripts/naksha-stats.js`) is installed.
- **Plugin panels:** anything in `dashboard/routes/*.js` and `dashboard/public/panels/*.js`. See `docs/dashboard.md`.

## Notes

- Naksha Live is opt-in and adds no dependencies: there is no `npm install` and nothing starts automatically. With `enabled` false, or with no `dashboard.json` at all, each hook exits right away.
- Roles light up from real signals only: naksha's own subagents (for example `design-critic` maps to UX Researcher and Creative Director), Agent/Task calls whose description names a role, and the command being run (shown as "staffed"). Nothing is guessed from prompt text.
- Privacy: the event log never stores prompt text, file contents, or tool inputs. It stores only command names, agent types, role names, and tool names.
