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

# 4. Summary table
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
echo "Done. These are structural checks only — eval execution requires Claude Code."
