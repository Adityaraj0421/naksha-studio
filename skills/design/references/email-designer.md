# Email Designer

Specializes in crafting HTML email templates that render correctly across 40+ email clients, handle the unique constraints of the email medium, and balance visual design with maximum deliverability.

---

## Email HTML Is Different

Email clients strip `<style>` blocks, ignore external CSS, and apply their own rendering rules. Unlike web, you must code for the lowest common denominator (Outlook 2007–2019 uses Microsoft Word's rendering engine).

**Core rules:**
- All styles must be **inline** (`style="..."` on each element)
- Layout uses `<table>` elements — no CSS grid, no flexbox
- No JavaScript
- No web fonts in Outlook (fallback to system fonts)
- Images must have `alt` text (many clients block images by default)
- `max-width: 600px` is the email standard width
- Always include a plain text version

---

## Document Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email Subject Line</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Global resets — these CAN be in <style> for modern clients */
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; }
    /* Outlook fixes */
    .ReadMsgBody { width: 100%; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font,
    .ExternalClass td, .ExternalClass div { line-height: 100%; }
    /* Mobile responsive — Outlook ignores @media, that's fine */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
      .stack-column, .stack-column-center { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .hide-on-mobile { display: none !important; max-height: 0 !important; overflow: hidden !important; }
    }
    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .dark-bg { background-color: #1a1a2e !important; }
      .dark-text { color: #f0f0f0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; width: 100%; word-break: break-word;">

  <!-- Preheader text (hidden, appears in inbox preview) -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
    Preview text that shows in inbox — keep under 140 characters.&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td>

        <!-- Email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" class="email-container" style="margin: auto;">

          <!-- Header -->
          <!-- Body sections -->
          <!-- Footer -->

        </table>
        <!-- End email container -->

      </td>
    </tr>
  </table>

</body>
</html>
```

---

## Layout Patterns

### Hero Section
```html
<tr>
  <td style="background-color: #2563eb; padding: 48px 40px; text-align: center;">
    <!-- Bulletproof button (works in Outlook) -->
    <h1 style="margin: 0 0 16px; font-family: Arial, sans-serif; font-size: 32px; font-weight: 700; color: #ffffff; line-height: 1.2;">
      Email Headline
    </h1>
    <p style="margin: 0 0 24px; font-family: Arial, sans-serif; font-size: 18px; color: rgba(255,255,255,0.9); line-height: 1.5;">
      Supporting description text here.
    </p>
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
      href="https://example.com/cta" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="10%"
      strokecolor="#ffffff" fillcolor="#ffffff">
      <w:anchorlock/>
      <center style="color:#2563eb;font-family:sans-serif;font-size:16px;font-weight:700;">Get Started →</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="https://example.com/cta"
       style="display: inline-block; background-color: #ffffff; color: #2563eb; font-family: Arial, sans-serif;
              font-size: 16px; font-weight: 700; line-height: 48px; text-decoration: none; text-align: center;
              padding: 0 24px; border-radius: 4px; -webkit-text-size-adjust: none;">
      Get Started →
    </a>
    <!--<![endif]-->
  </td>
</tr>
```

### Two-Column Layout
```html
<!--[if mso]>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td width="280" valign="top">
<![endif]-->

<div style="display: inline-block; max-width: 280px; vertical-align: top; width: 100%;" class="stack-column">
  <!-- Left column content -->
</div>

<!--[if mso]>
</td>
<td width="40"></td><!-- spacer -->
<td width="280" valign="top">
<![endif]-->

<div style="display: inline-block; max-width: 280px; vertical-align: top; width: 100%; margin-left: auto;" class="stack-column">
  <!-- Right column content -->
</div>

<!--[if mso]>
</td>
</tr>
</table>
<![endif]-->
```

### Feature Row (icon + text)
```html
<tr>
  <td style="padding: 20px 40px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td width="48" valign="top" style="padding-right: 16px;">
          <img src="https://example.com/icon.png" width="32" height="32" alt="Feature icon" style="display: block;">
        </td>
        <td valign="top">
          <p style="margin: 0 0 4px; font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: #111827;">Feature Title</p>
          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.5;">Feature description text that explains the benefit clearly.</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

### Footer
```html
<tr>
  <td style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
    <p style="margin: 0 0 8px; font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af;">
      © 2026 Company Name · 123 Street, City, Country
    </p>
    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af;">
      <a href="{{{UNSUBSCRIBE_LINK}}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
      · <a href="{{{PREFERENCES_LINK}}}" style="color: #9ca3af; text-decoration: underline;">Manage preferences</a>
      · <a href="{{{VIEW_IN_BROWSER_LINK}}}" style="color: #9ca3af; text-decoration: underline;">View in browser</a>
    </p>
  </td>
</tr>
```

---

## Typography Stack

**Safe fonts for all clients:**
- Sans-serif: `Arial, Helvetica, sans-serif`
- Serif: `Georgia, 'Times New Roman', Times, serif`
- Monospace: `'Courier New', Courier, monospace`

**Web fonts (with Outlook fallback):**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
<style>
  /* Inter loads in Gmail, Apple Mail, Thunderbird — falls back in Outlook */
  .font-inter { font-family: 'Inter', Arial, sans-serif !important; }
</style>
```

**Type scale:**
- H1 subject/hero: 28–40px, font-weight 700, line-height 1.2
- H2 section: 22–24px, font-weight 700, line-height 1.3
- Body: 16px, font-weight 400, line-height 1.6
- Caption/legal: 12px, font-weight 400, line-height 1.5

---

## Color System

**Never use CSS variables** (`var(--color)`) — inline styles don't support them.

Use hex codes directly: `#2563eb` not `var(--primary)`.

**Accessible contrast for email:**
- Body text on white: `#111827` (gray-900) — 16.1:1 ratio
- Secondary text: `#6b7280` (gray-500) — 4.6:1 ratio
- Link color: `#2563eb` — underline required (don't rely on color alone)
- CTA button text: `#ffffff` on `#2563eb` — 4.7:1 ratio

---

## Spacing System

Use `padding` on `<td>` elements, not `margin` on block elements.

- Outer container: 40px left/right padding
- Section spacing: 32–48px top/bottom
- Inner element gap: 16–24px
- Button padding: `0 24px` (line-height for vertical padding — not padding-top/bottom in Outlook)

---

## Image Best Practices

```html
<!-- Always include: width, height, alt, display:block -->
<img src="https://cdn.example.com/image.png"
     width="600" height="300"
     alt="Descriptive alt text"
     style="display: block; max-width: 100%; height: auto; border: 0;"
     class="fluid">
```

- Host images on CDN (never attach inline)
- Provide `width` and `height` to prevent layout shift when images are blocked
- PNG for logos/icons, JPEG for photos
- Keep images under 200KB
- Never put essential information in an image (it may be blocked)

---

## Deliverability Checklist

Before sending:
- [ ] `<title>` matches subject line
- [ ] Preheader text set (< 140 chars) and padded with `&zwnj;&nbsp;` to prevent inbox preview overflow
- [ ] Unsubscribe link present and working
- [ ] Physical address in footer (CAN-SPAM requirement)
- [ ] Text-to-image ratio > 60% text (heavy images trigger spam filters)
- [ ] No URL shorteners (appear spammy)
- [ ] SPF, DKIM, DMARC configured on sender domain
- [ ] Tested in Gmail, Outlook 2019, Apple Mail, Yahoo Mail
- [ ] Mobile preview at 375px width
- [ ] Alt text on every `<img>`

---

## ESP Template Variables

Use merge tag format appropriate to the ESP:
| ESP | Syntax |
|-----|--------|
| Mailchimp | `*|FNAME|*`, `*|UNSUBSCRIBE|*` |
| SendGrid | `{{first_name}}`, `{{unsubscribe}}` |
| Klaviyo | `{{ first_name }}`, `{% unsubscribe_link %}` |
| HubSpot | `{{contact.firstname}}` |
| Generic | `{{{FIRST_NAME}}}`, `{{{UNSUBSCRIBE_LINK}}}` |

When no ESP is specified, use `{{{VARIABLE_NAME}}}` triple-brace syntax and document variables in a comment block at the top.

---

## Email Types & Their Patterns

| Email Type | Key elements | CTA count |
|-----------|-------------|----------|
| **Transactional** (order confirm, receipt) | Clear subject, minimal design, data table, single CTA | 1 |
| **Welcome** | Brand hero, value props (3 icons), onboarding CTA | 1–2 |
| **Newsletter** | Logo, curated content sections (2–4), minimal footer | 1–3 |
| **Promotional** | Bold hero, urgency (deadline), benefit bullets, CTA | 1 |
| **Onboarding sequence** | Progress steps visible, single task per email | 1 |
| **Re-engagement** | Simple, personal tone, soft CTA, unsubscribe prominent | 1 |
| **Product announcement** | Hero image, feature highlight, 3 benefit tiles, CTA | 1 |

---

## QA Checklist

- [ ] Renders correctly in Outlook 2016+ (table layout, no flexbox)
- [ ] Renders correctly in Gmail (inline styles, no custom fonts)
- [ ] Mobile responsive at 375px (stack columns, full-width buttons)
- [ ] Images have alt text and explicit width/height
- [ ] Bulletproof CTA buttons (VML for Outlook)
- [ ] Unsubscribe link present
- [ ] Preheader set and padded
- [ ] No JavaScript, no external CSS file references
- [ ] All links use `https://` absolute URLs
- [ ] Physical address in footer
- [ ] Dark mode works (at least not broken)

---

## Handoffs

- **→ Email Copywriter**: Always request a copy brief before building HTML — subject line, preview text, headline, body paragraphs, CTA text, footer copy. Building templates from vague briefs leads to rework.
- **→ Framework Specialist**: When email must be generated programmatically (e.g., transactional receipts from a Next.js API route), hand off the MJML source + variable schema. They wire it into the backend.
- **→ Design System Lead**: When brand tokens need to sync between email templates and the web product — they own the token source; the email designer adapts tokens to inline-style–safe hex values (no CSS variables in email).
- **→ Design Manager**: Flag when a template requires a new ESP automation workflow (triggered sequences, behavioral sends) — that is outside email designer scope.

---

## Advanced Patterns

### Modular MJML Component System

Use `<mj-include>` to build a reusable component library: `header.mjml`, `footer.mjml`, `button.mjml`. Each is a standalone MJML fragment assembled at compile time. Prevents visual inconsistency across a 10+ template campaign suite — one change to `footer.mjml` propagates everywhere.

```xml
<!-- main-template.mjml -->
<mjml>
  <mj-head>
    <mj-include path="./partials/head-styles.mjml" />
  </mj-head>
  <mj-body>
    <mj-include path="./partials/header.mjml" />
    <!-- unique per-email content here -->
    <mj-include path="./partials/footer.mjml" />
  </mj-body>
</mjml>
```

When to output MJML vs raw HTML: output MJML when the system will compile it (agency workflow, CI pipeline); output raw HTML when the email is for direct ESP upload.

---

### Conditional Content Blocks for ESP Segmentation

Dynamic content swapping without duplicating full templates. Use ESP-native conditional syntax to swap hero sections, CTAs, or offer blocks by user segment:

| ESP | Conditional syntax |
|-----|--------------------|
| Klaviyo | `{% if person.plan == "pro" %}...{% endif %}` |
| Mailchimp | `*|IF:MERGE_FIELD = "value"|*...*|END:IF|*` |
| Salesforce MC | `%%[ IF @plan == "pro" THEN ]%%...%%[ ENDIF ]%%` |
| HubSpot | `{% if contact.plan == "pro" %}...{% endif %}` |

Use for: swapping hero sections by plan tier, showing different CTAs by lifecycle stage, suppressing upgrade offers for existing paid users.

---

### Retina Image Technique

Serve `@2x` images (e.g., `image@2x.png` at 1200×600px) but declare half dimensions in HTML attributes (`width="600" height="300"`). Renders crisp on retina screens. Outlook ignores `srcset` but respects HTML dimension attributes — this technique works in all clients.

```html
<img src="https://cdn.example.com/hero@2x.png"
     width="600" height="300"
     alt="Lumina Beauty serum on marble surface"
     style="display: block; max-width: 100%; height: auto; border: 0;"
     class="fluid">
```

Use PNG for logos and icons (sharp edges); JPEG for photos (smaller file size). Keep all images under 200KB.

---

### Animated GIF First-Frame Design Rule

Outlook (all Windows versions) renders **only the first frame** of an animated GIF. Design rule: frame 1 must function as a complete static image — headline visible, CTA text legible, message clear, no mid-animation state.

Workflow: pause the GIF at frame 1 in your editing tool before including it. If frame 1 doesn't stand alone, restructure the animation to start from a complete state.

---

## Full Coverage

Email client rendering support matrix — what works, what needs a workaround, what to avoid:

| Feature | Gmail (web) | Gmail app | Outlook 2016–2021 | Outlook 365 | Apple Mail | Yahoo Mail | Samsung Mail |
|---------|------------|-----------|-------------------|-------------|------------|------------|--------------|
| `<style>` block | Stripped from `<head>` (body `<style>` survives) | Stripped | Partial | Partial | ✅ Full | ✅ Full | ✅ Full |
| Inline styles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@media` queries | ✅ | ✅ iOS / ✅ Android² | ❌ | ❌ | ✅ | ✅ | ✅ |
| Web fonts (`@font-face`) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| CSS `display:flex` | ❌ | ❌ | ❌ | ❌ | ✅ | Partial | Partial |
| CSS floats | ❌ | ❌ | ❌ | ❌ | ✅ | Partial | Partial |
| CSS variables (`var()`) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Animated GIF | ✅ | ✅ | ❌ (frame 1 only) | ❌ (frame 1 only) | ✅ | ✅ | ✅ |
| HTML5 `<video>` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Dark mode `@media` | ❌ | Partial | Partial | ✅ | ✅ | ❌ | ✅ |
| VML (bulletproof buttons) | ❌ (ignored) | ❌ | ✅ Required | ✅ Required | ❌ (ignored) | ❌ (ignored) | ❌ (ignored) |
| Image blocking default | Off | Off | On | On | Off (MPP pre-fetches) | On | Off |

² Gmail Android has supported `@media` queries since 2019 — this differs from older legacy guides that mark it as unsupported.

**Key takeaways:**
- Always inline styles — `<style>` block is stripped by Gmail and unreliable across Outlook versions
- `@media` queries are safe for modern clients; Outlook ignores them gracefully (design desktop-first at 600px)
- Web fonts only work in Apple Mail and Samsung Mail — always specify system font fallbacks
- Bulletproof VML buttons are required for Outlook; all other clients ignore VML (that's the point)
- Animated GIFs must have a functional first frame — Outlook shows only frame 1
- Never put essential information (price, CTA text, headline) inside an image — up to 40% of recipients block images by default

---

## Reference-Sourced Insights

### MJML as an Abstraction Layer (From MJML docs)

MJML is a markup language that compiles to responsive email HTML. Use it when generating email templates programmatically — it abstracts away Outlook VML, inline style inlining, and table nesting.

**Core MJML structure:**
```xml
<mjml>
  <mj-head>
    <mj-preview>Preview text here</mj-preview>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700" />
    <mj-attributes>
      <mj-all font-family="Inter, Arial, sans-serif" />
      <mj-text padding="0" />
    </mj-attributes>
  </mj-head>
  <mj-body width="600px">
    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="16px">Body content</mj-text>
        <mj-button href="https://example.com">CTA Text</mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

**Key MJML rules:**
- All content must go inside `<mj-column>` — columns live inside `<mj-section>`
- Column auto-sizing: 2 columns = 50%/50%, 3 = 33%/33%/33%. Use `width="200px"` on `<mj-column>` for manual sizing
- `<mj-breakpoint width="480px" />` controls when mobile layout kicks in (default is 480px)
- `<mj-attributes>` in `<mj-head>` sets global defaults — use `<mj-all font-family="...">` to set font globally without repeating on every tag
- `<mj-include path="./header.mjml" />` for modular templates — good for reusable header/footer

**When to output MJML vs raw HTML:** Output MJML when the user/system will compile it; output raw HTML when the email is for direct ESP upload.

---

### Bulletproof Button Techniques (From Litmus)

There are 5 distinct methods for email CTAs, each with trade-offs:

| Method | Outlook rounded corners | Full button clickable | Complexity |
|--------|------------------------|----------------------|------------|
| **Conditional-padding** (recommended by Litmus) | No | Yes | Medium |
| **VML-based** | Yes | Yes | High (dual URLs) |
| **Padding-based (table `<td>`)** | No | No (text only) | Low |
| **Border-based (on `<a>` tag)** | No | Yes | Low |
| **Padding + border combo** | No | Yes | Medium |

**Never use image-based buttons** — they disappear when images are blocked (affects up to 40% of recipients). Image-blocking is on by default in: Outlook 2007+, Outlook.com, Yahoo Mail, Gmail (non-trusted senders).

**Border-based button** (simplest fully clickable approach, no VML):
```html
<a href="https://example.com"
   style="font-size:16px; font-family:Helvetica,Arial,sans-serif; font-weight:bold;
          color:#ffffff; text-decoration:none; border-radius:5px;
          background-color:#2563eb;
          border-top:12px solid #2563eb; border-bottom:12px solid #2563eb;
          border-right:24px solid #2563eb; border-left:24px solid #2563eb;
          display:inline-block;">
  Get Started →
</a>
```
Caveat: Outlook renders no rounded corners and slightly shrinks borders.

**Button size rules (From Litmus):** CTA button height should be 42–72px for mobile tap targets. CTA text: 1–5 words maximum. Use `line-height` for vertical height in Outlook (not `padding-top/bottom`).

---

### Image Blocking Reality (From Campaign Monitor)

- Up to **40% of email recipients never enable images at all**
- Gmail, Outlook 2007+, Outlook.com, and Yahoo Mail block images by default
- Apple Mail (post-iOS 15 / macOS Monterey): Mail Privacy Protection pre-fetches and caches remote images, so image blocking is rare in practice. When images are manually disabled, Apple Mail renders alt text — not a placeholder icon. The "?" placeholder icon behavior is associated with older Outlook versions, not Apple Mail
- Yahoo Mail does not show alt text at all when images are blocked
- Gmail shows alt text only if short enough

**Defensive design rules:**
- Never put essential information (price, CTA text, headline) inside an image
- Always start email body with preheader text — not an image — so preview pane shows content, not a blank square
- Test your email with images disabled as part of every QA review
- For clients who insist on image-heavy designs: show them the image-blocked version and ask "would you click through on this blank page?"
- Spam filters use image-to-text ratio as a spam signal — all-image emails are more likely to be filtered

---

### CSS Support Reality (From Campaign Monitor)

- **Only client that strips ALL CSS** (embedded `<style>` and inline) is Gmail app with non-Gmail addresses (GANGA)
- Modern email clients: Gmail strips `<style>` from `<head>`; Outlook (Windows) uses Word engine, no CSS floats, unreliable margins
- **Safe to use in `<style>` block** (not just inline): `@media` queries, `:hover` states, `@font-face`, animation (ignored gracefully by non-supporting clients)
- **Never use**: CSS floats for layout, `display: flex`, `display: grid`, CSS variables (`var(--x)`)
- **Whitespace in HTML tables matters**: Remove whitespace between `</td>` and `<td>` tags — some clients render it as layout gaps

**Development workflow:** Build with `<style>` block first for speed, then inline with a CSS inliner tool (Campaign Monitor CSS Inliner, Premailer) at the end. Keep both — the `<style>` block serves clients that support it, inline serves those that strip it.

---

### Video and Rich Media Rules (From Campaign Monitor)

- **JavaScript is unsupported** in all major email clients (security risk, spam signal)
- **HTML5 video:** Works in Apple Mail and some mobile clients, but blocked in Gmail, Outlook, and most clients
- **Animated GIFs:** Solid support across all clients, but Outlook (Windows) renders only the **first frame** — design first frame to stand alone as a static image
- **Video best practice:** Use a video thumbnail image with a play button overlay, linked to the video on your website. One extra click, guaranteed to work everywhere

---

### Number Precision in KPI Display (From Geckoboard — applicable to email data summaries)

When including data numbers in email (receipts, reports, summaries):
- Round to meaningful precision — showing conversion rate to 3 decimal places when you only care about whole-number changes adds noise
- Show units clearly: `$84K` not `$84,231.47` for executive summaries; use full precision only in transactional/receipt emails where the exact amount matters
- Trend indicators: show context ("vs last month") not just the number — "↑ 12%" means nothing without the baseline
