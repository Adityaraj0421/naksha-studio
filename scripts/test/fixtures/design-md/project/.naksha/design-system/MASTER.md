---
version: alpha
name: Copperline Studio
description: Master design system for every Copperline page.
colors:
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  ink: "#1C1917"
  accent: "#B45309"
typography:
  body-md:
    fontFamily: Inter
    fontSize: 16px
    lineHeight: 1.5
rounded:
  md: 8px
spacing:
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
  promo-badge:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-primary}"
---

## Overview

Warm, crafted, quietly premium.

## Colors

Copper accents on clean white surfaces. The primary colour comes from the brand
defaults in `.naksha/project.json`.

## Components

Primary buttons use the brand colour with 8px corners.
