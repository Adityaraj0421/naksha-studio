#!/bin/bash
# Detect project design context for the naksha plugin
# Runs at SessionStart to provide the design skill with project awareness.
#
# Contract (code.claude.com/docs/en/hooks, SessionStart): stdin is JSON with
# session_id, transcript_path, cwd, hook_event_name and source
# ("startup" | "resume" | "clear" | "compact" | "fork"). Context for Claude goes
# in hookSpecificOutput.additionalContext (Claude Code caps it at 10,000
# chars; we stay far below). `systemMessage` is only a notice shown to the
# user, so it is not used for context. Always exits 0 with one JSON object.
#
# For naksha projects this injects a COMPACT memory index (<= 600 chars, see
# scripts/lib/session-brief.js) instead of dumping memory; after compaction or
# on resume it also restores .naksha/session-brief.md when it is < 24h old.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT=""
if [ ! -t 0 ]; then
  IFS= read -r -d '' -t 2 INPUT || true
fi

# Pull a top-level string field out of the hook input without jq.
json_field() {
  printf '%s' "$INPUT" | tr -d '\n' | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -1
}

# Escape a string for use inside a JSON string literal.
json_escape() {
  local s bs='\' q='"'
  s="$(printf '%s' "$1" | tr -d '\000-\010\013\014\016-\037')"
  s="${s//"$bs"/"$bs$bs"}"
  s="${s//"$q"/"$bs$q"}"
  s="${s//$'\t'/"${bs}t"}"
  s="${s//$'\r'/"${bs}r"}"
  s="${s//$'\n'/"${bs}n"}"
  printf '%s' "$s"
}

PROJECT_DIR="$(json_field cwd)"
[ -n "$PROJECT_DIR" ] && [ -d "$PROJECT_DIR" ] || PROJECT_DIR="${PWD}"
SOURCE="$(json_field source)"
case "$SOURCE" in startup|resume|clear|compact|fork) ;; *) SOURCE="" ;; esac
NL=$'\n'
CONTEXT=""
NAKSHA_JSON=""
NAKSHA_CONTEXT=""

# --- .naksha/project.json (Project Memory) ---
SEARCH_DIR="$PROJECT_DIR"
for i in 1 2 3; do
  if [ -f "$SEARCH_DIR/.naksha/project.json" ]; then
    NAKSHA_JSON="$SEARCH_DIR/.naksha/project.json"
    break
  fi
  SEARCH_DIR="$(dirname "$SEARCH_DIR")"
done

if [ -n "$NAKSHA_JSON" ]; then
  if command -v node >/dev/null 2>&1; then
    NAKSHA_CONTEXT="$(node "$SCRIPT_DIR/lib/session-brief.js" index --dir "$PROJECT_DIR" ${SOURCE:+--source "$SOURCE"} 2>/dev/null)" || NAKSHA_CONTEXT=""
  fi
  if [ -z "$NAKSHA_CONTEXT" ]; then
    # No node (or it failed): fall back to the name alone, which is still compact.
    NAKSHA_NAME=$(grep '"name"' "$NAKSHA_JSON" | sed 's/.*: *"\(.*\)".*/\1/' | head -1 | cut -c1-60)
    NAKSHA_CONTEXT="Naksha project memory: ${NAKSHA_NAME:-unnamed project}.${NL}Run /naksha-status for details; read .naksha/project.json only when a task needs the full entries."
  fi
fi

# --- CSS Framework ---
if [ -f "$PROJECT_DIR/tailwind.config.js" ] || [ -f "$PROJECT_DIR/tailwind.config.ts" ] || [ -f "$PROJECT_DIR/tailwind.config.mjs" ] || [ -f "$PROJECT_DIR/tailwind.config.cjs" ]; then
  CONTEXT="${CONTEXT}- CSS Framework: Tailwind CSS${NL}"
elif [ -f "$PROJECT_DIR/postcss.config.js" ] || [ -f "$PROJECT_DIR/postcss.config.mjs" ] || [ -f "$PROJECT_DIR/postcss.config.cjs" ]; then
  CONTEXT="${CONTEXT}- CSS Framework: PostCSS (check for plugins)${NL}"
fi

if grep -q '"bootstrap"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- CSS Framework: Bootstrap${NL}"
fi

