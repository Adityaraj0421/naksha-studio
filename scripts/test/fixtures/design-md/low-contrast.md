---
name: Fogline Contrast Cases
colors:
  primary: "#2B6CB0"
  surface: "#FFFFFF"
  on-surface: "#B0B0B0"
  muted: "#949494"
  mid: "#6F6F6F"
  glass: rgba(255, 255, 255, 0.2)
typography:
  body:
    fontFamily: Inter
    fontSize: 16px
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 700
rounded:
  md: 8px
spacing:
  md: 16px
components:
  caption-muted:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.body}"
  hero-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.display}"
  body-mid:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.mid}"
    typography: "{typography.body}"
  glass-panel:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.surface}"
---

## Overview

Fixture for WCAG contrast checks.
