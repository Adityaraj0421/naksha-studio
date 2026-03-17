---
name: design-template
description: Generate a production-ready web page from a curated template category. Pick a category (landing-page, dashboard, pricing, auth, blog, ecommerce, portfolio, docs, saas, or onboarding) and get a fully-built, customized HTML/CSS template — brand colors, copy, and responsive layout included.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
arguments: "<category> [brand-color] [--style <style>] [--dark]"
---

# /design-template $ARGUMENTS

## Gallery Mode (No Arguments)

If `$ARGUMENTS` is empty, or the user has not specified a template category, or the message contains only discovery phrases ("show me templates", "what templates are available", "browse templates", "template list", "available templates", "what templates", "show templates") — output the following gallery and stop. Do not proceed to category generation.

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

After outputting the gallery, ask: "Which category would you like to generate? You can also specify a style (e.g., `/design-template landing-page --style bold`) or brand colors."

You are activating the **Design Template Gallery**: UI Designer + Content Designer + Design System Lead.

---

## Template Categories

| Category | What you get | Key sections |
|----------|-------------|-------------|
| `landing-page` | Marketing homepage | Hero, Features (3), Social Proof, CTA, Footer |
| `dashboard` | Admin/analytics dashboard | Sidebar nav, KPI cards, Chart area, Data table |
| `pricing` | Pricing page with toggle | Plan cards (3 tiers), Feature comparison, FAQ |
| `auth` | Login + signup screens | Form, OAuth buttons, validation states |
| `blog` | Blog/content layout | Article grid, Featured post, Category nav, Tags |
| `ecommerce` | Product listing + detail | Product grid, Filters, Product detail, Cart |
| `portfolio` | Personal/agency portfolio | Hero, Case studies grid, Skills, Contact |
| `docs` | Documentation site | Sidebar nav, Article, Code blocks, Search |
| `saas` | SaaS app page | Hero + demo, Integrations, Testimonials, Pricing CTA |
| `onboarding` | User onboarding flow | Step progress, Task cards, Completion state |

---

## Process

### 1. Parse the Request

Extract from `$ARGUMENTS`:
- **Category**: one of the 10 above (required)
- **Brand color**: hex code (e.g., `#6366f1`) — defaults to `#2563eb`
- **Style modifier** (`--style <name>`): minimal | bold | corporate | playful | dark-tech
- **Dark mode** (`--dark`): if present, generate dark-first design
- **Product name**: if mentioned in the task description

If category is unrecognized or missing, ask the user to choose from the list above.

---

### 2. Set the Design Direction

Before building, establish the design spec:

```
Template: [category]
Brand color: [hex]
Style: [minimal | bold | corporate | playful | dark-tech]
Background: [light | dark]
Typography: [font family choice]
Spacing: [compact | comfortable | spacious]
```

**Style guide:**
- `minimal` — white/light bg, lots of whitespace, thin borders, subtle shadows
- `bold` — strong typography, high contrast, prominent CTAs, full-bleed sections
- `corporate` — professional, serif accents, muted palette, structured layout
- `playful` — rounded corners, colorful gradients, friendly tone
- `dark-tech` — dark background, vibrant accent, code/terminal aesthetic

---

### 3. Generate the Template

Build a complete, production-ready HTML/CSS file for the chosen category. Follow the section structure below per category.

#### Landing Page
```
[Header] Logo + nav (4 links + CTA button)
[Hero] H1 headline + subtext + 2 buttons (primary + ghost) + hero illustration/screenshot
[Social proof] 3–5 company logos in a row with "Trusted by" label
[Features] 3 feature cards with icons, title, and 2-sentence description
[Feature detail] Left/right alternating layout with screenshot placeholder + copy
[Testimonials] 2–3 testimonial cards with avatar, quote, name, role
[CTA section] Full-width band with headline + button
[Footer] Logo + nav links + social links + legal
```

#### Dashboard
```
[Sidebar] Logo + navigation (5–6 items with icons, active state)
[Header bar] Page title + search + user avatar + notification bell
[KPI row] 4 stat cards with metric, label, trend indicator (↑/↓)
[Chart area] Two placeholder charts (bar + line) side-by-side
[Data table] 5 columns with headers, 5 sample rows, pagination, row actions
[Quick actions] Button group for primary actions
```

#### Pricing
```
[Header] Logo + nav
[Hero] "Simple, transparent pricing" + toggle (Monthly/Annual — annual shows 20% off)
[Plan cards] 3 cards (Starter/Pro/Enterprise): price, feature list (5–7 items), CTA
  - Middle card = highlighted (recommended)
[Feature comparison table] Full comparison of all plans
[FAQ] 4–5 accordion questions
[CTA band] "Questions? Talk to sales" section
[Footer]
```

#### Auth
```
[Split layout] Left: brand color background with product tagline
Right: Form area
[Login form] Email + password fields + "Forgot password" + submit button
[OAuth] "Or continue with" + Google + GitHub buttons
[Switch] "Don't have an account? Sign up" link
[Signup form variant] Add: Name field + password confirm + terms checkbox
[Error state] Field validation with red border + error message below
```

#### Blog
```
[Header] Logo + nav (Topics dropdown) + Search + Subscribe CTA
[Featured post] Large card with image, category badge, title, excerpt, author
[Article grid] 2x3 grid of article cards (image, category, title, excerpt, date, author)
[Sidebar] Popular posts + Tag cloud + Newsletter signup
[Pagination] Previous/Next + page numbers
[Footer]
```

