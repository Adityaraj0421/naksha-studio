# MCP Setup Guide

Naksha uses **4 optional MCP servers** for Figma integration, live preview, and website capture. All 32 commands degrade gracefully without them — you get markdown specs, CSS tokens, and HTML files instead of live Figma/preview workflows.

---

## 1. Figma REST MCP (figma-context-mcp)

**Purpose**: Read Figma file data, export images, get design context for code generation.

**Used by**: `/figma`, `/design-handoff`, `/figma-sync`, `/component-docs`, `/ux-audit`, `/design-present`, `/site-to-figma`

**Setup**:
1. Get a [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens)
2. Add to your MCP config (`.mcp.json` or Claude Code settings):
```json
{
  "mcpServers": {
    "figma-context-mcp": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "your-token-here"
      }
    }
  }
}
```

---

## 2. Figma Desktop Bridge (figma-console)

**Purpose**: Execute code inside Figma Desktop — create frames, set styles, build components, read selections.

**Used by**: `/figma-create`, `/figma-responsive`, `/figma-prototype`, `/ab-variants`, `/brand-kit` (Figma styles), `/design-handoff` (live extraction)

**Setup**:
1. Open Figma Desktop (not the browser version)
2. Install the [Figma Desktop Bridge](https://www.figma.com/community/plugin/figma-desktop-bridge) plugin
3. Right-click canvas → Plugins → Development → Figma Desktop Bridge
4. The plugin starts a WebSocket server — the MCP server connects to it automatically

**MCP config**:
```json
{
  "mcpServers": {
    "figma-console": {
      "command": "npx",
      "args": ["-y", "@anthropic/figma-console-mcp"]
    }
  }
}
```

---

## 3. Claude Preview MCP

**Purpose**: Start dev servers, take screenshots, inspect elements, test interactions — live in your editor.

**Used by**: `/design`, `/brand-kit`, `/social-content`, `/social-analytics`, `/design-review` (visual audit)

**Setup**: Ships with Claude Code. No additional installation needed. Requires a `.claude/launch.json` file in your project:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "design-preview",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["serve", "."],
      "port": 3000
    }
  ]
}
```

---

## 4. Playwright MCP

**Purpose**: Browser automation — navigate to URLs, capture screenshots, extract computed styles from live websites.

**Used by**: `/site-to-figma` (primary), `/design-review` (optional live audit)

**Setup**:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/playwright-mcp"]
    }
  }
}
```

First run will auto-install the browser binary. If you get a browser-not-found error, run:
```bash
npx playwright install chromium
```

---

## Verification

Check that each server is connected:

| Server | Verification |
|--------|-------------|
| Figma REST MCP | Ask Claude: "What Figma tools are available?" — should list `get_design_context`, `get_screenshot`, etc. |
| Desktop Bridge | Open a Figma file with the plugin running, then ask Claude: "Get the current Figma selection" |
| Claude Preview | Run `/design` on any task — it should start a preview server and take screenshots |
| Playwright | Ask Claude: "Navigate to https://example.com and take a screenshot" |

---

## Working Without MCP

Every command has a fallback mode. Here's what changes without each server:

| Without... | What Happens |
|-----------|-------------|
| **Figma REST MCP** | No Figma file reading. Commands output markdown specs, CSS tokens, and HTML instead of reading/writing Figma data. |
| **Desktop Bridge** | No Figma creation. `/figma-create` outputs a text specification. `/figma-responsive` outputs an adaptation plan. `/ab-variants` outputs a variant spec table. |
| **Claude Preview** | No live preview or screenshots. HTML files are written to disk — open them manually in your browser. |
| **Playwright** | No website capture. `/site-to-figma` asks you for a screenshot and manually extracted styles instead. |
| **All of them** | Naksha still works for HTML/CSS design, token generation, brand kits, design reviews (static audit), and design sprints. You get files on disk instead of live integrations. |
