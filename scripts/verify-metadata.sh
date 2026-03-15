#!/usr/bin/env bash
# verify-metadata.sh — validates that meta/stats.json matches filesystem reality
# and README badges. Part of quality-check.sh.
# Usage: bash scripts/verify-metadata.sh
# Exit: 0 if no hard FAILs, 1 if any FAIL found

set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
STATS="$REPO/meta/stats.json"
FAILED=0

echo "═══════════════════════════════════════"
echo "  verify-metadata"
echo "═══════════════════════════════════════"
echo ""

# Load stats.json values
STATS_VERSION=$(python3 -c "import json; print(json.load(open('$STATS'))['version'])")
STATS_ROLES=$(python3 -c "import json; print(json.load(open('$STATS'))['roles'])")
STATS_COMMANDS=$(python3 -c "import json; print(json.load(open('$STATS'))['commands'])")
STATS_LINES=$(python3 -c "import json; print(json.load(open('$STATS'))['knowledge_lines'])")
STATS_REFS=$(python3 -c "import json; print(json.load(open('$STATS'))['reference_files'])")

# ── Check 1: Filesystem counts ──────────────────────────────────────────────
echo "Check 1 — Filesystem counts"

ACTUAL_COMMANDS=$(find "$REPO/commands" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
ACTUAL_REFS=$(find "$REPO/skills/design/references" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
ACTUAL_LINES=$(cat "$REPO/skills/design/references/"*.md | wc -l | tr -d ' ')
ACTUAL_VERSION=$(python3 -c "import json; print(json.load(open('$REPO/.claude-plugin/plugin.json'))['version'])")

# roles: stats.json-authoritative — no filesystem check
# echo "  SKIP  roles: stats.json-authoritative, verified via README badge in Check 2"

check_numeric() {
  local field="$1" expected="$2" actual="$3"
  if [ "$expected" != "$actual" ]; then
    local diff=$((actual - expected))
    local sign=""; [ "$diff" -gt 0 ] && sign="+"
    echo "  FAIL  $field: stats.json=$expected  actual=$actual  (difference: ${sign}${diff})"
    FAILED=$((FAILED + 1))
  else
    echo "  PASS  $field: $actual"
  fi
}

check_numeric "commands"        "$STATS_COMMANDS" "$ACTUAL_COMMANDS"
check_numeric "reference_files" "$STATS_REFS"     "$ACTUAL_REFS"
check_numeric "knowledge_lines" "$STATS_LINES"    "$ACTUAL_LINES"

if [ "$STATS_VERSION" != "$ACTUAL_VERSION" ]; then
  echo "  FAIL  version: stats.json=\"$STATS_VERSION\"  actual=\"$ACTUAL_VERSION\""
  FAILED=$((FAILED + 1))
else
  echo "  PASS  version: $ACTUAL_VERSION"
fi

echo ""

# ── Check 2: README badge comparison ────────────────────────────────────────
echo "Check 2 — README badge comparison"

README="$REPO/README.md"

if [ ! -f "$README" ]; then
  echo "  WARN  README.md not found — skipping badge checks"
else
# Extract badge numbers
BADGE_ROLES=$(grep -o 'Specialist_Roles-[0-9]*-' "$README" | grep -o '[0-9]*' | head -1)
BADGE_COMMANDS=$(grep -o 'Slash_Commands-[0-9]*-' "$README" | grep -o '[0-9]*' | head -1)
BADGE_KNOWLEDGE=$(grep -o 'Design_Knowledge-[0-9]*%2B' "$README" | grep -o '[0-9]*' | head -1)

if [ -n "$BADGE_ROLES" ]; then
  check_numeric "roles (badge)" "$STATS_ROLES" "$BADGE_ROLES"
else
  echo "  WARN  roles badge not found in README"
fi

if [ -n "$BADGE_COMMANDS" ]; then
  check_numeric "commands (badge)" "$STATS_COMMANDS" "$BADGE_COMMANDS"
else
  echo "  WARN  commands badge not found in README"
fi

# knowledge_lines badge is a rounded marketing value — warn only if >10% divergence
if [ -n "$BADGE_KNOWLEDGE" ]; then
  DIFF=$(( (STATS_LINES - BADGE_KNOWLEDGE) < 0 ? (BADGE_KNOWLEDGE - STATS_LINES) : (STATS_LINES - BADGE_KNOWLEDGE) ))
  THRESHOLD=$(( STATS_LINES / 10 ))
  if [ "$DIFF" -gt "$THRESHOLD" ]; then
    echo "  FAIL  knowledge_lines badge: stats.json=$STATS_LINES  badge=$BADGE_KNOWLEDGE  (>10% divergence)"
    FAILED=$((FAILED + 1))
  else
    echo "  PASS  knowledge_lines badge: $BADGE_KNOWLEDGE (rounded, within 10% of $STATS_LINES)"
  fi
else
  echo "  WARN  knowledge_lines badge not found in README"
fi
fi

echo ""

# ── Check 3: plugin.json version ────────────────────────────────────────────
echo "Check 3 — plugin.json version"

PLUGIN_VERSION="$ACTUAL_VERSION"
if [ "$STATS_VERSION" != "$PLUGIN_VERSION" ]; then
  echo "  FAIL  version: stats.json=\"$STATS_VERSION\"  plugin.json=\"$PLUGIN_VERSION\""
  FAILED=$((FAILED + 1))
else
  echo "  PASS  plugin.json version: $PLUGIN_VERSION"
fi

echo ""
echo "───────────────────────────────────────"
if [ "$FAILED" -gt 0 ]; then
  echo "verify-metadata: FAIL ($FAILED issue(s) found)"
  exit 1
else
  echo "verify-metadata: PASS"
  exit 0
fi
