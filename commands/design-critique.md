---
description: "UX heuristic review of Figma screens — evaluates against Nielsen's 10 heuristics, visual design quality, spacing, color, typography hierarchy, and interaction states."
argument-hint: "[nodeId]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /design-critique

## Vision Mode (Screenshot Input)

If `$ARGUMENTS` contains `--screenshot <path>`:
1. Extract the path: everything after `--screenshot ` in the arguments
2. Read the image file at that path using the Read tool
3. Perform a direct vision-mode heuristic review (do not delegate to agent for vision mode):
   - Evaluate the screenshot against all 10 Nielsen heuristics
   - Note specific elements visible in the image that pass or fail each heuristic
   - Score each heuristic: ✓ Pass / ⚠ Partial / ✗ Fail
   - Provide 3-5 prioritized improvement recommendations
4. Output format:
   ```
   ## Design Critique: {filename}

   ### Heuristic Scores
   | # | Heuristic | Score | Observation |
   |---|-----------|-------|-------------|
   | 1 | Visibility of system status | ✓/⚠/✗ | … |
   ...

   ### Top Recommendations
   1. [Priority 1]
   2. [Priority 2]
   3. [Priority 3]
   ```

If `$ARGUMENTS` does NOT contain `--screenshot`:

Read and follow all instructions in `${CLAUDE_PLUGIN_ROOT}/agents/design-critique.md`.

Input: **$ARGUMENTS**

If `$ARGUMENTS` contains a nodeId, target that specific frame. Otherwise, critique the current Figma selection.
