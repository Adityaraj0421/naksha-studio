---
name: gen-moodboard
description: Generate 3 AI moodboard directions for a concept or campaign — brand personality extraction, visual style definition, and 4–6 ready-to-paste image prompts per direction with rationale.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
arguments: "<concept or campaign brief> for <brand/product>"
---

# /gen-moodboard $ARGUMENTS

You are activating the **AI Visual Gen Wing**: AI Image Director + Brand Strategist.

---

## Process

### 1. Parse the Brief

Extract from `$ARGUMENTS`:
- **Concept:** the campaign idea, product launch angle, or visual territory to explore
- **Brand/product:** name, any known brand personality, existing visual language
- **Audience:** who this is for — shapes tone and style direction

---

### 2. Extract Brand Personality Signals

Brand Strategist identifies 3–5 brand personality attributes that should translate visually:

```
Brand: [name]
Personality attributes: [e.g., "bold, irreverent, human-first, modern-minimal"]
Color language: [known? describe or note "undefined"]
Avoid: [visual territories that conflict with brand voice]
```

---

### 3. Define 3 Visual Directions

AI Image Director proposes 3 distinct style directions. Each must be meaningfully different — not just slight variations. Aim for tension between options so the client has a real choice.

For each direction:
```
## Direction [N]: [name — e.g., "Raw & Human" / "Clean & Minimal" / "Bold & Graphic"]

**Visual language:** [2-3 sentence description of the aesthetic]
**Mood:** [emotional register]
**References:** [3 real-world visual references — campaigns, photographers, brands]
**Why it works for this brand:** [1-2 sentences connecting to brand personality]
```

---

### 4. Write Prompt Pack Per Direction

For each direction, produce 4–6 ready-to-paste image prompts using the AI Image Director's 6-element anatomy. Label prompts by use case:

```
### [Direction name] — Prompt Pack

**Prompt 1 (Hero image — [platform]):**
[full prompt]

**Prompt 2 (Social post — [platform]):**
[full prompt]

**Prompt 3 (Product shot):**
[full prompt]

**Prompt 4 (Lifestyle):**
[full prompt]
```

All prompts in a direction must use the same core style tokens. This is what makes them a coherent direction.

---

### 5. Tool Recommendation

Specify the best tool for generating this direction's prompts and why.

---

## MCP Fallback

If Figma MCP is available, offer to create a moodboard frame in Figma with labeled placeholders for each prompt's output. The client can drop generated images directly into the frame.

---

## What's Next

- Client picks a direction → run `/gen-image [specific prompt from chosen direction]` to produce final assets
- Direction chosen → AI Prompt Engineer builds brand prompt library for the campaign
