# DESIGN.md in Naksha

Naksha reads and writes **DESIGN.md**, an open format in which one markdown file holds a design system. YAML design tokens give exact values, and `##` prose sections explain how to use them. Many agent tools can read DESIGN.md. Naksha uses it for two things:

- **Interop.** `/design-system` can import a DESIGN.md as its token source and export what it generates as DESIGN.md or W3C DTCG tokens. `/design-md` lints, converts, and edits these files.
- **Project memory.** A project's design system is saved as `.naksha/design-system/MASTER.md`. Individual pages can override it with files in `.naksha/design-system/pages/<page>.md`, and `/design` loads both automatically.

Everything runs through `scripts/design-md.js`, a zero-dependency Node script.

## Versions implemented

| Format | Version | Source checked |
|---|---|---|
| DESIGN.md | `alpha` (CLI `@google/design.md` 0.4.0) | [google-labs-code/design.md](https://github.com/google-labs-code/design.md) `docs/spec.md` at commit `6e5da53` (2026-10-16) |
| DTCG Format Module | `2025.10` | [design-tokens/community-group](https://github.com/design-tokens/community-group) `technical-reports/format` + `technical-reports/color` at commit `882ebd6` (2026-09-08) |

Both specs were read from their source repositories. The published sites (`designtokens.org`) could not be reached from the build environment, so the TR text in the repository is the reference. DESIGN.md's status is still `alpha`. If the format changes, check the token schema and section list in `docs/spec.md` against the tables below.

## CLI

```bash
node scripts/design-md.js parse   DESIGN.md [--resolve]                 # normalized tokens JSON
node scripts/design-md.js lint    DESIGN.md [--json] [--strict] [--level AA|AAA] [--verbose]
node scripts/design-md.js export  --to dtcg|css|tailwind|tailwind-v3 DESIGN.md [--prefix ds]
node scripts/design-md.js from-tokens tokens.json|tokens.css [--from dtcg|css|json] [--name "Acme"]
node scripts/design-md.js resolve [--dir .naksha/design-system] [--page checkout] [--format json|md] [--no-brand]
```

- `parse`, `lint` and `export` take a file, `-` for stdin, or `--page <name>` / `--dir <dir>` to work on the merged MASTER.md + page system.
- Every command accepts `--out <file>`.
- **Exit codes:** `0` success · `1` invalid document, lint errors, or a failed conversion · `2` usage error or unreadable input.
- `lint` exits `1` on errors. Add `--strict` to fail on warnings too. Text output hides info findings unless `--verbose` is set. `--json` includes everything.

`parse` prints the merged token tree using the spec's own keys (`version`, `name`, `description`, `omitted`, `colors`, `typography`, `rounded`, `spacing`, `components`, plus any extension keys). It also prints `sections` (each `##` heading with its canonical name and line), and with `--resolve`, every colour resolved to `{ hex, alpha }`.

## What the parser accepts

**Markdown layer.** Tokens are read from YAML front matter, which must start on line 1 with `---` and end at the next `---` line, and from every fenced code block tagged `yaml` or `yml`. Fences follow CommonMark rules, so a ```` ```yaml ```` example nested inside a longer ```` ```` ```` fence is documentation, not tokens. Headings inside fences are ignored. Sections are the `##` headings. ATX headings only: setext (`===`/`---` underline) headings are not recognized. A top-level key that appears in two blocks is a hard error, as the spec requires.

**YAML subset.** A small hand-written parser covers what DESIGN.md files use:

| Supported | Not supported (rejected with a line number) |
|---|---|
| Block mappings and sequences, space-indented | Tabs for indentation |
| Plain, `'single'` and `"double"` quoted scalars (JSON-style escapes) | Anchors `&`, aliases `*`, tags `!`, directives `%` |
| `\|` and `>` block scalars with `-`/`+` chomping | Multi-line plain (unquoted) scalars |
| Flow collections of scalars: `[a, b]`, `{a: 1}` | Nested flow collections, complex `? ` keys |
| Comments, `null`/`~`, `true`/`false`, decimal numbers (YAML 1.2 core) | Multiple documents in one block; hex/octal/`.inf` numbers (kept as strings) |

It follows YAML 1.2, so `yes`/`no` stay strings and `1e3` is a number. Two common mistakes get dedicated findings instead of silently wrong values:

- An unquoted hex colour (`primary: #1A1C1E`) is a YAML comment, so the value is lost. This is reported as an `unquoted-hex` **error**.
- An unquoted reference (`textColor: {colors.primary}`) is a flow mapping to a standard YAML parser. Naksha reads it as a reference but reports `unquoted-ref` so the file stays portable.

Nested groups inside `colors`, `rounded` and `spacing` flatten to dotted names (`background: {light: …}` → `background.light`, referenced as `{colors.background.light}`). Keys that already contain dots, like `"1.5"`, keep them.

**Colours.** Hex (3/4/6/8 digits), the 148 CSS named colours, `transparent`, `rgb[a]()`, `hsl[a]()`, `hwb()`, `lab()`, `lch()`, `oklab()` and `oklch()` are converted to sRGB for contrast checks and DTCG export. The conversion uses CSS Color 4 maths with D50→D65 Bradford adaptation for Lab/LCH, and out-of-gamut values are clipped rather than gamut-mapped. `color-mix()` and `color()` are accepted as valid but can't be evaluated, so they are skipped in contrast checks and DTCG export (reported as info).

## Lint rules

| Rule | Severity | Checks |
|---|---|---|
| `no-tokens` | error | No front matter or yaml block |
| `unquoted-hex` | error | `#hex` swallowed as a YAML comment |
| `invalid-color` | error | Colour token or component colour isn't a CSS colour |
| `invalid-dimension` | error / warning | Typography `fontSize`/`letterSpacing` not px/em/rem, or `lineHeight` neither a number nor a dimension (errors). Rounded values and component dimensions that aren't px/em/rem (warnings) |
| `invalid-font-weight` | error | `fontWeight` outside 1–1000 (bare or quoted numbers both accepted) |
| `broken-ref` | error | `{path}` doesn't resolve, is circular, or points at a composite outside `components` |
| `duplicate-section` / `duplicate-token` | error | Repeated `##` section (aliases count, e.g. Layout + Layout & Spacing) or a token defined twice through nesting |
| `contrast-ratio` | **error** for component pairs, warning for naming pairs or translucent colours | WCAG 2 contrast below AA (4.5:1, or 3:1 for large text). `--level AAA` uses 7:1 and 4.5:1 |
| `unknown-key` | warning | Top-level key within edit distance 2 of a schema key (`colours`) |
| `unquoted-ref` | warning | Reference written without quotes |
| `unknown-typography-property` / `unknown-component-property` | warning | Property outside the spec's list (kept as-is) |
| `missing-primary`, `missing-typography`, `missing-name` | warning | Spec-required pieces absent |
| `section-order` | warning | Known sections out of canonical order |
| `omitted-rules` | warning / info | `omitted:` names an unknown section, or one that defines tokens anyway |
| `missing-sections`, `orphaned-tokens`, `non-dimension-spacing`, `unverified-color`, `contrast-unverified`, `spec-version`, `extension-key` | info | Coverage and housekeeping |

**Contrast pairs.** Naksha checks two kinds of pair:

- Each component's `textColor` against its `backgroundColor`, after resolving references.
- The colour-naming conventions `on-X` on `X` and `X-foreground` on `X`.

Text counts as large when the component's `typography` resolves to at least 24px, or at least 18.66px at weight 700 or more (`rem` is taken as 16px). A translucent background is composited over both white and black and the worse ratio is reported. Because the real backdrop is unknown, the finding is a warning. A fully transparent background is skipped as unverifiable. Luminance follows the WCAG 2 relative-luminance formula.

**Differences from the reference CLI.** The `@google/design.md` linter reports low contrast as a warning. Naksha makes a component pair an error because accessibility is a release gate here. It also adds the large-text threshold, the AAA level, the translucency handling, and the `unquoted-*` checks.

## Export mappings

**DTCG (`--to dtcg`).** The output has `$schema: https://www.designtokens.org/schemas/2025.10/format.json` and keeps DESIGN.md's group names (`colors`, `rounded`, `spacing`, `typography`, `components`). Because the names match, a DESIGN.md reference such as `{colors.primary}` is already a valid DTCG alias.

| DESIGN.md | DTCG |
|---|---|
| Colour | `$type: color`, `{ colorSpace: "srgb", components: [r,g,b], alpha?, hex }`. Any source that isn't plain hex (oklch, rgba…) is kept in `$extensions["naksha.design-md"].css` |
| Rounded / spacing dimension | `$type: dimension`, `{ value, unit }`. DTCG allows only `px`/`rem`, so `em` exports as rem and a note is printed |
| Unitless spacing | `$type: number` |
| Typography | `$type: typography`. `fontFamily` stacks become arrays, `em` letter-spacing becomes px/rem using the font size, and a dimension `lineHeight` becomes a multiplier (DTCG requires a number). `fontFeature`/`fontVariation` have no DTCG field. DTCG requires all five fields, so missing ones are filled with CSS defaults (`sans-serif`, 16px, 400, 0px, 1.2) and listed in `$extensions[…].defaulted`. Whenever a conversion is lossy, the original token is kept in `$extensions` |
| Component property | Alias token (`{colors.primary}`), or a typed colour/dimension token. Values with no DTCG type, like `padding: 0 24px` or unknown properties, go in the group's `$extensions[…].unmapped` |
| `{typography.h1.fontSize}` | JSON Pointer alias `{ "$ref": "#/typography/h1/$value/fontSize" }`, because curly aliases can't reach inside composites |
| Dotted name `a.b` | Nested groups (DTCG forbids `.` in names). A name that is both a token and a group uses `$root`. Dotted typography or component names are skipped with a note |
| Value DTCG can't hold (`color-mix()`, non-dimension spacing) and aliases to it | Kept in the group's `$extensions[…].unmapped`, so the output never contains a dangling alias |

`from-tokens` reads the `$extensions` back, so DESIGN.md → DTCG → DESIGN.md keeps every token. The test suite checks this. The only normalizations are lowercase hex and numeric strings turned into numbers.

**CSS (`--to css`).** A `:root` block of `--color-*`, `--rounded-*`, `--spacing-*` and `--typography-<name>-<property>` variables, with component variables `--<component>-<property>`. References become `var(--…)`. A component's `typography` reference expands into one variable per font property. Multi-word font families are quoted. `--prefix ds` namespaces everything (`--ds-color-primary`).

**Tailwind (`--to tailwind`).** A Tailwind v4 `@theme` block (`--color-*`, `--font-*`, `--text-*` with `--text-*--line-height`/`--letter-spacing`/`--font-weight`, `--radius-*`, `--spacing-*`), followed by component variables in `:root`. `rounded.DEFAULT` maps to `--radius`. Unitless spacing is skipped. `--to tailwind-v3` emits a `{ theme: { extend } }` JSON object with references resolved to literal values.

## Importing tokens (`from-tokens`)

- **DTCG JSON.** The token type decides the group. Colour → `colors`. Typography → `typography`. Dimension → `rounded` if the path mentions radius/rounded/corner, otherwise `spacing`. Groups that already use DESIGN.md's names map one-to-one. In generic files, a leading type-ish group (`color`, `space`, `radius`…) is dropped and the rest of the path is joined with `-` (`color.brand.500` → `colors.brand-500`). Curly aliases and `$ref` JSON Pointers (token-level or inside a composite) are rewritten to the new paths, and an alias without `$type` takes its target's type. Types with no DESIGN.md group (shadow, duration, cubicBezier, border, transition, gradient, strokeStyle) are skipped and reported. Colours in other spaces (oklch, hsl…) become the matching CSS function.
- **CSS custom properties.** Only declarations in a top-level `:root`/`html` rule are imported. Overrides inside `@media` blocks or other selectors, such as dark mode, are counted and reported, because DESIGN.md has no modes. Classification is a heuristic, applied in this order:
  1. Component-shaped names (`--btn-primary-bg`, `--card-radius`; `-padding-x`/`-y` merge into one `padding`).
  2. Radius names.
  3. Any value that parses as a colour.
  4. Spacing names.
  5. Type names (`--text-*`, `--font-*`, `--font-weight-*`, `--leading-*`, `--tracking-*`, merged per suffix into typography tokens).

  `var()` references to tokens in the same group become `{group.name}` references. Shadows go into the generated *Elevation & Depth* prose, and anything else unmapped is listed under *Additional tokens*.
- If the source has no `primary` colour, an alias to the likeliest brand colour is added (`brand`, `interactive-primary`, `brand-600`, …) and reported, so the result is valid.
- The generated prose is a scaffold, marked with an HTML comment. Replace it with real rationale.

## MASTER.md and page overrides

```
.naksha/
├── project.json                 # brand defaults: brand.primary, brand.secondary, brand.font
└── design-system/
    ├── MASTER.md                # the project's design system — a complete, valid DESIGN.md
    └── pages/
        ├── checkout.md          # partial DESIGN.md: only what this page changes
        └── dashboard.md
```

**Precedence: page override > MASTER.md > brand defaults.**

- A page override can add tokens, replace them, or remove them with `null`.
- `typography` and `components` entries merge one property at a time. For example, a page can change only `components.button-primary.padding`.
- Brand defaults only fill gaps (`colors.primary`/`secondary` from `project.json`).
- In `resolve --format md`, prose sections in the page file replace the master's section with the same heading, and new sections are appended.
- `resolve` reports a `provenance` map (`page`, `page+master`, `master`, `brand`) for every token.

Keep MASTER.md valid on its own. Other tools read it without Naksha's brand-default tier, so a reference that only resolves through `project.json` is a `broken-ref` there. `lint --page <name>` lints the merged system, which catches a page override that breaks contrast against master colours.

Example override:

```markdown
---
colors:
  accent: "#0F766E"
components:
  button-primary:
    padding: 16px
  promo-badge: null
---

## Components

Checkout swaps the copper accent for teal and drops promotional badges to keep the payment step calm.
```

`/design` runs `resolve --page <slug> --format md` in Step 0.6 when MASTER.md exists. `/design-system` writes MASTER.md after generating or importing a system. `/design-md page <name>` creates overrides.

## Limits and known gaps

- DESIGN.md has no dark mode or other modes. Describe mode variants in prose or keep them in a page override. CSS import skips mode blocks.
- Elevation, shadows, motion and breakpoints have no token group in the `alpha` schema. They live in prose, or as extension keys that are preserved but not validated.
- `diff` (from the reference CLI) is not implemented. Compare `parse` output instead.
- Gamut mapping is a simple clip, so the sRGB fallbacks of wide-gamut colours may differ slightly from a browser's rendering. The original value is preserved.
- Do not ship DESIGN.md files extracted from real brands as a project's own system. The fixtures in `scripts/test/fixtures/design-md/` are invented systems.
