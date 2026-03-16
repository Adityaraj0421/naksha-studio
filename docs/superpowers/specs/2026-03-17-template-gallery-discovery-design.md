# Template Gallery Discovery — Design Spec (v3.17.0)

## Context

naksha-studio v3.16.0 — 23 roles, 46 commands, 12,545 knowledge lines.

The `/design-template` command already exists with 10 categories (landing-page, dashboard, pricing, auth, blog, ecommerce, portfolio, docs, saas, onboarding), full HTML/CSS generation, brand customization, and 5 style modifiers (minimal, bold, corporate, playful, dark-tech). The `skills/design/references/template-gallery.md` reference file holds the CSS component library and layout skeleton knowledge.

**The gap:** Users who know the command exists but don't know the category names have no discovery path. Calling `/design-template` with no arguments produces no useful output.

---

## Goal

Add a rich gallery mode to `/design-template` so that calling it with no arguments shows a formatted catalog of all 10 categories — each with name, section breakdown, best-for tags, and an example command.

---

## Scope

**In scope:**
- No-args gallery branch in `commands/design-template.md`
- 5 new discovery trigger keywords in `skills/design/SKILL.md`
- 2 new behavioral evals (ids 118–119)
- 1 new smoke fixture (`evals/fixtures/template-gallery-output.md`)
- v3.17.0 version bump across all 8 standard files
- Fix plugin.json description drift ("42 commands" → "46 commands")

