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

if ! python3 -m json.tool "$EVALS_FILE" > /dev/null 2>&1; then
  echo "❌ evals/evals.json is not valid JSON"
  exit 1
fi
echo "✅ evals.json is valid JSON"

# 2. Count evals and assertions
EVAL_COUNT=$(python3 -c "import json; data=json.load(open('$EVALS_FILE')); print(len(data['evals']))")
ASSERTION_COUNT=$(python3 -c "
import json
data = json.load(open('$EVALS_FILE'))
total = sum(len(e['assertions']) for e in data['evals'])
print(total)
")
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
done < <(python3 -c "
import json, re
data = json.load(open('$EVALS_FILE'))
for e in data['evals']:
    # Check prompt for file references
    matches = re.findall(r'\./[\w/.-]+\.\w+', e['prompt'])
    for m in matches:
        print(m)
    # Check files array
    for f in e.get('files', []):
        if f:
            print(f)
")

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "⚠️  $MISSING fixture file(s) missing"
else
  echo "  (no fixture references found or all present)"
fi

# 4. Every command has at least one eval (a matching "command" field, or a prompt starting with /<command>)
echo ""
echo "Checking command coverage..."
UNCOVERED=$(python3 - "$EVALS_FILE" "$PLUGIN_ROOT/commands" <<'PYEOF'
import json, os, re, sys
evals = json.load(open(sys.argv[1]))['evals']
commands = sorted(f[:-3] for f in os.listdir(sys.argv[2]) if f.endswith('.md'))
covered = set()
for e in evals:
    if e.get('command'):
        covered.add(e['command'].strip().lstrip('/').split()[0])
    m = re.match(r'\s*/([\w-]+)', e.get('prompt', ''))
    if m:
        covered.add(m.group(1))
for c in commands:
    if c not in covered:
        print(c)
for c in sorted(covered - set(commands)):
    print(f"WARN {c}")
PYEOF
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
python3 -c "
import json
data = json.load(open('$EVALS_FILE'))
for e in data['evals']:
    print(f\"{e['id']:<4} {e['name']:<30} {len(e['assertions'])}\")
"
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
