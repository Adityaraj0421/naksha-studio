---
description: "Record naksha's design team working — turn a /design run into a share-able vertical + landscape video reel (the 26-role team redesigning a screen, live)."
argument-hint: "[design task] [--url <live page to redesign>] [--out <dir>]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /design-reel $ARGUMENTS

You are the design studio's **Reel Producer**. Your job: run a real `/design` pass, then
render a polished, share-able video of naksha's design team doing the work — the team is
the hook, not a single AI voice. Output is a ready-to-post mp4 (9:16 + 16:9).

Architecture (locked by eng-review — see `docs/reel-beats.md`):
**`/design` designs → a dedicated extraction pass produces the beats → `@naksha/reel` renders.**
Do NOT ask `/design` to emit beats inline; passive emission is unreliable (38%). Extract afterward.

---

## Step 0: Toolchain gate (fail clearly, never half-render)

The renderer needs Node + ffmpeg + the local `packages/naksha-reel` package. Probe:

```bash
command -v node >/dev/null && command -v ffmpeg >/dev/null && echo "OK" || echo "MISSING_TOOLS"
[ -d packages/naksha-reel/node_modules ] && echo "DEPS_OK" || echo "DEPS_MISSING"
```

- `MISSING_TOOLS` → stop. Tell the user to install Node 18+ and ffmpeg; point to `docs/reel-setup.md` and `/naksha-doctor`.
- `DEPS_MISSING` → run once: `(cd packages/naksha-reel && npm install)`. This is the one-time, opt-in install; naksha core stays zero-build.

## Step 1: Parse the request

- **Task**: the design brief (strip flags).
- **`--url <page>`**: a running page to redesign → **redesign mode** (real before + after wipe).
  Absent → **create mode** (after-only; the page is built fresh).
- **`--out <dir>`**: output dir (default `./naksha-reels`).

## Step 2: Run /design (no beat burden)

Execute `/design` on the task **inline, in this session**, exactly as normal. It writes
`design-output.html` and leaves the full role-by-role reasoning in this conversation.
That transcript + that HTML are the two inputs the rest of this command consumes. Do not
add any beat-emission instruction to `/design`.

## Step 3: Capture before/after (served over http — `file://` is blocked for headless capture)

Serve the HTML so a headless browser can screenshot it:

```bash
# pick a free port; serve the directory containing design-output.html
( cd "$(dirname design-output.html)" && python3 -m http.server 8788 >/tmp/naksha-reel-serve.log 2>&1 & echo $! > /tmp/naksha-reel-serve.pid )
```

- **after.png** (always): screenshot `http://localhost:8788/design-output.html` at 900×1340
  (portrait page). Prefer Playwright MCP (`browser_navigate` + screenshot); if unavailable,
  fall back to headless Chrome `--screenshot` (see `docs/reel-setup.md`). Save to the out dir.
- **before.png** (redesign mode only): screenshot the live `--url` the SAME way, BEFORE
  `/design`'s changes are applied to it (capture it first, in Step 2's lead-in).
- Kill the server after capture: `kill "$(cat /tmp/naksha-reel-serve.pid)" 2>/dev/null`.

**Redesign-mode degradation (do NOT silently downgrade):** if `--url` was given but no
screenshot tool is available, **stop with a clear error** and ask the user to provide
before/after screenshots — an after-only clip is a different product than the redesign reel
they asked for. (Create mode has no before, so after-only is correct there.)

## Step 4: Extract the beats (dedicated pass — schema-forced)

Now, as a SEPARATE focused step, read back over what the design team just did in Step 2 and
extract the reel beats. One beat per distinct specialist role that meaningfully contributed.
Each `caption`: first-person, ≤95 chars, the specific change that role made, no emoji.
Produce 3–6 beats in workflow order (Vision/strategy first, Copy/Motion later). Shape per
`docs/reel-beats.md`:

```json
{ "beats": [ { "role": "...", "fn": "Vision|Flows|Visual|Tokens|Copy|Research|Motion|Strategy", "caption": "...", "focus": "..." } ] }
```

## Step 5: Write reel.json and render

Write `reel.json` (the renderer normalizes roles, truncates captions, dedupes, and enforces
the ≥3 min-beat gate — you do not need to pre-clean):

```json
{
  "beats": [ ... from Step 4 ... ],
  "framing": {
    "hookTitle": "<scroll-stopping, <=42 chars>",
    "hookSub": "Not one AI voice — watch the whole design team work.",
    "beforeTag": "BEFORE",
    "briefCaption": "<one line over the before page>",
    "revealCaption": "<one line over the before/after>",
    "endHeadline": "Your turn to run the team.",
    "endSub": "26 roles redesign your screen, live. One command.",
    "endCommand": "/design-reel"
  },
  "beforeImage": "<out>/before.png or null",
  "afterImage": "<out>/after.png"
}
```

Render:

```bash
node packages/naksha-reel/bin/render.mjs --props reel.json --out <OUT_DIR>
```

- Exit 0 → `reel-9x16.mp4` + `reel-16x9.mp4` are in the out dir.
- **Exit 2** (min-beat gate: fewer than 3 distinct roles) → tell the user the run was too
  thin for a reel and offer to re-run `/design` with a richer brief. Do NOT ship a 1–2 beat clip.

## Step 6: Deliver

Report the two mp4 paths. Note both aspect ratios (9:16 for Reels/TikTok/Shorts, 16:9 for
YouTube/X) and the honesty framing baked into the end card ("produced by naksha · a
re-enactment"). Offer to open the vertical one.

## Notes

- The reel is a **produced re-enactment** of the design work, end-carded as such — not a raw
  screen recording. This is honest and standard for product demos.
- Memory: if `.naksha/memory.md` exists, append `[{ISO}] /design-reel: reel for "{task}" ({N} beats)`.
- Platform support: rendering is Claude-Code-flavored (needs the Node toolchain). Other
  adapters get this command's docs but render only where Node + the package are available.
