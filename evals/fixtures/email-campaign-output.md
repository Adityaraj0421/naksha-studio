# /email-campaign — Lumina Onboarding Sequence

**Input:** `onboarding for Lumina — new trial users, activate and convert to paid`
**Goal:** Activation (connect data source) → conversion (upgrade to paid before trial ends)

---

## Campaign Brief

**Audience:** New trial users (free 14-day trial)
**Duration:** 14 days
**Goal:** 60% activation rate (data source connected), 20% trial → paid conversion
**Tone:** Helpful, direct — the knowledgeable colleague who sets you up for success

---

## Sequence Map

| # | Day | Email | Goal |
|---|-----|-------|------|
| 1 | 0 | Welcome + activate | Connect first data source |
| 2 | 2 | Quick win | Show first insight from their data |
| 3 | 5 | Feature spotlight | Introduce shared dashboards |
| 4 | 10 | Trial midpoint | Check in, surface unused features |
| 5 | 13 | Trial ending | Upgrade CTA, show value summary |

---

## Email 1 — Welcome (Day 0)

**Subject:** Your Lumina workspace is ready
**Preview:** Connect your first data source in 3 minutes.

**CTA:** Connect Data Source → `{{{connect_url}}}`

Key copy: "You're one connection away from your first live dashboard. Most teams are up in under 5 minutes."

---

## Email 2 — Quick Win (Day 2)

**Subject:** Here's what your data is already telling you
**Preview:** We found something interesting in your {{{source_name}}} data.

**CTA:** See Your Insight → `{{{insight_url}}}`

Key copy: Personalized — reference the specific data source they connected. Show one concrete insight.

---

## Email 3 — Feature Spotlight (Day 5)

**Subject:** Your team can see this too
**Preview:** Share dashboards with one link — no login required.

**CTA:** Share a Dashboard → `{{{share_url}}}`

Key copy: "Lumina dashboards work for everyone on your team — even people who never log in."

---

## Email 4 — Trial Midpoint (Day 10)

**Subject:** 4 days left — here's what you haven't tried yet
**Preview:** Most teams unlock 3x more value after these two steps.

**CTA:** Try Automated Reports → `{{{reports_url}}}`

Secondary CTA: Talk to a human → `{{{demo_url}}}`

---

## Email 5 — Trial Ending (Day 13)

**Subject:** Your trial ends tomorrow — keep everything you've built
**Preview:** Your dashboards, connections, and reports stay exactly as they are.

**CTA (primary):** Upgrade Now — Keep My Dashboards → `{{{upgrade_url}}}`
**CTA (secondary):** Start free, upgrade later → `{{{extend_url}}}`

---

## What's Next

- `/email-template welcome for Lumina` — build the full HTML for Email 1
- `/design-review` — audit templates for deliverability and accessibility
