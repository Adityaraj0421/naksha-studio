#!/usr/bin/env bash
set -euo pipefail
# guard-legacy-branding.sh — fails if legacy "design-studio" / "Design Studio" strings
# are found in source files. Prevents silent reintroduction after rebrand.
# Usage: bash scripts/guard-legacy-branding.sh
# Exit: 0 if clean, 1 if any banned terms found

REPO="$(cd "$(dirname "$0")/.." && pwd)"

echo "═══════════════════════════════════════"
echo "  guard-legacy-branding"
echo "═══════════════════════════════════════"
echo ""

RESULTS=$(grep -rn \
  --include="*.md" --include="*.sh" --include="*.js" --include="*.json" \
  -e "design-studio" -e "design_studio" -e "Design Studio" \
  --exclude-dir=".git" \
  --exclude-dir=".worktrees" \
  --exclude-dir="docs" \
  --exclude-dir="brand" \
  --exclude="CHANGELOG.md" \
  --exclude="REVIEW.md" \
  --exclude="guard-legacy-branding.sh" \
  "$REPO" 2>/dev/null) || GREP_RC=$?
GREP_RC=${GREP_RC:-0}
if [ "${GREP_RC}" -ge 2 ]; then
  echo "ERROR: grep failed with exit code ${GREP_RC}"
  exit 2
fi

if [ -n "$RESULTS" ]; then
  echo "Banned legacy branding found:"
  echo ""
  echo "$RESULTS"
  echo ""
  COUNT=$(echo "$RESULTS" | wc -l | tr -d ' ')
  echo "FAIL guard-legacy-branding: $COUNT occurrence(s) of banned terms found"
  exit 1
else
  echo "PASS guard-legacy-branding: no legacy branding found"
  exit 0
fi