# --- CSS-in-JS ---
if grep -q '"styled-components"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Styling: styled-components (CSS-in-JS)${NL}"
elif grep -q '"@emotion/react"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Styling: Emotion (CSS-in-JS)${NL}"
elif grep -q '"@vanilla-extract"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Styling: vanilla-extract (CSS-in-JS)${NL}"
fi

# --- JS Framework ---
if grep -q '"next"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Next.js${NL}"
elif grep -q '"nuxt"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Nuxt${NL}"
elif grep -q '"@angular/core"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Angular${NL}"
elif grep -q '"astro"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Astro${NL}"
elif grep -q '"@remix-run"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Remix${NL}"
elif grep -q '"react"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: React${NL}"
elif grep -q '"vue"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Vue${NL}"
elif grep -q '"svelte"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Svelte${NL}"
elif grep -q '"solid-js"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: SolidJS${NL}"
fi

# --- TypeScript ---
if [ -f "$PROJECT_DIR/tsconfig.json" ]; then
  CONTEXT="${CONTEXT}- Language: TypeScript${NL}"
fi

# --- Build Tools ---
if [ -f "$PROJECT_DIR/vite.config.js" ] || [ -f "$PROJECT_DIR/vite.config.ts" ] || [ -f "$PROJECT_DIR/vite.config.mjs" ]; then
  CONTEXT="${CONTEXT}- Build tool: Vite${NL}"
elif grep -q '"webpack"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Build tool: Webpack${NL}"
elif [ -f "$PROJECT_DIR/turbo.json" ]; then
  CONTEXT="${CONTEXT}- Build tool: Turborepo (monorepo)${NL}"
fi

# --- Component Libraries ---
if grep -q '"@radix-ui"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: Radix UI${NL}"
elif grep -q '"@chakra-ui"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: Chakra UI${NL}"
elif grep -q '"@mui/material"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: MUI (Material UI)${NL}"
elif grep -q '"@mantine"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: Mantine${NL}"
elif grep -q '"shadcn"' "$PROJECT_DIR/package.json" 2>/dev/null || [ -d "$PROJECT_DIR/components/ui" ]; then
  CONTEXT="${CONTEXT}- Components: shadcn/ui${NL}"
fi

# --- Design Tokens ---
if find "$PROJECT_DIR/src" -name "*.tokens.json" -maxdepth 4 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Design tokens: JSON token files found${NL}"
fi

if find "$PROJECT_DIR/src" -name "tokens.css" -o -name "variables.css" -o -name "design-tokens.css" -maxdepth 4 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Design tokens: CSS custom properties file found${NL}"
fi

if find "$PROJECT_DIR" -name "tokens.json" -o -name "style-dictionary.config.*" -maxdepth 3 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Design tokens: Style Dictionary config detected${NL}"
fi

# --- Figma Integration ---
if [ -f "$PROJECT_DIR/.figmarc" ] || [ -f "$PROJECT_DIR/figma.config.json" ]; then
  CONTEXT="${CONTEXT}- Figma: Configuration file detected${NL}"
fi

if [ -f "$PROJECT_DIR/.code-connect" ] || find "$PROJECT_DIR" -name "*.figma.tsx" -maxdepth 4 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Figma: Code Connect files detected${NL}"
fi

# --- Firebase ---
if [ -f "$PROJECT_DIR/firebase.json" ]; then
  CONTEXT="${CONTEXT}- Deployment: Firebase project configured${NL}"
fi

# --- Storybook ---
if [ -d "$PROJECT_DIR/.storybook" ]; then
  CONTEXT="${CONTEXT}- Documentation: Storybook configured${NL}"
fi

# --- Output ---
MESSAGE=""
if [ -n "$NAKSHA_CONTEXT" ]; then
  MESSAGE="${NAKSHA_CONTEXT}"
  [ -n "$CONTEXT" ] && MESSAGE="${MESSAGE}${NL}${NL}Detected stack:${NL}${CONTEXT%"$NL"}"
  MESSAGE="${MESSAGE}${NL}Adapt design recommendations to match these project conventions."
elif [ -n "$CONTEXT" ]; then
  MESSAGE="Naksha detected project context:${NL}${CONTEXT}Adapt design recommendations to match these project conventions."
fi

if [ -n "$MESSAGE" ]; then
  printf '{"continue": true, "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s"}}\n' "$(json_escape "$MESSAGE")"
else
  echo '{"continue": true}'
fi
exit 0
