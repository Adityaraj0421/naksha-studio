---
description: "Scan a Figma file for design quality issues — orphan colors, spacing violations, non-standard type sizes, missing auto-layout, and detached styles. Returns a prioritized lint report with severity levels and fix suggestions."
argument-hint: "[nodeId]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /lint-design

Read and follow all instructions in `${CLAUDE_PLUGIN_ROOT}/agents/design-lint.md`.

Input: **$ARGUMENTS**

If `$ARGUMENTS` contains a nodeId, target that specific frame. Otherwise, scan the current Figma page.
