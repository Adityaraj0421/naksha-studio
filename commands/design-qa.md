---
description: "Visual QA on an HTML/CSS implementation — checks responsive behavior at mobile/tablet/desktop, design token compliance, interactive states (hover, focus, active), and motion quality."
argument-hint: "<file|url> [--visual] [--report-only]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /design-qa

Read and follow all instructions in `${CLAUDE_PLUGIN_ROOT}/agents/design-qa.md`.

Input: **$ARGUMENTS**

**Core loop:** Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/design/procedures/browser-self-check.md` with `TARGET` = the input, `CALLER=/design-qa`, `FIX=apply` for a local file (`report` for a URL or with `--report-only`), and `VISUAL=true` only with `--visual`. Run it first; score Responsive Design from its per-width results, keep the agent's token, state and motion audits, and end the report with its result block.
