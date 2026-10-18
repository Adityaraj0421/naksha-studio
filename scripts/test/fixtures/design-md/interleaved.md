---
name: Tidepool Field Notes
description: Interleaved tokens, one YAML block per section.
---

# Tidepool Field Notes

## Brand & Style

Naturalist's notebook: soft greens, generous margins, hand-set captions.

## Colors

```yaml
colors:
  primary: oklch(0.45 0.09 160)
  on-primary: "#ffffff"
  background:
    light: "#f4f7f2"
    dark: "#14201a"
  ink: "{colors.background.dark}"
```

The example below is documentation, not tokens, and must be ignored:

````markdown
```yaml
colors:
  primary: "#ff0000"
```
## Not a section
````

## Typography

```yml
typography:
  caption:
    fontFamily: "Atkinson Hyperlegible"
    fontSize: 0.875rem
    lineHeight: 1.4
```

## Layout & Spacing

```yaml
spacing:
  gutter: 24px
  "1.5": 6px
rounded:
  DEFAULT: 0.5rem
```

## Components

```yaml
components:
  note-card:
    backgroundColor: "{colors.background.light}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
```
