# Procedure: Browser Self-Check

A bounded check → fix → re-check loop for an HTML page. It reads the page through
the **accessibility tree first** and pixels only on request, fixes what it finds,
and **stops after at most 3 fix rounds**, reporting what is left instead of looping.

Commands use it with one line:
`Read and follow ${CLAUDE_PLUGIN_ROOT}/skills/design/procedures/browser-self-check.md`
and set the inputs below. Human-facing docs: `${CLAUDE_PLUGIN_ROOT}/docs/browser-self-check.md`.

---

## Inputs

The calling command sets these. Anything it leaves unset takes the default.

| Input | Default | Meaning |
|-------|---------|---------|
| `TARGET` | (required) | Local `.html` file path, or an `http(s)://` URL |
| `CALLER` | (required) | The command running this, e.g. `/design` |
| `FIX` | `apply` | `apply`: edit `TARGET` and re-check. `report`: check once, edit nothing |
| `VISUAL` | `false` | `true` when the user passed `--visual` or asked to "look at" / screenshot the result |
| `MAX_ROUNDS` | `3` | Fix-round cap. Never raise it above 3 |

A URL target is always `FIX = report` (there is no local file to edit) and skips
the static linter unless the caller also names the local source file.

## Step 1: Probe the browser

Call `mcp__plugin_playwright_playwright__browser_navigate` with `url: "about:blank"`
(the same probe `/naksha-browse` and `/naksha-doctor` use). If your Playwright MCP is
registered under another prefix (for example `mcp__playwright__browser_navigate`), use
that prefix for every tool in this procedure.

- **Succeeds** → `BROWSER = playwright`. Continue.
- **Fails or tool not found** → `BROWSER = none`. Run only the first two lines of
  Step 2 (make `SC_DIR` and `SC_FILE`; start no server), then Step 3 (static lint),
  then `rm -rf` the `SC_DIR` and jump to Step 7 with `status: "static-only"` and
  `stopped_because: "browser-unavailable"`.
  Say plainly: **"Browser check skipped: Playwright MCP is not available. Only the
  static linter ran."** Do not guess at layout, overflow or tap targets without a
  browser, and do not loop.

## Step 2: Serve over http

Headless capture blocks `file://`, so serve local files. Skip this step for URL targets.

```bash
SC_DIR="$(mktemp -d "${TMPDIR:-/tmp}/naksha-check.XXXXXX")"
SC_FILE="$(cd "$(dirname "TARGET")" && pwd)/$(basename "TARGET")"
( node "${CLAUDE_PLUGIN_ROOT}/scripts/serve-static.js" "$(dirname "$SC_FILE")" >"$SC_DIR/serve.log" 2>&1 & echo $! >"$SC_DIR/serve.pid" )
for i in 1 2 3 4 5 6 7 8 9 10; do grep -q '^port ' "$SC_DIR/serve.log" && break; sleep 0.2; done
echo "SC_DIR=$SC_DIR SC_FILE=$SC_FILE URL=http://127.0.0.1:$(grep '^port ' "$SC_DIR/serve.log" | cut -d' ' -f2)/$(basename "$SC_FILE")"
```

Replace `TARGET` with the real path. Shell variables do not survive between Bash
calls, so note the printed `SC_DIR`, `SC_FILE` and `URL`; later blocks write them as
bare placeholders (`SC_DIR`, `SC_FILE`) for you to replace with those literal values. The server
binds a free port on 127.0.0.1 and exits by itself after 15 idle minutes. If `node`
cannot start it, fall back to `python3 -u -m http.server 0 --bind 127.0.0.1` in the
file's directory (the port is in its first log line, "Serving HTTP on 127.0.0.1 port N").

Load the page once: `browser_navigate` → `URL`.

## Step 3: Static lint (once per round, width-independent)

Local targets only. Detect whether the linter speaks JSON, and run it from `SC_DIR`
so any report file it writes lands there, not in the user's project:

```bash
if grep -q -- '--json' "${CLAUDE_PLUGIN_ROOT}/scripts/design-lint.js"; then
  (cd "SC_DIR" && node "${CLAUDE_PLUGIN_ROOT}/scripts/design-lint.js" "SC_FILE" --json)
else
  (cd "SC_DIR" && node "${CLAUDE_PLUGIN_ROOT}/scripts/design-lint.js" "SC_FILE" >/dev/null; cat design-lint-report.json)
fi
```

Either way you get JSON with an `issues` list (each with a severity and a message).
A non-zero exit with valid JSON means "findings", not a crash. If the linter is missing
or prints no JSON, record `lint.ran: false` and carry on: the browser checks matter more.
Lint `error`s count as `fail`, `warning`s as `warn`, under the check id `lint`.

