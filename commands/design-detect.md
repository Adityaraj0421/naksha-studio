---
description: "Free, deterministic design lint: runs naksha's no-LLM rule engine on files (or your git changes) and explains every finding by role with concrete fixes."
argument-hint: "[files...] [--rules id,id] [--fix] [--staged]"
allowed-tools: ["Read", "Edit", "Glob", "Grep", "Bash"]
---

# /design-detect

Run naksha's deterministic design linter, then have the right specialists explain what it found and how to fix it. The linter itself is free: no network, no model calls, same result every run. It is the cheap first pass before `/design-score` or `/design-review`, which add judgment the rules cannot.

Roles involved: **UX Researcher** (accessibility), **UI Designer** (type, layout), **Design System Lead** (tokens, spacing), **Motion Designer** (reduced motion), **Content Designer** (copy, emoji), **Framework Specialist** (markup structure), **Creative Director** (generic "AI template" clichés).

## Input

| Argument | Meaning |
|----------|---------|
| `files...` | Files to lint. Supported: `.html`, `.css`, `.scss`, `.jsx`, `.tsx`, `.vue`, `.svelte`. |
| *(none)* | Lint the files changed in git (unstaged + staged + untracked). Outside a git repository, lint every UI file in the folder. |
| `--staged` | Only staged changes. |
| `--rules a,b` | Run only these rule ids (see the table below). |
| `--fix` | After the report, apply the mechanical fixes you proposed (with confirmation). |

## Process

### Step 1: Resolve the file list

If file arguments were given, use them. Otherwise, first check that the folder is a git repository:

```bash
git rev-parse --is-inside-work-tree
```

If that fails (not a git repository, or git is not installed), say **"This folder is not a git repository, so there are no changes to diff; linting every HTML/CSS/component file instead."** Then go to Step 2 and run the linter with no file arguments: it scans `src/`, `public/`, `dist/` and the folder itself, and honors `ignorePatterns` in `.design-lint.json`. `--staged` needs git: if it was given, say so and stop.

In a git repository, collect the changed files:

```bash
{ git diff --name-only --diff-filter=ACMRT; git diff --name-only --cached --diff-filter=ACMRT; git ls-files --others --exclude-standard; } 2>/dev/null \
  | grep -Ei '\.(html?|css|scss|jsx|tsx|vue|svelte)$' | sort -u
```

With `--staged`, use only `git diff --name-only --cached --diff-filter=ACMRT`.

If the list is empty, say **"Nothing to lint: no changed HTML/CSS/component files."** and stop. Do not report a score. (Only say this after `git rev-parse` succeeded; otherwise use the fallback above.)

### Step 2: Run the linter

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/design-lint.js" --json [--rules a,b] -- <files>
```

(Outside git, leave out `-- <files>`.)

`--json` prints the report on stdout and writes no files. Exit code `0` means no errors, `1` means errors (or a score below `failThreshold`), `2` means bad usage: if you get `2`, show the stderr message and fix the arguments.

The report has `status` (`clean`, `issues` or `nothing-to-lint`), `score` (0–100, `null` when nothing was linted), `settings.grid`, `settings.contrastMin`, `skipped[]` and `issues[]`. Each issue has `rule`, `severity`, `role`, `category`, `file`, `line`, `lines`, `message` and `fix`.

If `status` is `nothing-to-lint`, list `skipped[]` with reasons (ignored by `.design-lint.json`, unsupported type) and stop.

### Step 3: Load project context

Check for `.naksha/project.json` (up to 3 directory levels). The linter already applied `constraints.grid`, `constraints.min_contrast_ratio`, `constraints.accessibility_target` and the brand colors. Mention which values were in effect (from `settings`) so the user knows why a value was flagged. If `brand.primary` exists, use it when suggesting color fixes.

### Step 4: Explain findings by role

Group issues by their `role` field. For each role that has findings, read the matching reference before writing that section, and focus on the named topic:

| Role | Reference | Read for |
|------|-----------|----------|
| UX Researcher | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ux-researcher.md` | WCAG AA checklist, focus, labels |
| UI Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` | Typography scale, layout |
| Design System Lead | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/design-system-lead.md` | Token naming, spacing scale |
| Motion Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/motion-designer.md` | Reduced motion |
| Content Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/content-designer.md` | Voice, specificity |
| Framework Specialist | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/framework-specialist.md` | Semantic markup in the detected framework |
| Creative Director | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` | Brand-led visual direction |

Order sections by impact: roles with errors first, then warnings. Inside a section, for every issue:

1. **What**: the rule id, file and line(s), and the linter's message in plain words.
2. **Why it matters**: one sentence from that role's point of view (who is harmed or what breaks).
3. **Fix**: open the file at the reported lines and propose a concrete before/after snippet. Use the project's existing tokens when they exist (for `hardcoded-color` the message names the matching `var(--…)`; for `contrast-aa` it suggests a passing color). Do not invent tokens the project does not have; say "add a token" instead.

