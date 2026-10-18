#!/usr/bin/env bash
# design-lint-hook.sh — PostToolUse hook (Write|Edit) for the naksha plugin.
# Lints the file Claude just wrote when it is a UI file (.html .css .scss .jsx
# .tsx .vue .svelte) and reports a short, non-blocking summary.
# Contract: always exits 0 and always prints one JSON object on stdout.
# Opt out with NAKSHA_LINT_HOOK=off or "hook": false in .design-lint.json.

PASS='{"continue": true}'

if [ "${NAKSHA_LINT_HOOK:-on}" = "off" ]; then
  echo "$PASS"
  exit 0
fi

INPUT="$(cat 2>/dev/null || true)"

# Cheap pre-filter so non-UI edits never start node.
case "$INPUT" in
  *.html\"*|*.htm\"*|*.css\"*|*.scss\"*|*.jsx\"*|*.tsx\"*|*.vue\"*|*.svelte\"*) ;;
  *) echo "$PASS"; exit 0 ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "$PASS"
  exit 0
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$(printf '%s' "$INPUT" | node "$DIR/design-lint-hook.js" 2>/dev/null)" || OUT=""

if [ -n "$OUT" ]; then
  printf '%s\n' "$OUT"
else
  echo "$PASS"
fi
exit 0
