#!/bin/bash
# Detect project design context for the naksha plugin
# Runs at SessionStart to provide the design skill with project awareness

PROJECT_DIR="${PWD}"
CONTEXT=""
NAKSHA_JSON=""

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
  NAKSHA_CONTEXT="Project Memory:\n"

  NAKSHA_NAME=$(grep '"name"' "$NAKSHA_JSON" | sed 's/.*: *"\(.*\)".*/\1/' | head -1)
  [ -n "$NAKSHA_NAME" ] && NAKSHA_CONTEXT="${NAKSHA_CONTEXT}- Project: ${NAKSHA_NAME}\n"

  NAKSHA_BRAND_PRIMARY=$(grep '"primary"' "$NAKSHA_JSON" | sed 's/.*: *"\(.*\)".*/\1/' | head -1)
  [ -n "$NAKSHA_BRAND_PRIMARY" ] && NAKSHA_CONTEXT="${NAKSHA_CONTEXT}- Brand: ${NAKSHA_BRAND_PRIMARY}\n"

  NAKSHA_BRAND_SECONDARY=$(grep '"secondary"' "$NAKSHA_JSON" | sed 's/.*"secondary"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -1)
  if [ -n "$NAKSHA_BRAND_SECONDARY" ] && [ "$NAKSHA_BRAND_SECONDARY" != "null" ] && echo "$NAKSHA_BRAND_SECONDARY" | grep -q "^#"; then
    NAKSHA_CONTEXT="${NAKSHA_CONTEXT}- Brand accent: ${NAKSHA_BRAND_SECONDARY}\n"
  fi

  NAKSHA_BRAND_FONT=$(grep '"font"' "$NAKSHA_JSON" | sed 's/.*: *"\(.*\)".*/\1/' | head -1)
  [ -n "$NAKSHA_BRAND_FONT" ] && NAKSHA_CONTEXT="${NAKSHA_CONTEXT}- Font: ${NAKSHA_BRAND_FONT}\n"

  NAKSHA_BRAND_VOICE=$(grep '"voice"' "$NAKSHA_JSON" | sed 's/.*: *"\(.*\)".*/\1/' | head -1)
  [ -n "$NAKSHA_BRAND_VOICE" ] && NAKSHA_CONTEXT="${NAKSHA_CONTEXT}- Voice: ${NAKSHA_BRAND_VOICE}\n"

  NAKSHA_FRAMEWORK=$(grep '"framework"' "$NAKSHA_JSON" | sed 's/.*: *"\(.*\)".*/\1/' | head -1)
  [ -n "$NAKSHA_FRAMEWORK" ] && NAKSHA_CONTEXT="${NAKSHA_CONTEXT}- Framework (from memory): ${NAKSHA_FRAMEWORK}\n"

  NAKSHA_TOKEN_FORMAT=$(grep '"tokenFormat"' "$NAKSHA_JSON" | sed 's/.*: *"\(.*\)".*/\1/' | head -1)
  [ -n "$NAKSHA_TOKEN_FORMAT" ] && NAKSHA_CONTEXT="${NAKSHA_CONTEXT}- Token format: ${NAKSHA_TOKEN_FORMAT}\n"

  CONTEXT="${NAKSHA_CONTEXT}${CONTEXT}"
fi

# --- CSS Framework ---
if [ -f "$PROJECT_DIR/tailwind.config.js" ] || [ -f "$PROJECT_DIR/tailwind.config.ts" ] || [ -f "$PROJECT_DIR/tailwind.config.mjs" ] || [ -f "$PROJECT_DIR/tailwind.config.cjs" ]; then
  CONTEXT="${CONTEXT}- CSS Framework: Tailwind CSS\n"
elif [ -f "$PROJECT_DIR/postcss.config.js" ] || [ -f "$PROJECT_DIR/postcss.config.mjs" ] || [ -f "$PROJECT_DIR/postcss.config.cjs" ]; then
  CONTEXT="${CONTEXT}- CSS Framework: PostCSS (check for plugins)\n"
fi

if grep -q '"bootstrap"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- CSS Framework: Bootstrap\n"
fi

# --- CSS-in-JS ---
if grep -q '"styled-components"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Styling: styled-components (CSS-in-JS)\n"
elif grep -q '"@emotion/react"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Styling: Emotion (CSS-in-JS)\n"
elif grep -q '"@vanilla-extract"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Styling: vanilla-extract (CSS-in-JS)\n"
fi

# --- JS Framework ---
if grep -q '"next"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Next.js\n"
elif grep -q '"nuxt"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Nuxt\n"
elif grep -q '"@angular/core"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Angular\n"
elif grep -q '"astro"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Astro\n"
elif grep -q '"@remix-run"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Remix\n"
elif grep -q '"react"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: React\n"
elif grep -q '"vue"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Vue\n"
elif grep -q '"svelte"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: Svelte\n"
elif grep -q '"solid-js"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Framework: SolidJS\n"
fi

# --- TypeScript ---
if [ -f "$PROJECT_DIR/tsconfig.json" ]; then
  CONTEXT="${CONTEXT}- Language: TypeScript\n"
fi

# --- Build Tools ---
if [ -f "$PROJECT_DIR/vite.config.js" ] || [ -f "$PROJECT_DIR/vite.config.ts" ] || [ -f "$PROJECT_DIR/vite.config.mjs" ]; then
  CONTEXT="${CONTEXT}- Build tool: Vite\n"
elif grep -q '"webpack"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Build tool: Webpack\n"
elif [ -f "$PROJECT_DIR/turbo.json" ]; then
  CONTEXT="${CONTEXT}- Build tool: Turborepo (monorepo)\n"
fi

# --- Component Libraries ---
if grep -q '"@radix-ui"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: Radix UI\n"
elif grep -q '"@chakra-ui"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: Chakra UI\n"
elif grep -q '"@mui/material"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: MUI (Material UI)\n"
elif grep -q '"@mantine"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  CONTEXT="${CONTEXT}- Components: Mantine\n"
elif grep -q '"shadcn"' "$PROJECT_DIR/package.json" 2>/dev/null || [ -d "$PROJECT_DIR/components/ui" ]; then
  CONTEXT="${CONTEXT}- Components: shadcn/ui\n"
fi

# --- Design Tokens ---
if find "$PROJECT_DIR/src" -name "*.tokens.json" -maxdepth 4 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Design tokens: JSON token files found\n"
fi

if find "$PROJECT_DIR/src" -name "tokens.css" -o -name "variables.css" -o -name "design-tokens.css" -maxdepth 4 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Design tokens: CSS custom properties file found\n"
fi

if find "$PROJECT_DIR" -name "tokens.json" -o -name "style-dictionary.config.*" -maxdepth 3 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Design tokens: Style Dictionary config detected\n"
fi

# --- Figma Integration ---
if [ -f "$PROJECT_DIR/.figmarc" ] || [ -f "$PROJECT_DIR/figma.config.json" ]; then
  CONTEXT="${CONTEXT}- Figma: Configuration file detected\n"
fi

if [ -f "$PROJECT_DIR/.code-connect" ] || find "$PROJECT_DIR" -name "*.figma.tsx" -maxdepth 4 2>/dev/null | head -1 | grep -q .; then
  CONTEXT="${CONTEXT}- Figma: Code Connect files detected\n"
fi

# --- Firebase ---
if [ -f "$PROJECT_DIR/firebase.json" ]; then
  CONTEXT="${CONTEXT}- Deployment: Firebase project configured\n"
fi

# --- Storybook ---
if [ -d "$PROJECT_DIR/.storybook" ]; then
  CONTEXT="${CONTEXT}- Documentation: Storybook configured\n"
fi

# --- Output ---
if [ -n "$CONTEXT" ]; then
  if [ -n "$NAKSHA_JSON" ]; then
    RESULT=$(printf '{"continue": true, "systemMessage": "Naksha project memory loaded. Context:\\n%s\\nAdapt design recommendations to match these project conventions."}' "$CONTEXT")
  else
    RESULT=$(printf '{"continue": true, "systemMessage": "Naksha detected project context:\\n%s\\nAdapt design recommendations to match these project conventions."}' "$CONTEXT")
  fi
  echo "$RESULT"
else
  echo '{"continue": true}'
fi
