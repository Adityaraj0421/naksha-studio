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

STATS_COMMANDS=$(python3 -c "import json; print(json.load(open('$STATS'))['commands'])")
STATS_LINES=$(python3 -c "import json; print(json.load(open('$STATS'))['knowledge_lines'])")
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
)

THRESHOLD=$(( STATS_LINES * 15 / 100 ))

for f in "${KNOWLEDGE_FILES[@]}"; do
  path="$REPO/$f"
  if [ ! -f "$path" ]; then
    echo "  WARN  $f not found — skipping"
    continue
  fi
  # Extract largest "NN,NNN+ lines" / "NNNNN+ lines" claim from the file
  CLAIM=$(python3 - "$path" <<'PYEOF'
import sys, re
content = open(sys.argv[1]).read()
matches = re.findall(r'([\d,]+)\+\s*lines', content)
if not matches:
    print("0")
else:
    print(max(int(m.replace(',', '')) for m in matches))
PYEOF
)
  if [ "$CLAIM" = "0" ]; then
    echo "  WARN  $f: no 'NN+ lines' claim found"
    continue
  fi
  DIFF=$(( STATS_LINES - CLAIM ))
  if [ "$CLAIM" -gt "$STATS_LINES" ]; then
    echo "  FAIL  $f: claims ${CLAIM}+ but actual=${STATS_LINES} (over-promised)"
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

STATS_ROLES=$(python3 -c "import json; print(json.load(open('$STATS'))['roles'])")
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
  STALE=$(python3 - "$path" "$STATS_ROLES" <<'PYEOF'
import re, sys
text, want = open(sys.argv[1]).read(), sys.argv[2]
pat = r'\b(\d{2})(?:</\w+>)?(?:\s+specialist)?(?:\s+roles?\b|\s+specialists\b|-role\b)|Roles-(\d{2})\b'
bad = sorted({a or b for a, b in re.findall(pat, text)} - {want})
print(",".join(bad))
PYEOF
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
