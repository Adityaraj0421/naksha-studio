# Naksha Live — local dashboard

Naksha Live is an optional local web page that shows your design team at work. It has a live org chart of the 30 roles, an activity stream, and panels for project memory, review findings and cost. It is **opt-in** and **zero-dependency**: it uses plain Node `http` and Server-Sent Events, with no Express, no WebSocket library and no `npm install`. Core naksha stays zero-build.

```
/naksha-dashboard setup     # enable event hooks for this project (.naksha/dashboard.json)
/naksha-dashboard start     # start the server in the background, print the tokenized URL
/naksha-dashboard status    # enabled? running? URL? event count
/naksha-dashboard stop
/naksha-dashboard disable   # stop the server and turn the hooks back into no-ops
```

## Architecture

```
Claude Code hooks ──► dashboard/hooks/emit.js ──► <project>/.naksha/events.jsonl
                      (no-op unless enabled)        (append-only, capped)
                                                          │ polled every 400 ms
                                                          ▼
browser ◄── SSE /api/stream ◄── dashboard/server.js ── lib/state.js (reducer)
        ◄── JSON /api/*     ◄──   + dashboard/routes/*.js (plugin routes)
        ◄── static          ◄──   dashboard/public/ (+ public/panels/*.js)
```

| File | Role |
|------|------|
| `dashboard/server.js` | CLI: `setup`, `start`, `stop`, `status`, `disable`, `serve` |
| `dashboard/lib/app.js` | HTTP app: security checks, routing, SSE, log polling, route loading |
| `dashboard/lib/state.js` | Pure reducer: events → current-session state (roles, trail, tools, feed) |
| `dashboard/lib/roles.js` | Roster from `adapters/roles.json`; maps agents, Agent/Task calls and commands to roles |
| `dashboard/lib/project.js` | Finds the project (walks up ≤ 3 levels to `.naksha/`, never the plugin dir); reads config |
| `dashboard/lib/events.js` | Appends to and rotates `events.jsonl` |
| `dashboard/hooks/emit.js` | The command hook |
| `dashboard/routes/*.js` | API plugins (core: `findings.js`, `cost.js`) |
| `dashboard/public/` | Page, styles, runtime, `panels/*.js` (core: project, findings, cost) |

The dashboard reads only the **user's project** `.naksha/` (plus `naksha-review/findings.json`). From the plugin it reads only code: `adapters/roles.json`, `commands/*.md` for role hints, and `scripts/naksha-stats.js` if present.

## Files in `.naksha/`

| File | Written by | Purpose |
|------|-----------|---------|
| `dashboard.json` | `setup` / `disable` | `{ "enabled": true, "port": 7433 }`. Optional `maxEventsBytes` (≥ 4096) overrides the 5 MB cap |
| `events.jsonl` | `emit.js` | One JSON event per line. Rotated at 5 MB to the newest 2,000 lines |
| `dashboard.session` | `emit.js` | The last session id seen, used to synthesize `session_start` |
| `dashboard.runtime.json` | `serve` | `{ pid, port, url, token, startedAt }`, mode 0600. Removed on stop |
| `dashboard.log` | `start` | Server stdout and stderr. The token is never printed to the log |
| `.gitignore` | `setup` / `start` | Keeps the four runtime files above out of git |

## Event stream

`hooks/hooks.json` runs `node "${CLAUDE_PLUGIN_ROOT}/dashboard/hooks/emit.js"` on `UserPromptSubmit`, `PreToolUse` (matcher `*`), `SubagentStart`, `SubagentStop`, `Stop` and `SessionEnd`. The hook always exits 0 and prints `{}`, which is valid JSON, adds no context and makes no decision. It resolves the project from the payload's `cwd` (falling back to `CLAUDE_PROJECT_DIR`, then the process cwd), and returns right away unless `.naksha/dashboard.json` has `"enabled": true`.

