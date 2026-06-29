#!/usr/bin/env bash
# reel-render-smoke.sh — proves @naksha/reel renders an mp4 from a fixture.
# CI-safe: SKIPs (exit 0) when the opt-in package deps aren't installed, so it
# never breaks naksha core CI. Run a full check after `cd packages/naksha-reel && npm install`.
# Usage: bash scripts/reel-render-smoke.sh

set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$REPO/packages/naksha-reel"

echo "═══════════════════════════════════════"
echo "  naksha — reel render smoke"
echo "═══════════════════════════════════════"

command -v node >/dev/null 2>&1 || { echo "⏭  SKIP: node not installed"; exit 0; }
command -v ffmpeg >/dev/null 2>&1 || { echo "⏭  SKIP: ffmpeg not installed"; exit 0; }
[ -d "$PKG/node_modules" ] || { echo "⏭  SKIP: packages/naksha-reel deps not installed (npm install to enable)"; exit 0; }

# 1. unit tests for the normalize/gate logic (no render needed, always run when deps present)
echo "▸ unit: normalize + min-beat gate"
( cd "$PKG" && node --test test/*.test.mjs >/tmp/reel-unit.log 2>&1 ) \
  && echo "✅ normalize unit tests passed" \
  || { echo "❌ normalize unit tests FAILED"; tail -20 /tmp/reel-unit.log; exit 1; }

# 2. render the fixture (9:16 only for speed) and assert a real mp4 lands
OUT="$PKG/out"
rm -f "$OUT/reel-9x16.mp4"
echo "▸ render fixture (9:16)…"
( cd "$PKG" && node bin/render.mjs --props fixtures/reel.json --out out --only 9x16 >/tmp/reel-render.log 2>&1 ) \
  || { echo "❌ render failed"; tail -25 /tmp/reel-render.log; exit 1; }

MP4="$OUT/reel-9x16.mp4"
if [ -f "$MP4" ] && [ "$(stat -f%z "$MP4" 2>/dev/null || stat -c%s "$MP4")" -gt 100000 ]; then
  echo "✅ rendered $MP4 ($(du -h "$MP4" | cut -f1))"
else
  echo "❌ expected mp4 missing or too small: $MP4"
  exit 1
fi

# 3. the min-beat gate must REJECT a thin run (exit 2), not render
echo "▸ gate: <3 beats must be rejected"
THIN=$(mktemp /tmp/reel-thin-XXXX.json)
printf '{"beats":[{"role":"UI","fn":"Visual","caption":"only one"}],"afterImage":"fixtures/after.png"}' > "$THIN"
( cd "$PKG" && node bin/render.mjs --props "$THIN" --out out --only 9x16 >/dev/null 2>&1 )
if [ "$?" -eq 2 ]; then echo "✅ min-beat gate rejected thin run (exit 2)"; else echo "❌ gate did not reject thin run"; rm -f "$THIN"; exit 1; fi
rm -f "$THIN"

echo "───────────────────────────────────────"
echo "reel-render-smoke: PASS"
