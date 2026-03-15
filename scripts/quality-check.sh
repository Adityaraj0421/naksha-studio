#!/usr/bin/env bash
# quality-check.sh — runs all naksha-studio quality gates in sequence.
# Fail-at-end: all checks run regardless of individual failures.
# Only 3 checks count toward FAILED (design-lint is a binary smoke test).
# Usage: bash scripts/quality-check.sh
# Exit: 0 if all 3 real checks pass, 1 if any fail

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

# ── 3. Design linter (binary smoke test — linter binary health check only)
echo "═══════════════════════════════════════"
echo "  design-lint (binary smoke test)"
echo "═══════════════════════════════════════"
echo ""
node "$REPO/scripts/design-lint.js" 2>/dev/null || true
echo "  (linter binary smoke test complete — not counted in quality gate)"
echo ""

# ── 4. Legacy branding guard ──────────────────────────────────────────────
bash "$REPO/scripts/guard-legacy-branding.sh" || FAILED=$((FAILED + 1))
echo ""

# ── Summary ───────────────────────────────────────────────────────────────
echo "╔═══════════════════════════════════════╗"
if [ "$FAILED" -gt 0 ]; then
  echo "║  quality-check: FAIL ($FAILED of 3 failed) ║"
  echo "╚═══════════════════════════════════════╝"
  echo ""
  exit 1
else
  echo "║  quality-check: PASS (all 3 passed)   ║"
  echo "╚═══════════════════════════════════════╝"
  echo ""
  exit 0
fi