Hook payload fields used (verified against the Claude Code hooks reference at https://code.claude.com/docs/en/hooks): `hook_event_name`, `session_id`, `cwd`, `prompt` (UserPromptSubmit), `tool_name` and `tool_input.{subagent_type, description}` (PreToolUse), `agent_type` and `agent_id` (SubagentStart/Stop), `reason` (SessionEnd). Every field is optional: a missing field leads to a smaller event, not an error.

| `type` | Fields | Source |
|--------|--------|--------|
| `session_start` | `source?` | First event seen with a new `session_id` |
| `command` | `cmd` | A prompt that starts with a naksha `/command` (or `/naksha:command`). **Only the name is stored** |
| `tool` | `tool`, `roles?` | PreToolUse. `roles` appears only for Agent/Task calls whose `subagent_type` or `description` names a role |
| `subagent_start` / `subagent_stop` | `agent`, `aid?`, `roles` | SubagentStart/Stop. naksha agents map to roles (`design-critic` → UX Researcher + Creative Director, …) |
| `turn_end` | — | Stop |
| `session_end` | `reason?` | SessionEnd |

Every event also carries `ts` (ISO 8601) and `sid` (the session id, at most 12 safe characters). Prompt text, tool inputs and file contents are never written.

**Role states.** The running command's roles show as *staffed*. These come from the roles named in `commands/<cmd>.md`, plus a small curated map. A role becomes *active* when a subagent or Agent call embodying it starts, and *done* when that subagent stops or the turn ends. Design Manager is active for the duration of any naksha command. The *trail* (the order roles activated in) draws the handoff lines.

## Security model

- Binds to `127.0.0.1` only.
- A random 192-bit token is generated on every start. The page needs `?token=`. Every `/api/*` request needs either the `X-Naksha-Token` header or `?token=` (EventSource cannot send headers). Comparison is constant-time. The page moves the token into `sessionStorage` and removes it from the address bar.
- The `Host` header must be `127.0.0.1:<port>` or `localhost:<port>`, which defeats DNS rebinding. Requests whose `Origin` header names a different origin are refused.
- No CORS headers are sent, ever. Request bodies must be `application/json` and are capped at 64 KB. A cross-site form or `fetch` either gets refused or triggers a preflight that is never answered.
- Strict CSP (`default-src 'none'`, scripts, styles and connections from `'self'` only), `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Cache-Control: no-store`.
- Static files are served only from `dashboard/public/`. Traversal attempts and dotfiles are rejected. Static assets need no token because they contain no data; all data sits behind `/api`.
- `stop` kills a process only after a token-authenticated `/api/health` call confirms it is this project's server.
- The UI never uses `innerHTML`. All data is rendered with `textContent`.

## Panel plugin contract

Third-party and future naksha features add panels with two optional files. Both are discovered automatically.

### Server: `dashboard/routes/<name>.js`

```js
// dashboard/routes/votes.js
exports.register = ({ route, projectDir, naksha }) => {
  route('GET', '/votes', async (req, res, { query, json }) => {
    const project = naksha.readProject() || {};
    json(200, { signals: (project.taste && project.taste.signals) || [] });
  });

  route('POST', '/votes', async (req, res, { body, json }) => {
    if (!body || !['approved', 'rejected'].includes(body.verdict)) return json(400, { error: 'verdict required' });
    naksha.updateProject((p) => { /* mutate p */ return p; });
    naksha.broadcast('votes', { changed: true });   // SSE → api.on('votes', …)
    json(201, { ok: true });
  });
};
```

- `route(method, path, handler)` registers `METHOD /api<path>`. You can write the path as `/votes`, `votes`, or `/api/votes`. Use `:name` segments for parameters, available as `req.params.name`.
- `handler` is `async (req, res, { body, query, json, params })`.
  - `body`: the parsed JSON body (`null` for GET or an empty body). Non-JSON bodies are refused with 415 before your handler runs.
  - `query`: the query-string object, with `token` removed.
  - `json(status, obj)`: sends a JSON response. If the handler returns without responding, the server sends 204.
- Core routes (`/health`, `/state`, `/roles`, `/project`, `/panels`, `/stream`) cannot be overridden. A plugin route with the same method and path as another plugin's replaces it, and a warning is logged.
- A module that throws while loading, or that has no `register` export, is skipped and logged. It never takes the server down.

`naksha` helpers:

| Member | Description |
|--------|-------------|
| `projectDir`, `nakshaDir`, `pluginRoot`, `version` | Paths and version |
| `roles`, `groups` | The roster (`[{ name, group, label, focus }]`) and grouped form |
| `readJSON(relPath)` | Parse a JSON file relative to the project. Returns `null` if missing or invalid. Throws if the path escapes the project |
| `readProject()` | The parsed `.naksha/project.json`, or `null` |
| `updateProject(fn)` | Read, `fn(project)` (mutate or return a new object), set `updatedAt`, then write atomically (tmp + rename). Throws if `project.json` does not exist |
| `broadcast(type, data)` | Push an SSE event to every open page |
| `state()` | The current session-state snapshot |
| `log(...args)` | Log to the server log |

### Page: `dashboard/public/panels/<name>.js`

`GET /api/panels` lists the files. The page loads each one as a classic script after the core UI is ready.

```js
// dashboard/public/panels/votes.js
(function () {
  var n = window.naksha;
  n.registerPanel({
    id: 'votes',
    title: 'Taste votes',
    order: 40,                       // core: project 10, findings 20, cost 30
    render: function (el, api) {
      function load() {
        return api.get('/votes').then(function (data) {
          n.clear(el);
          el.appendChild(n.h('p', { class: 'nk-meta', text: data.signals.length + ' signals' }));
        });
      }
      api.on('votes', load);          // SSE events by type
      return load();                  // returning a promise surfaces errors in the panel
    },
  });
})();
```

- `registerPanel({ id, title, order, render(el, api) })`. `el` is the panel body inside a titled card. Panels are sorted by `order`, and registering an existing `id` replaces that panel. If `render` throws, or the promise it returns rejects, the panel shows an error message instead of breaking the page.
- `api.get(path)` and `api.post(path, body)` return a promise for parsed JSON. `path` is relative to `/api` (`'/votes'`). The token header is added for you. A non-2xx status rejects with an `Error` carrying `.status` and `.data`.
- `api.on(eventType, fn)` subscribes to SSE events and returns an unsubscribe function. Built-in types:
  - `state`: the full session snapshot after any change
  - `project`: `.naksha/project.json` changed
  - `findings`: `naksha-review/findings.json` changed
  - each raw event type (`command`, `tool`, `subagent_start`, `subagent_stop`, `turn_end`, `session_start`, `session_end`)
  - anything a route sends with `naksha.broadcast`
- Helpers on `window.naksha`:
  - `h(tag, attrs, ...children)`: a DOM builder. `text` sets `textContent` and `on<event>` attributes bind listeners.
  - `clear(el)`
  - `fmt.relTime(iso)` and `fmt.clock(iso)`
  - `focusRole(name)`: selects and focuses a role in the org chart.
- Shared styles: `nk-section`, `nk-kv` (on a `<dl>`), `nk-chips`/`nk-chip`, `nk-badge[data-tone=critical|high|good|warn|bad|active]`, `nk-list`, `nk-meta`, `nk-empty`, `nk-button[data-variant=primary]`, `nk-link`, `nk-figures`/`nk-figure`, `meter`. These use the dashboard's light and dark tokens automatically.
- CSP allows scripts from the dashboard origin only, so do not inline scripts or load remote code. Setting styles through the CSSOM (`el.style.width = …`) is fine.

## Cost panel input (`scripts/naksha-stats.js --json`)

The cost route runs the script, if it exists, with an 8 s timeout and a 1 MB output cap, with `cwd` set to the project and `NAKSHA_PROJECT_DIR` set. Results are cached for 30 s.

naksha's own report (`"schema": "naksha-stats/1"`, see [cost-and-budgets.md](cost-and-budgets.md)) is mapped exactly: spend is `totals.cost_usd` (all time) and `budgets.month_spend_usd`; budgets are `budgets.monthly` and each `budgets.per_command` entry (max run vs per-run limit), with the script's own `status` so a custom `warn_at` is respected; top commands come from `commands[].cost_usd`.

Any other output is parsed defensively. The generic shape is:

```json
{
  "currency": "USD",
  "spend":   { "session": 0.42, "today": 1.8, "month": 12.5 },
  "budgets": [{ "scope": "daily", "limit": 5, "spent": 1.8 }],
  "by_command": [{ "command": "/design", "cost": 3.2 }]
}
```

The parser also accepts:

- `*_usd` key suffixes
- `budget`, `budget_usd` or `max` for the limit
- `spent_usd`, `used` or `current` for the spend
- budgets written as an object (`{ "daily": { "limit": 5 } }` or `{ "daily": 5 }`). A missing `spent` is inferred from the matching `spend` key; `daily` matches `today`.
- numeric top-level `*cost*`, `*spend*` or `*usd*` keys when `spend` is missing

Budgets show *ok* below 80 %, *warn* from 80 %, and *over* from 100 %. If the script is missing, the panel shows an "Install cost tracking (v6)" placeholder.

## Findings panel input

`naksha-review/findings.json` at the project root: `{ target, generated_at, coverage, findings: [{ id, dimension, severity, title, evidence, recommendation, owner_role, verdict }] }`. Strings are clipped and unknown fields dropped. Findings are sorted by severity (critical → info). Each `owner_role` links to that role in the org chart.

## Tests

```bash
node --test dashboard/test/
```

The tests cover:

- binding to 127.0.0.1, the token gate, Host and Origin checks, and static traversal
- the panel list, the route contract (loaded through a fixture module), and SSE delivery of an appended event
- project resolution (≤ 3 levels, never the plugin dir)
- hook no-op behaviour when disabled, prompt privacy, and the 5 MB → 2,000-line cap
- the reducer, cost normalization, and findings normalization
