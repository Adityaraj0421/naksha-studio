#!/bin/bash
# precompact-brief.sh — PreCompact hook for the naksha plugin.
# Saves a <= 2 KB design brief to .naksha/session-brief.md before Claude Code
# compacts the conversation, so the SessionStart hook (source "compact") can
# hand the design state back afterwards. See scripts/lib/session-brief.js.
#
# Contract (code.claude.com/docs/en/hooks, PreCompact): stdin is JSON with
# session_id, transcript_path, cwd, hook_event_name, trigger ("manual"|"auto")
# and custom_instructions. Exit 2 or {"decision":"block"} would block
# compaction, so this hook always exits 0 and never blocks. Claude Code
# discards a PreCompact hook's `continue` and `systemMessage`; we print
# {"continue": true} only so the output is valid JSON for any caller.
#
# No .naksha/ directory, no node, unreadable input: silently a no-op.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT=""
if [ ! -t 0 ]; then
  IFS= read -r -d '' -t 2 INPUT || true
fi

# Pull a top-level string field out of the hook input without jq.
json_field() {
  printf '%s' "$INPUT" | tr -d '\n' | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -1
}

PROJECT_DIR="$(json_field cwd)"
[ -n "$PROJECT_DIR" ] && [ -d "$PROJECT_DIR" ] || PROJECT_DIR="$PWD"
TRIGGER="$(json_field trigger)"
case "$TRIGGER" in manual|auto) ;; *) TRIGGER="" ;; esac

if command -v node >/dev/null 2>&1; then
  node "$SCRIPT_DIR/lib/session-brief.js" brief --dir "$PROJECT_DIR" ${TRIGGER:+--trigger "$TRIGGER"} >/dev/null 2>&1 || true
fi

echo '{"continue": true}'
exit 0
