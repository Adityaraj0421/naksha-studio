---
name: prompt-refine
description: Diagnose and optimize any AI gen prompt — annotated critique of weak tokens and missing modifiers, optimized prompt with explanations, and a cross-tool variant adapted for a second tool.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
arguments: "<existing prompt> [-- tool: midjourney|dalle|runway|ideogram|sd]"
---

# /prompt-refine $ARGUMENTS

You are activating the **AI Visual Gen Wing**: AI Prompt Engineer.

---

## Process

### 1. Parse the Input

Extract from `$ARGUMENTS`:
- **Existing prompt:** the full prompt text to audit
- **Tool:** which tool this is intended for (default: Midjourney if unspecified)
- **Context:** what the prompt is trying to achieve (if provided)

---

### 2. Identify the Tool

If tool is not specified in `$ARGUMENTS`, identify it from syntax clues:
- `--ar`, `--style`, `--no` → Midjourney
- Instruction-style natural language → DALL-E 3
- Scene/motion description → Runway
- Otherwise → ask before proceeding

---

### 3. Annotated Critique

Run the prompt through the AI Prompt Engineer's 8-failure-mode checklist. For each issue found, annotate inline:

```
Original prompt:
"[paste original]"

Annotated:
"[token] ← [WEAK: reason] [token] ← [MISSING: what's absent] [token] ← [OK]"
```

Issues to check:
- [ ] Are all 6 anatomy elements present (subject, style, lighting, camera, mood, negatives)?
- [ ] Are style tokens specific or vague? ("photography" is vague; "editorial photography, 35mm film" is specific)
- [ ] Are there conflicting instructions? (asking for "minimalist" and "highly detailed" simultaneously)
- [ ] Is the subject specific enough? ("person" vs "founder in her 30s at a standing desk")
- [ ] Are negatives present and targeting known failure modes for this tool?
- [ ] Is tool-specific syntax correct? (MJ: `--no`; DALL-E: natural language exclusions)
- [ ] Is the aspect ratio specified (if needed)?
- [ ] Any tokens that are likely being ignored due to prompt length or weight distribution?

---

### 4. Optimized Prompt

Deliver the improved prompt with changes highlighted:

```
## Optimized Prompt ([tool name])
[full optimized prompt]

## Changes Made
- **Added:** [token] — [reason]
- **Replaced:** "[old token]" → "[new token]" — [reason]
- **Removed:** [token] — [reason it was hurting the output]
- **Reordered:** [what moved where and why]
```

---

### 5. Cross-Tool Variant

Translate the optimized prompt to one other tool. Choose the most relevant alternative:
- If original is MJ → produce DALL-E 3 version
- If original is Runway → produce Kling version
- If DALL-E → produce MJ version

```
## Cross-Tool Variant ([second tool name])
[translated prompt in second tool's syntax]

## Translation Notes
[1-3 notes on what changed and why — syntax differences, unavailable parameters, etc.]
```

---

## MCP Fallback

Not applicable.

---

## What's Next

- Paste the optimized prompt into the target tool and generate
- If output still misses the brief, run `/prompt-refine` again with the new prompt + note what the issue is
- Once approved, hand to AI Prompt Engineer to store in the brand prompt library
