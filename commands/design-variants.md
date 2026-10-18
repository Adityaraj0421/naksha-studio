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
- Also read `taste.observations` (learned from Helpful / Needs-work votes): a trait with `helpful > needs_work` and `confidence ≥ 0.5` joins the leaning traits; `needs_work > helpful` with `confidence ≥ 0.5` joins the avoided traits. Where an observation and a recent signal disagree, the newer evidence wins (compare the observation's `updated_at` with the signal's `recorded_at`).
- No project file, or no active signals or confident observations → no taste bias; every direction is exploratory.

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
- In `<head>`: `<title>Variant {letter} — {name}</title>` and `<meta name="naksha-traits" content="{trait}, {trait}, …">` — the direction's 2–6 traits from the `/naksha-taste` vocabulary (its dimension positions), so votes on the file can teach taste.

Then write **`naksha-variants/index.html`**: a comparison page with each variant in an `<iframe>` (or links on narrow screens), its name, rationale, and dimension positions underneath.

Finally write **`naksha-variants/variants.json`**, the machine-readable manifest that `/naksha-vote` and the dashboard Votes panel read to know what each variant is:

```json
{
  "run_id": "vr-20261018T115000Z",
  "task": "pricing page for a B2B analytics SaaS",
  "created_at": "2026-10-18T11:50:00Z",
  "variants": [
    {
      "letter": "A",
      "name": "Quiet Editorial",
      "file": "variant-a.html",
      "rationale": "Calm, type-led page that lets the tiers breathe",
      "traits": ["editorial", "serif display", "airy layout", "muted palette"],
      "dimensions": { "layout": "single column", "type": "serif display", "color": "muted", "density": "airy", "ornament": "minimal" },
      "wildcard": false
    }
  ]
}
```

`run_id` is `vr-` plus the UTC time (`date -u +"vr-%Y%m%dT%H%M%SZ"`); a new run gets a new id, so votes on yesterday's "B" never merge with today's. When you add a combined variant in Step 5, append it to `variants` and keep the same `run_id`.

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
    /naksha-vote helpful A because …   (or use the Votes panel in the dashboard)
  or just reply in plain words ("A, but with B's colors").
```

## Step 5: Record Reactions

When the user reacts in this session:

- **Record each verdict as a vote first**, so it lands in `.naksha/votes.jsonl` with the variant it was about (this works even without `.naksha/project.json`):

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/votes.js append <helpful|needs-work> --kind variant \
    --ref "{letter}@{run_id}" --traits "{trait, trait, …}" --command /design-variants \
    [--reason "{the user's reason}"] --source command --json
  ```

  Approve / like / keep → `helpful`; reject / dislike / drop → `needs-work`. Note the returned `vote.id`. Votes stay on this machine; nothing is sent anywhere.
- **Then record the taste signal** exactly as `/naksha-taste` Step 2–5 specifies: resolve the variant letter to its direction summary and its dimension positions as **traits**, set `source_command` to `"/design-variants"`, add `"vote_id": "{vote.id}"` so consolidation counts the reaction once, and emit the `taste.signals` memory block. Record only verdicts the user actually gave.
- After recording, mention that `/naksha-taste consolidate` (in a later turn) folds these votes into the learned taste observations.
- If they ask to combine ("A with B's palette"), build that as **variant {next letter}** in the same folder and update `index.html`. Combining is not a verdict; don't record one unless they say they like or dislike something.
- If they pick a winner to take forward, offer to continue with `/design` using that direction as the creative brief, or to copy `variant-{letter}.html` to `design-output.html` so `/design-framework` and `/design-review` work on it directly.

## Notes

- **No project memory?** Variants still work; there's just no taste bias, and taste signals can't be saved until `/naksha-init` creates `.naksha/project.json` (votes are still recorded in `.naksha/votes.jsonl`). Say so once if the user reacts.
- **Cost of variety.** Each direction is a full page. For large tasks (multi-page apps) build one representative screen per direction and say which.
- **Memory.md.** If `.naksha/memory.md` exists, append: `[{ISO}] /design-variants: {N} directions for "{task}" ({names})`.
