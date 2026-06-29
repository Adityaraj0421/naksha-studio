# /design-reel setup

`/design-reel` renders naksha's design team into a share-able video (9:16 + 16:9). Rendering
needs a small toolchain that the rest of naksha does not — so it's **opt-in**: naksha core
stays a zero-build `git clone` plugin, and the reel toolchain installs only when you use it.

Run `/naksha-doctor` any time to see the Reel toolchain status (READY / setup-needed / unavailable).

## Requirements

| Need | Why | Check |
|---|---|---|
| **Node 18+** | runs the Remotion renderer | `node -v` |
| **ffmpeg** | encodes the mp4 | `ffmpeg -version` |
| **`packages/naksha-reel` deps** | the renderer package | installed on first run |

Install ffmpeg if missing: `brew install ffmpeg` (macOS) · `apt install ffmpeg` (Debian/Ubuntu).

## First run

The first `/design-reel` runs a one-time install in the package (~a minute; downloads the
renderer + a headless Chrome the first time it renders):

```bash
cd packages/naksha-reel && npm install
```

After that, renders are local and offline — no network, no `npx`, nothing fetched per run.

## How capture works (and the `file://` gotcha)

`/design-reel` screenshots the page `/design` produced. Headless browsers **block the
`file://` protocol**, so the command serves the HTML over http first, then screenshots:

```bash
( cd <dir-with-design-output.html> && python3 -m http.server 8788 & )
# screenshot http://localhost:8788/design-output.html  (Playwright MCP, or headless Chrome)
```

If Playwright MCP isn't available, the fallback is headless Chrome's `--screenshot` flag
(the same engine Remotion downloads), e.g.:

```bash
chrome-headless-shell --headless --hide-scrollbars --window-size=900,1340 \
  --screenshot=after.png http://localhost:8788/design-output.html
```

## Render directly (without the command)

The package is a normal CLI — useful for hero clips or debugging:

```bash
node packages/naksha-reel/bin/render.mjs --props reel.json --out ./naksha-reels
# --only 9x16   render just one ratio (faster)
```

`reel.json` shape and the beat contract: see [reel-beats.md](reel-beats.md).

## Troubleshooting

- **"only N distinct role beat(s); needs >= 3"** — the `/design` run was too thin to make a
  reel. Re-run `/design` with a fuller brief. The min-beat gate refuses to ship a 1–2 beat clip.
- **Redesign (`--url`) but no screenshot tool** — the command stops rather than silently
  shipping an after-only clip (that's a different product). Provide before/after screenshots,
  or drop `--url` for a create-mode reel.
- **Render is slow / first render pauses** — Remotion downloads a headless Chrome once on the
  first render. Subsequent renders reuse it.
- **`ENOSPC: no space left on device`** — rendering buffers frames to a temp dir; keep
  **~1–2 GB free**. Free space (`npm cache clean --force` reclaims a lot) and re-run.

## Platform support

Rendering is Claude-Code-flavored (needs the Node toolchain). Cursor/Windsurf/Gemini/Copilot
get the command's docs but render only where Node + `packages/naksha-reel` are available.
