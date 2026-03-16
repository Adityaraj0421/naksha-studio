# /figma-prototype — Lumina SaaS checkout flow interactive prototype

**Input:** `Build interactive prototype for Lumina SaaS checkout flow — usability testing ready`

---

## Prototype Overview

Built an interactive prototype covering the complete Lumina SaaS checkout flow for usability testing. The prototype is self-contained and loops back to the cart screen after order confirmation, enabling repeated test runs without moderator intervention.

| Property | Value |
|----------|-------|
| Prototype type | Figma interactive prototype |
| Total screens | 7 (5 main flow + 2 error states) |
| Device frame | Desktop — 1440 × 900px |
| Starting frame | `Cart — Default` |
| Loop behavior | Confirmation → Cart (loop enabled) |
| Cursor visibility | Hidden for mobile preview sessions |

The flow was designed for unmoderated usability testing. Testers can complete the full checkout flow independently. Error states are reachable via intentional wrong input on the payment screen (trigger: clicking "Pay Now" with the test invalid-card number `0000 0000 0000 0000`).

---

## Flow Diagram

The checkout prototype follows a linear 5-screen flow with 2 branching error states:

```
[Cart — Default]
       │
       ▼  (on click: "Proceed to Checkout")
[Guest Email Entry]
       │
       ├──► [Error: Invalid Email]  ◄──── (trigger: invalid email format)
       │         │
       │         └──► back to [Guest Email Entry]
       ▼  (on click: "Continue")
[Shipping Address]
       │
       ▼  (on click: "Continue to Payment")
[Payment]
       │
       ├──► [Error: Payment Failed]  ◄──── (trigger: test invalid card)
       │         │
       │         └──► back to [Payment]
       ▼  (on click: "Pay Now" with valid test card)
[Order Confirmation]
       │
       └──► loop back to [Cart — Default]  (on click: "Continue Shopping")
```

Each screen in the flow is a separate top-level Figma frame. Error states are sibling frames that overlay the parent screen context visually, making the flow feel inline rather than like a separate page.

---

## Interactions

Interactions are defined per hotspot. Each interaction entry lists the hotspot element, the trigger type, the destination, and any overlay behavior.

### Cart Screen

| Element | Trigger | Action | Destination |
|---------|---------|--------|-------------|
| "Proceed to Checkout" button | On click | Navigate to | Guest Email Entry |
| Quantity stepper (−) | On click | Smart Animate | Cart — Updated (same frame, quantity decremented) |
| Quantity stepper (+) | On click | Smart Animate | Cart — Updated (same frame, quantity incremented) |
| Remove item link | On click | Smart Animate | Cart — Item Removed |

### Guest Email Entry Screen

| Element | Trigger | Action | Destination |
|---------|---------|--------|-------------|
| Email input field | On key down | Smart Animate | Guest Email Entry — Typing state |
| "Continue" button | On click | Navigate to | Shipping Address |
| "Continue" button (invalid email) | On click | Navigate to | Error: Invalid Email |

The on key down trigger on the email field simulates inline validation as the user types. This interaction was specifically requested for usability testing — the team wants to observe whether users notice real-time validation feedback.

### Shipping Address Screen

| Element | Trigger | Action | Destination |
|---------|---------|--------|-------------|
| All input fields | On key down | Smart Animate | Field — Focused state |
| "Continue to Payment" | On click | Navigate to | Payment |
| "< Back" link | On click | Navigate back | Guest Email Entry |

### Payment Screen

| Element | Trigger | Action | Destination |
|---------|---------|--------|-------------|
| Card number field | On key down | Smart Animate | Card field — Typing state |
| "Pay Now" button (valid) | On click | Navigate to | Order Confirmation |
| "Pay Now" button (invalid) | On click | Navigate to | Error: Payment Failed |
| SSL badge | On hover | Open overlay | SSL Tooltip |
| "< Back" link | On click | Navigate back | Shipping Address |

### Order Confirmation Screen

| Element | Trigger | Action | Destination |
|---------|---------|--------|-------------|
| "Continue Shopping" button | On click | Navigate to | Cart — Default (loop) |
| "Download Receipt" link | On click | Open overlay | Receipt Preview overlay |

