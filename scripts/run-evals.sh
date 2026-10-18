#!/usr/bin/env bash
# run-evals.sh — Validate eval structure and report summary
# Usage: bash scripts/run-evals.sh

set -euo pipefail
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EVALS_FILE="$PLUGIN_ROOT/evals/evals.json"

echo "═══════════════════════════════════════"
echo "  Naksha — Eval Validator"
echo "═══════════════════════════════════════"
echo ""

# 1. Check evals.json exists and is valid JSON
if [ ! -f "$EVALS_FILE" ]; then
  echo "❌ evals/evals.json not found"
  exit 1
fi

# node, not python3: the rest of the tooling already needs it, and Windows often has no python3
if ! command -v node > /dev/null 2>&1; then
  echo "❌ node is required to validate evals (https://nodejs.org)"
  exit 1
fi

if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$EVALS_FILE" > /dev/null 2>&1; then
  echo "❌ evals/evals.json is not valid JSON"
  exit 1
fi
echo "✅ evals.json is valid JSON"

# 2. Count evals and assertions
EVAL_COUNT=$(node -e 'console.log(require(process.argv[1]).evals.length)' "$EVALS_FILE")
ASSERTION_COUNT=$(node -e 'console.log(require(process.argv[1]).evals.reduce((n, e) => n + e.assertions.length, 0))' "$EVALS_FILE")
echo "📋 $EVAL_COUNT eval cases with $ASSERTION_COUNT total assertions"

# 3. Check for referenced fixture files
echo ""
echo "Checking fixture references..."
MISSING=0
while IFS= read -r path; do
  # Resolve relative paths from evals/ directory
  FULL_PATH="$PLUGIN_ROOT/evals/${path#./evals/}"
  # Also try from plugin root
  FULL_PATH_ALT="$PLUGIN_ROOT/$path"
  if [ -f "$FULL_PATH" ] || [ -f "$FULL_PATH_ALT" ]; then
    echo "  ✅ $path"
  else
    echo "  ❌ $path (file not found)"
    MISSING=$((MISSING + 1))
  fi
done < <(node - "$EVALS_FILE" <<'JSEOF'
for (const e of require(process.argv[2]).evals) {
  // Check prompt for file references
  for (const m of e.prompt.match(/\.\/[\w/.-]+\.\w+/g) || []) console.log(m);
  // Check files array
  for (const f of e.files || []) if (f) console.log(f);
}
JSEOF
)

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "⚠️  $MISSING fixture file(s) missing"
else
  echo "  (no fixture references found or all present)"
fi

# 4. Every command has at least one eval (a matching "command" field, or a prompt starting with /<command>)
echo ""
echo "Checking command coverage..."
UNCOVERED=$(node - "$EVALS_FILE" "$PLUGIN_ROOT/commands" <<'JSEOF'
const fs = require('fs');
const [evalsFile, commandsDir] = process.argv.slice(2);
const evals = JSON.parse(fs.readFileSync(evalsFile, 'utf8')).evals;
const commands = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)).sort();
const covered = new Set();
for (const e of evals) {
  if (e.command) covered.add(e.command.trim().replace(/^\/+/, '').split(/\s+/)[0]);
  const m = /^\s*\/([\w-]+)/.exec(e.prompt || '');
  if (m) covered.add(m[1]);
}
for (const c of commands) if (!covered.has(c)) console.log(c);
for (const c of [...covered].filter(c => !commands.includes(c)).sort()) console.log(`WARN ${c}`);
JSEOF
)
COVERAGE_FAILED=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  case "$line" in
    "WARN "*) echo "  ⚠️  eval targets /${line#WARN } but commands/${line#WARN }.md does not exist" ;;
    *) echo "  ❌ /$line has no eval case"; COVERAGE_FAILED=$((COVERAGE_FAILED + 1)) ;;
  esac
done <<< "$UNCOVERED"
if [ "$COVERAGE_FAILED" -eq 0 ]; then
  echo "  ✅ all $(find "$PLUGIN_ROOT/commands" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ') commands have at least one eval"
fi

# 5. Summary table
echo ""
echo "───────────────────────────────────────"
printf "%-4s %-30s %s\n" "ID" "Name" "Assertions"
echo "───────────────────────────────────────"
node - "$EVALS_FILE" <<'JSEOF'
for (const e of require(process.argv[2]).evals)
  console.log(`${String(e.id).padEnd(4)} ${String(e.name).padEnd(30)} ${e.assertions.length}`);
JSEOF
echo "───────────────────────────────────────"
echo ""

# 6. Tiered schema (tier/weight/check/threshold/budget_usd) and deterministic
#    checks against fixtures — the $0 structural tier of scripts/eval-runner.js
RUNNER_FAILED=0
if ! node "$PLUGIN_ROOT/scripts/eval-runner.js" --tier structural; then
  RUNNER_FAILED=1
fi
echo ""
echo "Done. Paid tiers (e2e, judge) run separately: node scripts/eval-runner.js --tier judge --dry-run (see docs/evals.md)."

if [ "$COVERAGE_FAILED" -gt 0 ]; then
  echo ""
  echo "❌ $COVERAGE_FAILED command(s) have no eval case — add one to evals/evals.json"
  exit 1
fi
if [ "$RUNNER_FAILED" -gt 0 ]; then
  echo ""
  echo "❌ eval-runner structural tier failed — see docs/evals.md"
  exit 1
fi
