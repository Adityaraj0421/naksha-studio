# /design-review — Lumina Landing Page Audit

**Target:** `lumina-landing.html` (SaaS analytics dashboard landing page)

---

## Visual Design Review

Screenshot captured at 1280px desktop width.

### Scores

| Principle | Score | Grade |
|-----------|-------|-------|
| Visual Hierarchy | 8/10 | B |
| Alignment & Grid | 9/10 | A |
| Color & Contrast | 8/10 | B |
| Typography | 9/10 | A |
| Proximity & Grouping | 7/10 | C |
| Balance & Composition | 8/10 | B |
| **Overall Visual** | **8.2/10** | **B** |

---

## Accessibility Audit

Checks performed using WCAG 2.1 AA standard.

**Passed:**
- Body text (#111827 on #FFFFFF): contrast ratio 14.7:1 ✅
- CTA button text (white on #3B82F6): contrast ratio 4.7:1 ✅
- Nav links (#374151 on #FFFFFF): contrast ratio 10.2:1 ✅
- All interactive elements have visible focus rings ✅
- Semantic headings: proper h1→h2→h3 nesting ✅
- All images have alt text ✅

**Issues:**
- Footer secondary text (#9CA3AF on #F9FAFB): contrast ratio 2.9:1 ❌ — fails WCAG AA for normal text. Recommendation: darken to `#6B7280` (4.5:1).
- Pricing "Most Popular" badge (white on #60A5FA): contrast ratio 3.0:1 ❌ — fails for normal text. Recommendation: use `#1D4ED8` background instead (7.2:1).

---

## Heuristic Review

Applied Nielsen's 10 usability heuristics.

**Visibility of system status** — Pass. Loading states present on CTA buttons.

**User control and freedom** — Pass. Nav includes back/home links and accessible skip-link.

**Error prevention** — Partial. Email newsletter signup has no validation feedback on blur. Recommendation: add inline validation before form submission.

**Consistency and standards** — Pass. All buttons of the same type share identical visual treatment.

**Recognition over recall** — Pass. Navigation labels are explicit, no unlabelled icon-only controls.

**Heuristic violation detected:** "Aesthetic and minimalist design" — the features section has 6 equal-weight cards competing for attention. Recommendation: elevate one card as a "featured" callout to create a natural focal point.

---

## Critical Issues (must fix)

1. **Low contrast — footer text** `#9CA3AF` on `#F9FAFB` = 2.9:1. Fix: change to `color-text-secondary` (`#6B7280`).
2. **Low contrast — pricing badge** white on `#60A5FA` = 3.0:1. Fix: darken background to `#1D4ED8`.

## Improvements (should fix)

1. **Email validation** — add `onblur` validation on the newsletter input to prevent failed submissions.
2. **Feature card hierarchy** — mark one feature as primary to prevent equal visual weight competing for attention.
3. **Mobile hero image** — dashboard screenshot does not scale gracefully below 480px; recommend hiding or replacing with simplified mobile graphic.

## Working Well

- Grid discipline is excellent — all elements align to a consistent 12-column system
- Typography hierarchy is clear and purposeful; headline-to-body size contrast is strong
- Hover transitions are smooth and consistent across interactive elements
- Semantic HTML structure is clean — no landmark region violations

---

## What's Next

- `/design` — fix the low-contrast footer and pricing badge issues
- `/design-system` — create tokens for the footer text colors to prevent recurrence