**Out of scope:**
- New categories (not needed to close the discoverability gap)
- Community contribution system (no contributor pipeline yet — YAGNI)
- Pre-built static template library (fights the plugin's generative value proposition)
- New standalone `/template-list` command (C smarter no-args behavior closes the gap more elegantly)

---

## Section 1: Command Enhancement

### File: `commands/design-template.md`

Add a **no-args branch** at the top of the command routing logic. Triggered when the user invokes `/design-template` with no category argument, or uses a discovery phrase like "show me templates" or "what templates are available."

### Gallery Output Format

```
📐 Design Template Gallery — 10 categories available

landing-page    Hero section, feature grid, social proof, CTA
                Best for: SaaS launches, product pages, waitlists
                Sections: Hero · Features · Testimonials · Pricing · CTA
                Try: /design-template landing-page --style minimal

dashboard       KPI cards, data tables, charts, sidebar nav
                Best for: Admin tools, analytics, monitoring dashboards
                Sections: Sidebar · Header · KPI Cards · Chart Area · Table
                Try: /design-template dashboard --style dark-tech

pricing         Pricing tiers, feature comparison table, FAQ, CTA
                Best for: SaaS plans, subscription products
                Sections: Hero · Tiers · Feature Table · FAQ · CTA
                Try: /design-template pricing --style corporate

auth            Sign-in, sign-up, forgot password, OTP flows
                Best for: Login screens, onboarding entry points
                Sections: Form · Social Auth · Error States · Recovery Flow
                Try: /design-template auth --style minimal

blog            Article layout, category nav, author bio, related posts
                Best for: Content sites, documentation blogs, newsletters
                Sections: Header · Article · Sidebar · Author · Related
                Try: /design-template blog --style bold

ecommerce       Product grid, filters, product detail, cart, checkout
                Best for: Shops, marketplaces, product catalogs
                Sections: Grid · Filters · Product Card · Cart · Checkout
                Try: /design-template ecommerce --style playful

portfolio       Work grid, case study, about, contact
                Best for: Designer/developer portfolios, agency sites
                Sections: Hero · Work Grid · Case Study · About · Contact
                Try: /design-template portfolio --style minimal

docs            Navigation sidebar, content area, search, code blocks
                Best for: Developer docs, API references, knowledge bases
                Sections: Sidebar Nav · Content · Search · Code Block · Footer
                Try: /design-template docs --style corporate

saas            Feature showcase, demo CTA, integrations, testimonials
                Best for: B2B SaaS marketing pages, product-led growth
                Sections: Hero · Features · Integrations · Social Proof · CTA
                Try: /design-template saas --style bold

onboarding      Welcome screen, progress steps, empty state, success
                Best for: New user flows, setup wizards, activation sequences
                Sections: Welcome · Steps · Progress · Empty State · Success
                Try: /design-template onboarding --style minimal

─────────────────────────────────────────────────────────────────────
Usage:  /design-template <category>
        /design-template <category> --style minimal|bold|corporate|playful|dark-tech
        /design-template <category> brand="Name" colors="#hex1,#hex2"
```

### Routing logic (no-args path)

- If user message contains only `/design-template` with no further tokens → show gallery
- If user message contains discovery phrases ("show me templates", "what templates", "browse templates", "template list", "available templates") → show gallery
- All existing category-specified paths remain unchanged

---

## Section 2: skills/design/SKILL.md Routing + Evals/Smoke

### skills/design/SKILL.md — New trigger keywords

Add to the `/design-template` row:

| New keywords | Routes to |
|---|---|
| `browse templates`, `template list`, `what templates`, `show templates`, `available templates` | `/design-template` (no-args gallery path) |

These join the existing keywords (`template`, `landing-page`, `dashboard`, `pricing`, `auth`, `blog`, `ecommerce`, `portfolio`, `docs`, `saas`, `onboarding`).

### Behavioral Evals

**id 118 — `template-gallery-noargs`**
- Input: `/design-template` (bare, no arguments)
- Expected: Full gallery output showing all 10 categories, each with sections list, best-for tag, and Try: example command

**id 119 — `template-gallery-discovery-phrase`**
- Input: `"what templates are available in naksha?"`
- Expected: Routes to `/design-template` no-args path, outputs same rich gallery format

Total evals: 118 → 120 (current last id is 117; adding ids 118–119).

### Smoke Fixture

**File:** `evals/fixtures/template-gallery-output.md`

```bash
check_fixture "template-gallery" \
  "keywords: landing-page, dashboard, pricing, ecommerce, Try:" \
  "headers: 3" \
  "min_chars: 200"
```

Smoke coverage: 48 → 49 fixtures.

---

## Section 3: Version Bump

**Version:** `3.16.0` → `3.17.0`

**stats.json** (no count changes — existing command enhanced, not new):
```json
{
  "version": "3.17.0",
  "roles": 23,
  "commands": 46,
  "knowledge_lines": 12545,
  "reference_files": 29
}
```

**plugin.json** — two changes:
1. `"version": "3.17.0"`
2. Description drift fix: `"23 roles, 42 commands, 11,000+ lines"` → `"23 roles, 46 commands, 12,500+ lines"`

**8-file bump set:**
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `meta/stats.json`
- `CHANGELOG.md`
- `README.md`
- `docs/plugin-directory-submission.md`
- `docs/MCP-SETUP.md`
- `CONTRIBUTING.md`

**CHANGELOG entry:**
```markdown
## v3.17.0 (2026-03-17)
### Added
- Template Gallery: `/design-template` with no arguments now shows a rich
  catalog of all 10 categories — name, section breakdown, best-for tags,
  and example commands with style flags
- 5 new SKILL.md discovery keywords (`browse templates`, `template list`,
  `what templates`, `show templates`, `available templates`)
- 2 new behavioral evals (ids 118–119). Total: 120 evals
- 1 new smoke fixture (`template-gallery-output`). Total: 49 fixtures
### Fixed
- plugin.json description corrected from "42 commands, 11,000+ lines"
  to "46 commands, 12,500+ lines"
```

GitHub release `v3.17.0` tagged and published after bump commit.

---

## Implementation Checklist

- [ ] Enhance `commands/design-template.md` — add no-args gallery branch with 10 rich entries
- [ ] Update `skills/design/SKILL.md` — add 5 discovery keywords to `/design-template` row
- [ ] Create `evals/fixtures/template-gallery-output.md` — smoke fixture
- [ ] Update `evals/evals.json` — add ids 118–119
- [ ] Update `scripts/behavioral-smoke.sh` — add `check_fixture` call for template-gallery
- [ ] Bump all 8 files to v3.17.0 (include plugin.json description fix)
- [ ] Commit, tag `v3.17.0`, push, create GitHub release