Treat the `slop-*` rules as taste warnings, not defects: explain what makes the pattern generic and offer a brand-led alternative.

### Step 5: Apply fixes (only with `--fix`)

List the fixes you will make and ask for confirmation. Apply only mechanical, low-risk ones (alt text placeholders the user must review, `lang`, viewport meta, `:focus-visible` styles, token substitutions with an exact match, grid rounding, a reduced-motion block). Never rewrite copy or change brand colors without the user choosing the replacement. Re-run Step 2 afterwards and show the before/after counts.

## Rules

| Rule | Severity | Role | Checks |
|------|----------|------|--------|
| `html-lang` | error | UX Researcher | `<html>` has a `lang` |
| `img-alt` | error | UX Researcher | every `<img>` has `alt` (empty is fine for decoration) |
| `clickable-div` | error | UX Researcher | no `div`/`span` click handlers without role + tabindex |
| `contrast-aa` | error | UX Researcher | text/background pairs in one CSS block meet 4.5:1 (3:1 large text) |
| `focus-visible` | error | UX Researcher | focus outline is never removed without a `:focus-visible` replacement |
| `viewport-meta` | error | Framework Specialist | HTML pages declare a viewport |
| `input-label` | warning | UX Researcher | form fields have a label or aria name |
| `hover-without-focus` | warning | UX Researcher | interactive `:hover` styles have a focus twin |
| `semantic-html` | warning | Framework Specialist | pages use landmarks, not only divs |
| `inline-styles` | warning | Framework Specialist | no heavy inline styles |
| `reduced-motion` | warning | Motion Designer | animations respect `prefers-reduced-motion` |
| `spacing-grid` | warning | Design System Lead | margin/padding/gap on the project grid (default 4px) |
| `hardcoded-color` | warning | Design System Lead | no raw colors when color tokens exist |
| `type-scale` | warning | UI Designer | no near-duplicate or fractional font sizes |
| `type-count` | warning | UI Designer | at most 8 distinct font sizes per file |
| `fixed-width` | warning | UI Designer | no wide fixed pixel widths |
| `media-queries` | warning | UI Designer | large stylesheets have breakpoints |
| `slop-gradient-hero` | warning | Creative Director | stock blue-to-purple gradients |
| `slop-glassmorphism` | warning | Creative Director | backdrop blur on 3+ surfaces |
| `slop-gradient-text` | warning | Creative Director | gradient-filled text |
| `slop-emoji-bullets` | warning | Content Designer | emoji as bullets or heading icons |
| `slop-generic-copy` | warning | Content Designer | stock superlatives in headings and buttons |

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/design-lint.js" --list-rules` for the live list.

## Output

~~~markdown
## Design Detect: {N} file(s) · {errors} errors · {warnings} warnings · score {score}/100
Grid {grid}px · contrast floor {contrastMin}:1 · source: {project memory | defaults}

### UX Researcher (accessibility)
**contrast-aa** · `src/pricing.css:42`
.badge text #9a9a9a on #ffffff is 2.8:1, needs 4.5:1. Low-vision users cannot read the plan name.
```css
/* before */ .badge { color: #9a9a9a; }
/* after  */ .badge { color: var(--color-text-muted); } /* #6b6b6b, 5.3:1 */
```

### Design System Lead (tokens)
…

### Next steps
- Fix the {errors} errors first; they fail CI (`design-check` workflow).
- For judgment the rules cannot make (hierarchy, flow, brand fit), run `/design-review` or `/design-score`.
~~~

When there are no issues, say so in one line with the file count and the settings used. Do not pad the report.

## Notes

- **Free tier**: the linter is deterministic. Do not "re-check" its findings by eye; explain and fix them. If a finding is a false positive, say why and suggest a per-rule override in `.design-lint.json` (`"rules": { "rule-id": "off" }`).
- **Scope of contrast**: only color pairs declared in the same CSS block are checked, since inheritance needs a rendered DOM. Suggest `/accessibility-audit` with a browser for full coverage.
- **Configuration**: `.design-lint.json` supports `failThreshold`, `grid`, `contrastMin`, `maxFontSizes`, `typeScale`, `ignorePatterns`, group toggles (`checkContrast`, `checkSlop`, …) and per-rule `rules` overrides.
- **Hook**: the same linter runs after every Write/Edit of a UI file and prints a one-line summary. Set `NAKSHA_LINT_HOOK=off` or `"hook": false` in `.design-lint.json` to silence it.
- **CI**: `.github/workflows/design-check.yml` runs it on changed files and posts the score as a PR comment.
