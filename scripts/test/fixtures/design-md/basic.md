---
version: alpha
name: Harbor Ledger
description: Calm, trustworthy bookkeeping UI with ink-blue type on warm paper.
colors:
  primary: "#1F3A5F"
  on-primary: "#FFFFFF"
  secondary: "#5B6B7F"
  surface: "#FAF7F2"
  on-surface: "#1B1F24"
  accent: "#C2410C"
  error: "#B42318"
typography:
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 1
    letterSpacing: 0.08em
rounded:
  sm: 4px
  md: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  grid-columns: 12
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  chip:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  error-banner:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
---

# Harbor Ledger

## Overview

Quiet confidence for small-business finances. Dense where data lives, airy where
decisions are made.

## Colors

- **Primary (#1F3A5F):** Ink blue for actions and headings.
- **Surface (#FAF7F2):** Warm paper behind every page.

## Typography

Serif headlines, Inter for everything a user reads quickly.

## Layout

A 12-column grid on an 8px rhythm with a 4px half-step.

## Elevation & Depth

Flat surfaces separated by 1px hairlines rather than shadows.

## Shapes

Gentle 8px corners on containers, fully rounded chips.

## Components

Primary buttons are ink blue with white uppercase labels.

## Do's and Don'ts

- Do keep one primary action per view.
- Don't place accent text on the paper surface.