## Step 4: Check each width, accessibility tree first

Widths, in this order: **375×812, 768×1024, 1440×900**. For each one:

1. `browser_resize` → `width`, `height`.
2. **Accessibility snapshot**: `browser_snapshot`. If the resize or navigate response
   already returned a page snapshot, use that one instead of calling again.
   At 768 and 1440, compare with the previous width's snapshot and only re-read the
   parts that changed (usually the navigation): semantics rarely change with width.
3. **Geometry probe**: call `browser_evaluate` and pass the full text of
   `${CLAUDE_PLUGIN_ROOT}/skills/design/procedures/browser-self-check.probe.js` as the
   `function` argument (read the file once per session). It returns about 1–2 KB of
   JSON: overflow, tap targets, focus order, focus indicators, text contrast and a
   semantics cross-check. It changes nothing on the page.
4. Optional: if a `browser_console_messages` tool exists, read it once at the first
   width; uncaught errors count as `fail` under `console`.

Judge these checks. Use these ids exactly, because the result block and other
features key on them.

| Check id | Source | `fail` when | `warn` when |
|----------|--------|-------------|-------------|
| `landmarks` | snapshot | no `main`, or more than one; content outside any landmark | several `navigation` landmarks without distinct names |
| `heading-order` | snapshot (probe `semantics` cross-checks) | no `h1` or several; a level is skipped going down (h1 → h3) | headings used only for styling |
| `names-roles` | snapshot | a button, link, form field, or meaningful image has no accessible name; a clickable element has no interactive role | vague names ("click here", "more") repeated with different targets |
| `focus-order` | snapshot order + probe `focus` | `positiveTabindex` non-empty; `hiddenFocusable` (aria-hidden ancestor, or off-screen and not a skip link) | `reordered` (CSS `order` / `*-reverse` makes visual order differ from focus order); `noIndicator` (heuristic) |
| `overflow` | probe `overflow` | `px > 0` (page scrolls sideways); the probe names the outermost offenders | `masked` is true (overflow hidden on html/body may be hiding a real problem) |
| `tap-targets` | probe `tap` | `fail` list non-empty (under 24×24 px and crowded: WCAG 2.2 SC 2.5.8) | at 375 and 768 only: `warn` list (under 44×44 px) |
| `contrast` | probe `contrast` | any entry in `fail` (below 4.5:1, or 3:1 for large text) | `unknown` is large (text on gradients/images is not measured; say so) |
| `lint` | Step 3 | linter errors | linter warnings |
| `console` | optional | uncaught page errors | console warnings |
| `visual` | screenshots, Visual mode only | clipped, overlapping or unreadable content | weak hierarchy, misalignment, cramped spacing |

Notes:
- Off-screen focusables at a width that also overflows are often the overflow itself.
  Fix overflow first, then re-judge `focus-order`.
- The probe's `noIndicator` compares computed styles before and after programmatic
  focus. Treat it as a hint and confirm in the CSS (`:focus-visible` rules) before fixing.
- Width-independent checks (`landmarks`, `heading-order`, `names-roles`, `lint`) are
  judged once and reported under every width unless the snapshot differs at that width.

## Step 5: Visual mode (opt-in only)

Only when `VISUAL = true`. Screenshots cost far more tokens than the snapshot and the
probe together, so never take them by default.

- At each checked width: `browser_take_screenshot` with `fullPage: true`.
- Judge what the tree cannot show: clipped or overlapping content, hierarchy, alignment,
  spacing rhythm, images that crop badly, text over busy backgrounds (this also covers
  the contrast the probe marked `unknown`). Record findings under `visual`.
- In later rounds, only re-shoot the widths being re-checked.

When `VISUAL = false`, add `"visual"` to `skipped` and do not mention screenshots as a
missing step: it is a deliberate saving.

## Step 6: Fix and re-check (at most 3 rounds)

Round 0 is the first full check (Steps 3–5 at every width). Stop now if `FIX = report`
(`stopped_because: "report-only"`) or if nothing is at `fail` (`"clean"`).

Otherwise run fix rounds, `round = 1, 2, 3`:

1. **Fix** every `fail`. Fix a `warn` only when the change is local and clearly safe.
   Edit the source with Edit, one finding at a time, fixing the cause:
   - overflow → constrain the named offender (`max-width: 100%`, wrapping, `minmax(0, 1fr)`),
     never `overflow-x: hidden` on `html` or `body`;
   - tap targets → padding or `min-height`/`min-width`, not smaller neighbours;
   - names → visible text or `aria-label`, never `aria-hidden` to silence a finding;
   - focus → remove positive `tabindex`; make closed drawers `hidden` or `inert`, not
     `tabindex="-1"` on things users must reach;
   - contrast → adjust the colour token, not the font size;
   - never delete content or shrink body text below 16px to make a check pass.