#### E-commerce
```
[Header] Logo + search bar + cart icon (with count badge) + account
[Filter sidebar] Category tree + Price range + Rating + Brand checkboxes
[Product grid] 3-column grid of product cards (image, name, price, rating, add to cart)
[Product detail] Image gallery + title + price + variants (color/size) + quantity + CTA + description tabs
[Cart sidebar/overlay] Item list with quantities + subtotal + checkout button
```

#### Portfolio
```
[Hero] Full-screen with name, title, brief bio, CTA buttons (Work / Contact)
[Work grid] 2–3 column case study cards with hover overlay showing project role
[About section] Split: photo/illustration + skills/tools list
[Case study detail] Problem → Process → Solution → Result structure
[Contact] Simple form + social links
[Footer]
```

#### Docs
```
[Layout] Fixed sidebar (300px) + scrollable content + optional right TOC
[Sidebar] Logo + search + nav tree with sections and pages (collapsible)
[Article] H1 title + description + code blocks + callout boxes + next/prev navigation
[Code blocks] Syntax-highlighted (background shade), copy button, language label
[Search] Command palette overlay (⌘K)
[Dark mode toggle]
```

#### SaaS
```
[Header] Sticky nav with logo + links + "Sign in" + "Start free" (colored) button
[Hero] Large H1 + subheadline + email capture or "Try for free" CTA + product demo screenshot
[Social proof] Customer logos + "X,000 teams use [Product]" stat
[Features] Icon + headline + description grid (6 features, 2 per row)
[Integrations] Logo grid of 12 integration icons
[Testimonials] 3 testimonial cards + G2/Capterra rating badge
[Pricing preview] Simplified pricing with link to full pricing page
[Footer] Multi-column with product, company, resources, legal
```

#### Onboarding
```
[Progress indicator] Step bar (1/4, 2/4, etc.) with labels
[Step 1] Welcome — name/role collection, value prop
[Step 2] Setup task — connect tool / invite team / configure first item
[Step 3] First value moment — show their data, empty state with action
[Step 4] Completion — confetti/success state + "Go to dashboard" CTA
[Skip option] "Skip setup" link on each step
```

---

### 4. Apply Brand Customization

Use the provided brand color to generate a consistent palette:
- **Primary**: use brand color directly
- **Primary-dark**: darken by 15% for hover states
- **Primary-light**: lighten by 40% for backgrounds/tints
- **Neutral scale**: `#111827` → `#f9fafb` (gray-900 to gray-50)
- **Success**: `#16a34a` · **Warning**: `#d97706` · **Error**: `#dc2626`

Typography:
- Use `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` as the system stack
- Or `'Poppins', sans-serif` for playful style
- Or `'Merriweather', Georgia, serif` for blog/docs

---

### 5. Write Sample Copy

Do not use Lorem Ipsum — write real placeholder copy appropriate to the category:
- **Product/company name**: infer from the request, or use "Acme" as default
- **Headlines**: benefit-driven, specific to category
- **Feature descriptions**: realistic SaaS/product language
- **CTAs**: action-oriented, category-appropriate ("Start free trial" vs "Read the docs" vs "View portfolio")
- **Stats/numbers**: realistic (e.g., "10,000+ teams", "99.9% uptime", "4.8/5 rating")

---

### 6. Build the HTML

Output a complete, single-file HTML/CSS implementation:

**CSS approach:**
- Use CSS custom properties for the color system: `--color-primary`, `--color-bg`, `--color-text`, etc.
- Use CSS Grid and Flexbox for layout
- Include responsive breakpoints: `768px` (tablet) and `1024px` (desktop)
- Include dark mode: `@media (prefers-color-scheme: dark)` OR class-based `.dark` if `--dark` flag

**Code quality:**
- Semantic HTML (`<header>`, `<main>`, `<section>`, `<nav>`, `<article>`, `<aside>`, `<footer>`)
- ARIA labels on interactive elements
- `:hover`, `:focus`, `:active` states on all interactive elements
- Transitions: `0.15s ease` for color/opacity, `0.3s ease` for transforms

**Interactivity (vanilla JS, no dependencies):**
- Mobile navigation hamburger toggle
- Any toggles present in the design (pricing monthly/annual, FAQ accordion, tabs)
- Smooth scroll to sections
- Any form validation state demos

---

### 7. Preview Notes

After outputting the HTML, include:

```
Template: [Category Name]
File: [suggested-filename.html]
Customization applied:
  - Brand color: [hex] + generated palette
  - Style: [style name]
  - Copy: Product name "[X]" used throughout

To customize further:
  - Replace CSS custom properties in :root to rebrand instantly
  - Images: Replace placeholder <div> elements with <img> tags
  - Copy: Search for "Acme" to find all placeholder text

Next steps:
  /design-system — Extract these CSS variables as a design token file
  /email-template — Create an email template matching this design
  /design-framework react-tailwind — Convert to React components
  /figma-create — Recreate this design as a Figma file
```

---

### MCP Fallback

**Without Preview MCP**: Save the output as an HTML file and open in a browser. Chrome DevTools can simulate mobile sizes.

**With Preview MCP**: Start the preview server, write the HTML, and open for visual review. Check at 375px (mobile), 768px (tablet), and 1280px (desktop).

---

## What's Next

- `/design-system` — Extract the CSS variables as formal design tokens
- `/design-framework <fw>` — Convert this template to React, Vue, Next.js, Svelte, or Astro
- `/email-template` — Build a matching email template for this brand
- `/figma-create` — Recreate this template as an editable Figma design
- `/brand-kit` — Generate a full brand kit from the color used here
