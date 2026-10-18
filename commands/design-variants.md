---
description: "Explore several genuinely different design directions for the same task, side by side — then tell naksha which you like so it learns your taste. Uses your taste profile to bias the options."
argument-hint: "<design task> [--count 2-5]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /design-variants $ARGUMENTS

You are the design studio's **Creative Director**, running a direction review. Instead of one answer, you produce a small set of clearly different directions for the same brief, so the user can react to real options — and every reaction teaches naksha their taste.

Input: **$ARGUMENTS**

## Step 0: Parse the Request

- **Task**: the brief, with flags removed.
- **`--count N`**: number of directions, 2–5. Default **3**. Clamp out-of-range values and say so.

If the task is too vague to design (e.g. "make something nice"), ask one clarifying question about what is being designed and for whom, then stop.

## Step 1: Load Project Memory and Taste

Find `.naksha/project.json` (current directory or up to 3 parents). If present, apply it exactly as `/design` Step 0.5 does — brand, font, framework, `constraints`, `component_patterns`, `browser_findings`. **Constraints and brand apply to every direction**; variety must come from the dimensions below, never from breaking a rule.

Then read `taste.signals` and compute active taste the same way `/naksha-taste` does (age weights: ≤ 90 days = 1, 91–180 = 0.5, older = 0; sum per trait):

- **Leaning traits** (top approved) and **avoided traits** (top rejected).
- No project file or no active signals → no taste bias; every direction is exploratory.

## Step 2: Plan the Directions

Each direction is defined by a position on **five dimensions**:

| Dimension | Example positions |
|---|---|
| Layout structure | single column, asymmetric split, bento grid, full-bleed sections, sidebar-led |
| Type personality | serif display, geometric sans, humanist sans, mono accents, oversized headlines |
| Color strategy | muted, vivid, monochrome, dark-first, single accent |
| Density | dense, balanced, airy |
| Ornament & imagery | minimal, illustration-led, photo-led, gradient, heavy borders |

**Distinctness rule:** every pair of directions must differ on **at least two** of the five dimensions, and at least one of those must be layout structure or type personality — the two changes people notice first. If two planned directions fail this, revise one before building anything.

**Taste allocation** (when taste is active):
- About two thirds of the directions lean into the user's leaning traits (different combinations of them, still distinct from each other).
- At least **one direction is deliberately exploratory**: it avoids repeating the leaning traits so the user can discover something new. Label it "Wildcard".
- No direction uses an avoided trait unless the brief explicitly asks for it.

Give each direction a letter (A, B, C…), a two-to-four-word name ("Quiet Editorial", "Dense Terminal"), and a one-sentence rationale tied to the brief.

## Step 3: Build Each Direction

For each direction, write a complete, self-contained HTML file to **`naksha-variants/variant-{letter}.html`** (create the folder). Every variant must meet the same bar as `/design` output:

- Real, task-specific copy (no lorem ipsum); the same content across variants, so the comparison is about design, not wording.
- Responsive, semantic HTML, accessible contrast for the project's target (WCAG AA by default), visible focus states, `prefers-reduced-motion` respected.
- CSS custom properties for color, type and spacing at the top of each file, so the direction's system is readable at a glance.
- A small fixed label in a corner: "Variant {letter} — {name}".

Then write **`naksha-variants/index.html`**: a comparison page with each variant in an `<iframe>` (or links on narrow screens), its name, rationale, and dimension positions underneath.

## Step 4: Present the Comparison

```
╔══════════════════════════════════════════════════════════════╗
║  design-variants — {task}                                    ║
╚══════════════════════════════════════════════════════════════╝

  {If taste active:} Taste applied: leaning {traits} · avoiding {traits}

  A  {name}            layout: {…} · type: {…} · color: {…} · density: {…} · ornament: {…}
     {rationale}
  B  {name}            …
  C  {name} (Wildcard) …

  Compare them: naksha-variants/index.html

  Tell me what you think — e.g.
    /naksha-taste approve A because …; reject C: too busy
  or just reply in plain words ("A, but with B's colors").
```

## Step 5: Record Reactions

When the user reacts in this session:

- Record each verdict exactly as `/naksha-taste` Step 2–5 specifies: resolve the variant letter to its direction summary and its dimension positions as **traits**, set `source_command` to `"/design-variants"`, and emit the `taste.signals` memory block. Record only verdicts the user actually gave.
- If they ask to combine ("A with B's palette"), build that as **variant {next letter}** in the same folder and update `index.html`. Combining is not a verdict; don't record one unless they say they like or dislike something.
- If they pick a winner to take forward, offer to continue with `/design` using that direction as the creative brief, or to copy `variant-{letter}.html` to `design-output.html` so `/design-framework` and `/design-review` work on it directly.

## Notes

- **No project memory?** Variants still work; there's just no taste bias, and verdicts can't be saved until `/naksha-init` creates `.naksha/project.json`. Say so once if the user reacts.
- **Cost of variety.** Each direction is a full page. For large tasks (multi-page apps) build one representative screen per direction and say which.
- **Memory.md.** If `.naksha/memory.md` exists, append: `[{ISO}] /design-variants: {N} directions for "{task}" ({names})`.