---

## Transitions

Transitions are specified per screen pair. The transition type, direction, duration, and easing are all set in the Figma prototype panel.

| From Screen | To Screen | Transition | Direction | Duration | Easing |
|-------------|-----------|------------|-----------|----------|--------|
| Cart | Guest Email Entry | Slide | Left | 300ms | Ease-out |
| Guest Email Entry | Shipping Address | Slide | Left | 300ms | Ease-out |
| Shipping Address | Payment | Slide | Left | 300ms | Ease-out |
| Payment | Order Confirmation | Dissolve | — | 400ms | Ease-in-out |
| Any screen | Error state | Smart Animate | — | 200ms | Ease-out |
| Error state | Parent screen | Smart Animate | — | 200ms | Ease-in |
| Order Confirmation | Cart (loop) | Slide | Right | 300ms | Ease-out |
| Any screen | Back navigation | Slide | Right | 300ms | Ease-out |

**Notes on transition choices:**

- Slide Left/Right enforces a clear sense of linear forward/backward progress through the checkout flow.
- Dissolve on the Order Confirmation transition signals a state change (from transactional to confirmational) rather than a spatial navigation.
- Smart Animate on error states allows the error message to appear to "grow in" from the affected input field, which is more informative than a hard cut.

---

## Hotspots

Hotspots define the tappable/clickable zones on each screen. All hotspots are defined as invisible rectangle layers placed above the relevant UI element in the frame layer stack.

### Primary CTA Buttons (all screens)

- Hotspot size: Full-width button (stretches edge-to-edge of content area)
- Hotspot label: `[ScreenName]/PrimaryCTA`
- Interaction: navigate to next screen in flow

### Back Navigation Link (all screens except Cart)

- Hotspot position: Top-left, above the screen heading
- Hotspot size: 80 × 32px (includes touch padding)
- Interaction: navigate back (slide right transition)

### Skip Step Link (Shipping Address screen)

- Hotspot position: Top-right, inline with section heading
- Hotspot element: "Skip for now" text link
- Hotspot size: text bounding box + 16px horizontal padding
- Interaction: navigate directly to Payment screen

### SSL Badge (Payment screen)

- Hotspot position: Below payment form, left of "Pay Now" button
- Hotspot size: badge bounding box + 8px padding
- Interaction: on hover — open SSL tooltip overlay
- Tooltip: "This page is secured with 256-bit TLS encryption" — appears as a small popover above the badge, auto-dismisses on mouse-out

### Error Dismiss Button (Error states)

- Hotspot: "Try Again" button
- Interaction: navigate back to parent screen (smart animate)

---

## Testing Notes

The prototype is configured for usability testing sessions. The following settings and conventions apply:

### Session Setup

- **Starting frame:** Always begin from `Cart — Default`. The Figma prototype URL with `?starting-point=cart-default` is pre-set for session sharing.
- **Loop:** Confirmation screen loops back to Cart automatically on "Continue Shopping" click. Testers can run multiple checkout passes without moderator reset.
- **Cursor:** Cursor is hidden in mobile preview mode to simulate a touch interaction pattern. For desktop sessions, cursor is visible.
- **Device frame:** Desktop Chrome frame visible to anchor the test context. Disable device frame for full-bleed tablet/mobile test sessions.

### Facilitator Notes

1. Do not narrate the flow to participants — let them discover the progression independently.
2. The "Skip for now" hotspot on Shipping Address is intentionally subtle — observe whether participants find it without prompting.
3. Trigger the payment error state by instructing participants to use the card number shown on the payment screen helper text (`0000 0000 0000 0000`).
4. Watch for hesitation at the Guest Email Entry screen — early research suggests users expect a social login option that is not present in this prototype.

### Known Prototype Limitations

- Form fields accept any input visually but only the specific test-card trigger routes to the error state. Real validation is not simulated.
- The "Download Receipt" overlay on the Confirmation screen shows a static PDF mockup — it is not a scrollable overlay.
- Mobile breakpoint frames exist (375px) but are not yet wired into this prototype flow — they are in scope for the next prototype iteration.

---