2. **Decide which widths to re-check** from what you just changed:
   - change inside one `@media` block → only the widths that query matches;
   - markup, ARIA or heading change with no layout effect → one snapshot at 375 (plus
     any width where that region renders differently, e.g. a mobile-only menu);
   - CSS outside media queries that affects layout or colour → all three widths.
   Re-run Step 3 if the file changed. Widths you do not re-check keep their last result.
3. **Re-check** those widths: `browser_navigate` to `URL` again so the edited file
   loads, then Step 4 (plus Step 5 in Visual mode). A new `fail` that the fix
   introduced counts like any other.
4. **Stop** when the first of these happens:
   - no `fail` remains → `stopped_because: "clean"`;
   - the set of `fail`s is the same as the previous round, or every remaining `fail`
     needs a decision you cannot make safely (a brand colour, removing content) →
     `"stalled"` (more rounds would only loop);
   - `round` reached `MAX_ROUNDS` → `"round-cap"`.

After stopping, report every remaining `fail` and `warn` honestly, with the reason it is
still there. Never claim a check passed that was not re-run after its last related edit.

Clean up the server (local targets):

```bash
kill "$(cat "SC_DIR/serve.pid")" 2>/dev/null; rm -rf "SC_DIR"
```

## Step 7: Result block

End with a two-line human summary, then exactly one fenced `json` block in this shape.
Callers paste it into their output unchanged; dashboards and evals parse it.

```json
{
  "naksha_check": "browser-self-check",
  "version": 1,
  "caller": "/design",
  "target": "design-output.html",
  "browser": "playwright",
  "visual": false,
  "fix": "apply",
  "status": "fail",
  "rounds": 2,
  "max_rounds": 3,
  "stopped_because": "stalled",
  "lint": { "ran": true, "json": true, "errors": 0, "warnings": 0 },
  "widths": [
    { "width": 375, "last_checked_round": 2, "passed": ["landmarks", "heading-order", "names-roles", "focus-order", "overflow", "tap-targets", "lint"], "failed": ["contrast"], "warned": [] },
    { "width": 768, "last_checked_round": 1, "passed": ["landmarks", "heading-order", "names-roles", "focus-order", "overflow", "tap-targets", "lint"], "failed": ["contrast"], "warned": [] },
    { "width": 1440, "last_checked_round": 1, "passed": ["landmarks", "heading-order", "names-roles", "focus-order", "overflow", "tap-targets", "lint"], "failed": ["contrast"], "warned": ["focus-order"] }
  ],
  "fixes": [
    { "round": 1, "check": "overflow", "widths": [375, 768], "summary": "Pricing table: grid columns minmax(0, 1fr) instead of fixed 320px" },
    { "round": 2, "check": "tap-targets", "widths": [375], "summary": "Icon buttons padded to 44x44" }
  ],
  "remaining": [
    { "check": "contrast", "severity": "fail", "widths": [375, 768, 1440], "detail": "Hero caption #8a8a8a on #f4f1ea is 3.4:1; it is a locked brand token, so changing it needs a brand decision" },
    { "check": "focus-order", "severity": "warn", "widths": [1440], "detail": "Sidebar uses order: -1, so focus reaches it after the main column" }
  ],
  "skipped": ["visual"]
}
```

| Field | Values |
|-------|--------|
| `browser` | `"playwright"` or `"none"` |
| `fix` | `"apply"` or `"report"` |
| `status` | `"pass"` (no `fail` left), `"fail"` (a `fail` remains), `"static-only"` (no browser: lint only) |
| `rounds` | Fix rounds actually run, `0`–`3` (0 = checked once, nothing edited) |
| `stopped_because` | `"clean"`, `"stalled"`, `"round-cap"`, `"report-only"`, `"browser-unavailable"`, `"error"` |
| `lint` | `ran` false when the linter was unavailable or the target is a URL; `json` true when `--json` was used |
| `widths[]` | One entry per width that was checked. Every check id appears in at most one of `passed` / `failed` / `warned`. Omit ids that did not apply (`visual` outside Visual mode, `console` without the tool). With `browser: "none"` the array is empty |
| `fixes[]` | One entry per edit, in order. Empty when `fix` is `report` |
| `remaining[]` | Every unresolved `fail` and `warn`, each with a one-line reason |
| `skipped` | Checks deliberately not run, e.g. `"visual"`, `"browser"`, `"lint"` |

`status: "pass"` with warnings left is fine; say what the warnings are.
