#!/usr/bin/env bash
# quality-check.sh — runs all naksha-studio quality gates in sequence.
# Fail-at-end: all checks run regardless of individual failures.
# All 5 checks count toward FAILED.
# Usage: bash scripts/quality-check.sh
# Exit: 0 if all 5 checks pass, 1 if any fail

set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║       naksha quality check            ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# ── 1. Metadata consistency ────────────────────────────────────────────────
bash "$REPO/scripts/verify-metadata.sh" || FAILED=$((FAILED + 1))
echo ""

# ── 2. Behavioral smoke evals ─────────────────────────────────────────────
bash "$REPO/scripts/behavioral-smoke.sh" || FAILED=$((FAILED + 1))
echo ""

# ── 3. Design linter ──────────────────────────────────────────────────────────
echo "═══════════════════════════════════════"
echo "  design-lint"
echo "═══════════════════════════════════════"
echo ""
node "$REPO/scripts/design-lint.js" 2>/dev/null || FAILED=$((FAILED + 1))
echo ""

# ── 4. Legacy branding guard ──────────────────────────────────────────────
bash "$REPO/scripts/guard-legacy-branding.sh" || FAILED=$((FAILED + 1))
echo ""

# ── 5. Count drift guard ──────────────────────────────────────────────────
bash "$REPO/scripts/guard-counts.sh" || FAILED=$((FAILED + 1))
echo ""

# ── Summary ───────────────────────────────────────────────────────────────
echo "╔═══════════════════════════════════════╗"
if [ "$FAILED" -gt 0 ]; then
  echo "║  quality-check: FAIL ($FAILED of 5 failed) ║"
  echo "╚═══════════════════════════════════════╝"
  echo ""
  exit 1
else
  echo "║  quality-check: PASS (all 5 passed)   ║"
  echo "╚═══════════════════════════════════════╝"
  echo ""
  exit 0
fi
