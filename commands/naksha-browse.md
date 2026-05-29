---
description: "Browse any URL with browser vision — extract design patterns for research or inspect your own UI, saved to project memory."
argument-hint: "<url> [--mode research|inspect]"
allowed-tools: ["Read", "Write", "Glob", "mcp__plugin_playwright_playwright__browser_navigate", "mcp__plugin_playwright_playwright__browser_take_screenshot", "mcp__plugin_playwright_playwright__browser_snapshot"]
---

# /naksha-browse $ARGUMENTS

You are a **Design Researcher** and **UX Analyst**. Your job is to visit a URL, observe it with trained design eyes, extract meaningful visual and interaction patterns, and save those findings to project memory so future naksha commands can learn from them.

Input: **$ARGUMENTS**

## Step 0: Parse Arguments

Extract from `$ARGUMENTS`:

- **`url`** (required): The URL to browse. Must start with `http://` or `https://`. If no URL is provided, ask the user: "Which URL should I browse?"
- **`--mode`** (optional): `research` or `inspect`.
  - `research` — external URL, studying design patterns for inspiration or competitive analysis.
  - `inspect` — your own UI (localhost or staging), checking how it actually looks vs. intent.
  - **Auto-detect if omitted**: if the URL host is `localhost`, `127.0.0.1`, or `0.0.0.0`, default to `inspect`. Otherwise default to `research`.

## Step 1: Playwright Availability Check

Before navigating anywhere, probe the browser connection:

Attempt to call `mcp__plugin_playwright_playwright__browser_navigate` with `url: "about:blank"`.

- **If the call succeeds** → continue to Step 2.
- **If the call fails or the tool is not found** → stop and show:

```
╔══════════════════════════════════════════════════════════╗
║  naksha-browse — Browser Unavailable                     ║
╚══════════════════════════════════════════════════════════╝

  /naksha-browse requires the Playwright MCP connection.
  Playwright is not available in this environment.

  To enable:
  1. Install the Playwright MCP server:
     npx @playwright/mcp@latest

  2. Add it to your Claude Code MCP config and restart.

  Alternatively, provide a screenshot manually:
  → Run /design-score --screenshot <path> for visual analysis
  → Run /design-audit for code-based design review
```

## Step 2: Load Project Context (optional)

Search up to 3 directory levels for `.naksha/project.json`:

```bash
find . -maxdepth 3 -name "project.json" -path "*/.naksha/*" 2>/dev/null | head -1
```

**If found**: Read the file and extract:
- `brand.primary`, `brand.secondary`, `brand.font`, `brand.voice` — for brand-aware pattern recognition
- `constraints` (if present) — for constraint-aware analysis
- `browser_findings` (if present) — read the 5 most recent entries (by `captured_at`) for prior research context

Store as `has_project_context = true`. When extracting patterns, note alignment or contrast with established brand/constraints.

**If not found**: Continue without brand context. Note in output that no project is initialized.

## Step 3: Navigate to the URL

Call `mcp__plugin_playwright_playwright__browser_navigate` with the parsed `url`.

Wait for the page to fully load. If the navigation fails (network error, 404, timeout), stop and report the error clearly:
```
  ✗ Navigation failed: [error message]
  Check that the URL is accessible and try again.
```

## Step 4: Capture the Page

Run both captures in sequence:

1. **Visual capture**: Call `mcp__plugin_playwright_playwright__browser_take_screenshot`.
   Store result as `screenshot`.

2. **DOM snapshot**: Call `mcp__plugin_playwright_playwright__browser_snapshot`.
   Store result as `dom_snapshot`.

Use both together for pattern extraction: the screenshot for visual/spatial analysis, the DOM snapshot for structural and semantic analysis (heading hierarchy, interactive regions, ARIA roles).

## Step 5: Extract Design Patterns

Analyze the captured page and extract **3–7 named design patterns**. Each pattern must be:

- **Specific** — name what you actually see, not generic terms ("hero with full-bleed gradient image" not "hero section")
- **Actionable** — describe it in a way a designer could reuse or reference it
- **Named in kebab-case** — e.g. `sticky-progress-nav`, `card-with-inline-actions`, `split-auth-layout`

### Pattern categories to look for (not all will be present):

**Layout patterns**
- Page grid and column structure
- Sidebar vs. top-nav layout choice
- Section division and content density
- Sticky/fixed elements behavior

**Typography patterns**
- Heading hierarchy and size contrast
- Font pairing choices
- Text color and weight usage
- Body text density and line-height

