# Browser self-check

After `/design` writes `design-output.html`, naksha opens the page in a headless browser,
checks it at three widths, fixes what it finds, and checks again. `/design-qa` runs the
same loop on any file or URL you give it. The loop has a hard limit of three fix rounds.
When it stops, it tells you what is still wrong.

The steps live in one shared file,
[`skills/design/procedures/browser-self-check.md`](../skills/design/procedures/browser-self-check.md),
so every command that uses it behaves the same way.

## Using it

| You run | What happens |
|---------|--------------|
| `/design <task>` | Builds the page, then runs the self-check and fixes what it finds. Default. |
| `/design <task> --no-check` | Builds the page and skips the self-check. |
| `/design <task> --visual` | Adds screenshots and a visual review at each width (costs more, see below). |
| `/design-qa page.html` | Runs the check-and-fix loop on `page.html` and writes a QA report. |
| `/design-qa page.html --report-only` | Checks once and edits nothing. |
| `/design-qa https://staging.example.com` | Checks a live page. URLs are never edited, so this reports only. |

## What gets checked

The browser reads the page's **accessibility tree** first. That is the same structure a
screen reader uses: landmarks, headings, and the name and role of each control. It is a
few kilobytes of text, much cheaper than a screenshot, and it is what most accessibility
bugs show up in. A small script measured in the browser (the
[probe](../skills/design/procedures/browser-self-check.probe.js)) then adds the things
the tree doesn't show: sizes, positions and colours.

| Check | 375 px (phone) | 768 px (tablet) | 1440 px (desktop) |
|-------|:---:|:---:|:---:|
| Landmarks: exactly one `main`, named navigation regions | yes | if changed | if changed |
| Heading order: one `h1`, no skipped levels | yes | if changed | if changed |
| Names and roles: every button, link, field and image has an accessible name | yes | if changed | if changed |
| Focus order: no positive `tabindex`, nothing focusable that is hidden or off-screen, visual order matches focus order | yes | yes | yes |
| Horizontal overflow: the page never scrolls sideways; the element causing it is named | yes | yes | yes |
| Tap targets: at least 24×24 px (WCAG 2.2 SC 2.5.8); 44×44 px recommended on touch widths | fail + warn | fail + warn | fail only |
| Text contrast: 4.5:1, or 3:1 for large text, on solid backgrounds | yes | yes | yes |
| Static lint: `scripts/design-lint.js` (once per round, any width) | yes | yes | yes |
| Visual review: clipping, overlap, hierarchy, alignment | `--visual` only | `--visual` only | `--visual` only |

"If changed" means naksha compares that width's accessibility tree with the previous
width's and only re-reads the parts that differ, usually the navigation.

Text over gradients or images can't be measured from colours alone. The result counts
it as `unknown`, and Visual mode is the way to review it.

## The three-round cap

1. **Round 0** checks every width.
2. Each **fix round** fixes every failure (and warnings only when the fix is small and
   safe), then re-checks **only the widths the fix could affect**. A change inside a
   mobile media query re-checks 375 px only. A heading or label change re-reads the
   accessibility tree once. A global layout or colour change re-checks all three widths.
3. The loop stops at the first of:
   - nothing is failing (`clean`);
   - the same failures came back, or every failure left needs a decision naksha shouldn't
     make alone, such as changing a brand colour (`stalled`);
   - three fix rounds are done (`round-cap`).

Fixes must address the cause. Hiding overflow on `<body>`, adding `aria-hidden` to
silence a missing name, deleting content, or shrinking body text below 16 px don't count
as fixes. Anything still wrong is listed under `remaining` with a reason.

## Visual mode costs more

Without `--visual`, a three-width check reads about 1–2 KB of probe output per width,
plus the accessibility tree (usually a few KB, and only the changed parts after the
first width). A full-page screenshot at each width is an image input, which costs
much more than that, and the cost repeats on every re-checked width in every round.
So screenshots are off by default. Turn them on with `--visual`, or by asking naksha to
look at or screenshot the result, when the visual details matter: art direction,
imagery, or text over images.

## When Playwright isn't available

The browser steps need the Playwright MCP server, the same one `/design-review` and
`/naksha-browse` use. Run `/naksha-doctor` to see whether it's connected. Without it:

- the static linter still runs;
- the result says **"Browser check skipped: Playwright MCP is not available. Only the
  static linter ran."**, with `status: "static-only"` and an empty `widths` list;
- nothing about layout, overflow or tap targets is guessed, and no fix loop runs.

Pages are served from `127.0.0.1` on a free port by `scripts/serve-static.js`, because
headless browsers block `file://` pages. The server stops when the check ends, and
stops by itself after 15 idle minutes if something goes wrong.

## The result block

Every run ends with one fenced `json` block (`"naksha_check": "browser-self-check"`,
`"version": 1`). It records the status, the rounds used, which checks passed, failed or
warned at each width, every fix applied, and everything that's left. Dashboards and evals
can parse it without reading the prose. The full field list is in the procedure, under
**Step 7: Result block**.

## Testing the probe

`scripts/self-check-smoke.js` loads a clean fixture and a fixture with planted defects
(`evals/fixtures/browser-self-check/`) at all three widths and asserts the probe catches
each defect and nothing else. It needs the `playwright` npm package and a Chromium build,
and skips cleanly when they're missing:

```bash
node scripts/self-check-smoke.js
```

`scripts/check-procedures.js` (check 8 of `scripts/quality-check.sh`) makes sure every
procedure a command references exists, that every procedure is used by at least one
command, that the JSON examples in procedures parse, and that the probe compiles.
