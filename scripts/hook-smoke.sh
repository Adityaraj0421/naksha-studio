#!/usr/bin/env bash
# hook-smoke.sh — verifies that every `type: command` hook in hooks/hooks.json
# actually runs from an installed copy of the plugin. Guards against the two
# silent failures from issue #17: an unquoted ${CLAUDE_PLUGIN_ROOT} breaking on
# paths with spaces, and a hook script shipped without its executable bit.
# Usage: bash scripts/hook-smoke.sh
# Exit: 0 if clean, 1 if any check fails

set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS="$REPO/hooks/hooks.json"
FAILED=0

echo "═══════════════════════════════════════"
echo "  hook-smoke"
echo "═══════════════════════════════════════"
echo ""

# ── Check 1: Shell scripts are tracked as executable ─────────────────────────
echo "Check 1 — Shell scripts are executable"

if git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  while read -r mode path; do
    if [ "$mode" = "100755" ]; then
      echo "  PASS  $path"
    else
      echo "  FAIL  $path: tracked as $mode, expected 100755 (run: git update-index --chmod=+x $path)"
      FAILED=$((FAILED + 1))
    fi
  done < <(git -C "$REPO" ls-files -s -- '*.sh' | awk '{print $1, $4}')
else
  echo "  SKIP  not a git checkout — file modes not checked"
fi

echo ""

# ── Check 2: Command hooks run from a plugin path containing spaces ──────────
echo "Check 2 — Command hooks run from a path with spaces"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PLUGIN_ROOT="$TMP/Application Support/naksha plugin"
PROJECT_DIR="$TMP/project"
mkdir -p "$PLUGIN_ROOT" "$PROJECT_DIR"
cp -R "$REPO/hooks" "$REPO/scripts" "$PLUGIN_ROOT/"
# Hooks may also run scripts from these plugin dirs (e.g. Naksha Live's dashboard/hooks/emit.js)
for extra in dashboard adapters commands; do
  if [ -d "$REPO/$extra" ]; then cp -R "$REPO/$extra" "$PLUGIN_ROOT/"; fi
done

# One line per command hook: <event>\t<timeout>\t<command>
HOOK_LINES=$(python3 - "$HOOKS" <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
for event, groups in data.get("hooks", {}).items():
    for group in groups:
        for hook in group.get("hooks", []):
            if hook.get("type") == "command":
                print(f"{event}\t{hook.get('timeout', 60)}\t{hook['command']}")
PYEOF
)

if [ -z "$HOOK_LINES" ]; then
  echo "  WARN  no command hooks found in hooks/hooks.json"
fi

# GNU timeout is not installed by default on macOS — enforce the hook's timeout only when available
TIMEOUT_CMD=""
command -v timeout >/dev/null 2>&1 && TIMEOUT_CMD="timeout"

run_hooks() {
  local label="$1"
  while IFS=$'\t' read -r event timeout_s command; do
    [ -z "$event" ] && continue
    local out rc=0
    out=$(cd "$PROJECT_DIR" && printf '{"hook_event_name":"%s"}' "$event" \
      | CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" ${TIMEOUT_CMD:+$TIMEOUT_CMD "$timeout_s"} sh -c "$command" 2>&1) || rc=$?
    if [ "$rc" -ne 0 ]; then
      echo "  FAIL  $event ($label): exited $rc"
      printf '%s\n' "$out" | head -5 | sed 's/^/        /' || true
      FAILED=$((FAILED + 1))
    elif ! printf '%s' "$out" | python3 -c "import json, sys; json.load(sys.stdin)" 2>/dev/null; then
      echo "  FAIL  $event ($label): output is not valid JSON"
      printf '%s\n' "$out" | head -5 | sed 's/^/        /' || true
      FAILED=$((FAILED + 1))
    else
      echo "  PASS  $event ($label)"
    fi
  done <<< "$HOOK_LINES"
}

run_hooks "scripts executable"

# Packaging can drop the executable bit, so hooks must not depend on it.
find "$PLUGIN_ROOT/scripts" -name '*.sh' -exec chmod 644 {} +
run_hooks "scripts not executable"

echo ""
echo "───────────────────────────────────────"
if [ "$FAILED" -gt 0 ]; then
  echo "hook-smoke: FAIL ($FAILED issue(s) found)"
  exit 1
else
  echo "hook-smoke: PASS"
  exit 0
fi