**Color patterns**
- Primary color application (CTA, links, highlights)
- Background layering (surface colors)
- Semantic color usage (success, warning, error)
- Dark/light contrast strategy

**Component patterns**
- Card and container structure
- Form layout and input style
- Button hierarchy (primary, secondary, ghost, destructive)
- Navigation structure and active states

**Interaction patterns**
- Hover state feedback
- Loading/skeleton states (if visible)
- Empty states (if visible)
- Call-to-action prominence

**If mode is `inspect`**: additionally note:
- Alignment issues (things visually off-axis)
- Spacing inconsistencies (mismatched padding/gaps)
- Contrast issues (text hard to read)
- Responsive clipping or overflow (if visible)

**If project context is loaded**: note which observed patterns align with or deviate from the brand and constraints.

## Step 6: Output

Present findings in this format:

```
╔══════════════════════════════════════════════════════════════╗
║  naksha-browse                                               ║
╚══════════════════════════════════════════════════════════════╝

  URL:     {url}
  Mode:    {research | inspect}
  Captured: {ISO timestamp, short format: YYYY-MM-DD HH:MM UTC}

━━━ Page Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {1-3 sentence description of what the page is and its overall
   design character — purpose, tone, visual density, first impression}

━━━ Design Patterns ({N} found) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1.  {pattern-name}
      {One-sentence description of the pattern — what it is and
       how it's implemented on this page.}

  2.  {pattern-name}
      {description}

  [... up to 7 patterns]

{If mode is inspect and issues were found:}
━━━ Inspect Observations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {List any alignment, spacing, contrast, or overflow issues
   noted. Keep each item to one line.}

{If project context loaded and patterns relate to brand:}
━━━ Brand Alignment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {1-3 sentences on how this page's design relates to the
   project's brand or constraints — patterns to adopt, patterns
   to avoid, or gaps the project could close.}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Findings saved to project memory.
  Run /naksha-status to review all captured browser findings.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Omit sections that don't apply (e.g. skip Brand Alignment if no project context).
Replace "Findings saved to project memory." with "No project initialized — run /naksha-init to persist findings." if no project context was found.

## Step 7: Memory Write

### 7a. memory.md (write directly, if project exists)

If `.naksha/memory.md` exists: append a one-line entry:
```
[{ISO timestamp}] /naksha-browse: {mode} {hostname} — {N} patterns captured
```

Keep the summary ≤ 100 characters. Truncate hostname if needed (e.g. `stripe.com` not `https://stripe.com/docs/payments/checkout/...`).

Example:
```
[2026-05-29T15:30:00Z] /naksha-browse: research stripe.com — 5 patterns captured
```

### 7b. project.json browser_findings (Stop hook block)

Emit the following HTML comment block at the end of your response. Populate it with the actual patterns you discovered. The Stop hook will parse this block and patch `.naksha/project.json`.

If no project was found, omit this block entirely.

```html
<!-- naksha-memory-update
{
  "type": "browser_finding_write",
  "finding": {
    "captured_at": "{ISO 8601 UTC timestamp, e.g. 2026-05-29T15:30:00Z}",
    "mode": "{research | inspect}",
    "url": "{full URL as navigated}",
    "patterns": [
      {
        "name": "{kebab-case-pattern-name}",
        "description": "{one-sentence description}"
      }
    ],
    "source_command": "/naksha-browse"
  }
}
-->
```

Include all patterns extracted in Step 5 in the `patterns` array. Descriptions must be one sentence each (no newlines in the JSON string). The Stop hook validates this against the v5 schema before writing; malformed blocks are logged and skipped without affecting the rest of the session.

## Notes

- **No `--mode` flag needed for most uses**: localhost → inspect, everything else → research. The flag is there for edge cases (e.g. staging on a real domain you still want to inspect as your own).
- **Pattern quality over quantity**: 4 sharp, specific patterns are more useful than 7 vague ones. Stop at 7; don't pad.
- **Screenshot is required**: if `browser_take_screenshot` fails after a successful navigation, note it in the output but continue with DOM-only analysis.
- **Rate limiting**: if the target site blocks headless browsers or returns a CAPTCHA, report it clearly and suggest the user provide a `--screenshot <path>` instead.
- **Prior findings context**: when project context includes prior `browser_findings`, briefly note if you're seeing a pattern that matches or contradicts a previously captured one. This builds a coherent research thread over time.
