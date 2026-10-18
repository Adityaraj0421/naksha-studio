#!/usr/bin/env bash
# guard-counts.sh — verifies that headline numbers in prose files stay in sync
# with the canonical meta/stats.json. Covers files NOT checked by verify-metadata.sh
# (platform adapters, install.sh, marketplace.json, docs, naksha-help.md).
# Usage: bash scripts/guard-counts.sh
# Exit: 0 if clean, 1 if stale or over-promised numbers found

set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
STATS="$REPO/meta/stats.json"
FAILED=0

echo "═══════════════════════════════════════"
echo "  guard-counts"
echo "═══════════════════════════════════════"
echo ""

STATS_COMMANDS=$(node -p 'require(process.argv[1]).commands' "$STATS")
STATS_LINES=$(node -p 'require(process.argv[1]).knowledge_lines' "$STATS")
FLOOR=$(( (STATS_LINES / 1000) * 1000 ))

echo "Canonical: ${STATS_COMMANDS} commands · ${STATS_LINES} knowledge lines"
echo ""

# ── Check 1: Command count must appear verbatim in prose files ───────────────
echo "Check 1 — Command count in prose files"

COMMAND_FILES=(
  "commands/naksha-help.md"
  "docs/plugin-directory-submission.md"
  ".claude-plugin/plugin.json"
  ".claude-plugin/marketplace.json"
  "install.sh"
  "CONTRIBUTING.md"
)

for f in "${COMMAND_FILES[@]}"; do
  path="$REPO/$f"
  if [ ! -f "$path" ]; then
    echo "  WARN  $f not found — skipping"
    continue
  fi
  if grep -q "${STATS_COMMANDS}" "$path"; then
    echo "  PASS  $f contains '${STATS_COMMANDS}'"
  else
    echo "  FAIL  $f: '${STATS_COMMANDS}' not found (stale command count)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""

# ── Check 2: Knowledge-line floor claims must not over-promise or drift > 15% ─
echo "Check 2 — Knowledge-line floor claims"

KNOWLEDGE_FILES=(
  "GEMINI.md"
  ".windsurfrules"
  ".cursor/rules/naksha.mdc"
  ".github/copilot-instructions.md"
  "install.sh"
  ".claude-plugin/plugin.json"
  ".claude-plugin/marketplace.json"
  "docs/plugin-directory-submission.md"
  "README.md"
  "site/index.html"
)

THRESHOLD=$(( STATS_LINES * 15 / 100 ))
# Headline files must state the exact thousand-floor (16,007 -> "16,000+"), not just stay within 15%
STRICT_FILES=" README.md site/index.html "

for f in "${KNOWLEDGE_FILES[@]}"; do
  path="$REPO/$f"
  if [ ! -f "$path" ]; then
    echo "  WARN  $f not found — skipping"
    continue
  fi
  # Extract largest line claim from the file: "NN,NNN+ lines", "NNNNN+ lines", "15k+ lines",
  # "16,000+ raw lines" and HTML forms like "<b>15k+</b> lines of …"
  CLAIM=$(node - "$path" <<'JSEOF'
const content = require('fs').readFileSync(process.argv[2], 'utf8');
const pat = /(\d[\d,]*(?:\.\d+)?)\s*(k)?\+(?:<\/\w+>)?\s*(?:[a-z-]+\s+)?lines\b/gi;
const matches = [...content.matchAll(pat)].map(m => Math.round(parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)));
console.log(matches.length ? Math.max(...matches) : 0);
JSEOF
)
  if [ "$CLAIM" = "0" ]; then
    echo "  WARN  $f: no 'NN+ lines' claim found"
    continue
  fi
  DIFF=$(( STATS_LINES - CLAIM ))
  if [ "$CLAIM" -gt "$STATS_LINES" ]; then
    echo "  FAIL  $f: claims ${CLAIM}+ but actual=${STATS_LINES} (over-promised)"
    FAILED=$((FAILED + 1))
  elif [[ "$STRICT_FILES" == *" $f "* ]] && [ "$CLAIM" -ne "$FLOOR" ]; then
    echo "  FAIL  $f: headline claims ${CLAIM}+ lines, expected ${FLOOR}+ (floor of ${STATS_LINES})"
    FAILED=$((FAILED + 1))
  elif [ "$DIFF" -gt "$THRESHOLD" ]; then
    echo "  FAIL  $f: claims ${CLAIM}+ lines, drift=$(( DIFF ))  vs threshold=${THRESHOLD} (>15% stale)"
    FAILED=$((FAILED + 1))
  else
    echo "  PASS  $f: ${CLAIM}+ (within 15% of ${STATS_LINES})"
  fi
done

echo ""

# ── Check 3: Headline role count must match stats.json everywhere it is stated ─
echo "Check 3 — Role count in prose files"

STATS_ROLES=$(node -p 'require(process.argv[1]).roles' "$STATS")
ROLE_FILES=(
  "README.md"
  "CONTRIBUTING.md"
  "commands/naksha-help.md"
  "commands/design-reel.md"
  "docs/plugin-directory-submission.md"
  ".claude-plugin/plugin.json"
  ".claude-plugin/marketplace.json"
  "install.sh"
  "site/index.html"
  "GEMINI.md"
  ".windsurfrules"
  ".cursor/rules/naksha.mdc"
  ".github/copilot-instructions.md"
)

for f in "${ROLE_FILES[@]}"; do
  path="$REPO/$f"
  if [ ! -f "$path" ]; then
    echo "  WARN  $f not found — skipping"
    continue
  fi
  # Two-digit "NN roles" / "NN specialist roles" / "NN specialists" / "NN-role" / "Roles-NN" badge claims
  STALE=$(node - "$path" "$STATS_ROLES" <<'JSEOF'
const [file, want] = process.argv.slice(2);
const text = require('fs').readFileSync(file, 'utf8');
const pat = /\b(\d{2})(?:<\/\w+>)?(?:\s+specialist)?(?:\s+roles?\b|\s+specialists\b|-role\b)|Roles-(\d{2})\b/g;
const found = new Set([...text.matchAll(pat)].map(m => m[1] || m[2]));
found.delete(want);
console.log([...found].sort().join(','));
JSEOF
)
  if [ -n "$STALE" ]; then
    echo "  FAIL  $f: role count ${STALE} found, expected ${STATS_ROLES}"
    FAILED=$((FAILED + 1))
  else
    echo "  PASS  $f"
  fi
done

echo ""
echo "───────────────────────────────────────"
if [ "$FAILED" -gt 0 ]; then
  echo "guard-counts: FAIL ($FAILED issue(s) found)"
  exit 1
else
  echo "guard-counts: PASS"
  exit 0
fi
