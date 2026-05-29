---
description: "Show current Naksha project memory — brand settings, framework, token format, and recent design decisions."
argument-hint: ""
allowed-tools: ["Read", "Bash"]
---

# /naksha-status

Display the current Naksha project context and memory stored in `.naksha/project.json` and `.naksha/memory.md`.

## Process

### Step 1: Walk Up Directory Tree

Search for `.naksha/project.json` starting from `$PWD` and walking up to 3 parent directory levels:

```bash
for i in 0 1 2 3; do
  path=$(printf '%s' "$PWD" | sed "s|/[^/]*$||;t" | head -c $((${#PWD} - i * (${#PWD} / 4))) || echo "$PWD")
  [ -f "$path/.naksha/project.json" ] && echo "$path/.naksha/project.json" && break
done
```

Or use a simpler bash loop:

```bash
current="$PWD"
found=""
for i in {0..3}; do
  if [ -f "$current/.naksha/project.json" ]; then
    found="$current/.naksha/project.json"
    break
  fi
  parent=$(dirname "$current")
  [ "$parent" = "$current" ] && break
  current="$parent"
done
echo "$found"
```

### Step 2: Check for Project File

If `.naksha/project.json` is **not found**:

```
No project memory found. Run /naksha-init to set up your project context.
```

Exit cleanly.

If **found**: proceed to Step 3.

### Step 3: Read and Parse project.json

Read the `.naksha/project.json` file. Extract:

**v4 fields:**
- `name` → project name
- `brand.primary` → primary color (hex)
- `brand.secondary` → secondary color (hex, may be absent)
- `brand.font` → font family
- `brand.voice` → brand voice/tone description
- `framework` → framework name
- `tokenFormat` → token format name
- `createdAt` → ISO timestamp
- `designSystemPath` → design system path (may be absent)

**v5 fields (if present — all optional):**
- `schema_version` → `"5"` if v5; absent if v4
- `constraints` → full constraints object
- `component_patterns` → array of recorded UI patterns
- `browser_findings` → array of browser research captures

### Step 4: Generate Color Hints

For each color (primary and secondary), append a human-readable color name hint:

```
#6366F1 → indigo
#F59E0B → amber
#10B981 → emerald
#3B82F6 → blue
#EF4444 → red
#8B5CF6 → purple
#EC4899 → pink
#F97316 → orange
#FBBF24 → yellow
#6366F1 → indigo
#14B8A6 → teal
#000000 → black
#FFFFFF → white
#808080 → gray
```

Use a basic color matching: convert the hex to HSL or RGB and find the closest standard web color name. If no close match, just display the hex value without a hint.

### Step 5: Read memory.md (if exists)

Check if `.naksha/memory.md` exists (same directory as project.json):

```bash
memory_file="$(dirname "$project_json")/memory.md"
[ -f "$memory_file" ] && cat "$memory_file"
```

Extract the last 10 entries (lines that start with `[`) from memory.md, with newest first (reverse order).

Format of memory entries: `[YYYY-MM-DDTHH:MM:SSZ] /command: description`

### Step 6: Build Output

Render a formatted status dashboard:

```
## Naksha Project Status

**Project:** {name}   **Schema:** {v5 if schema_version is "5", else v4}
**Initialized:** {createdAt date in YYYY-MM-DD format}

### Brand
| Setting | Value |
|---------|-------|
| Primary color | {primary} ({color hint}) |
| Secondary color | {secondary} ({color hint}) or "—" if absent |
| Font | {font} |
| Voice | {voice} |

### Technical
| Setting | Value |
|---------|-------|
| Framework | {framework} |
| Token format | {tokenFormat} |
| Design system path | {designSystemPath} or "—" if absent |

{If constraints object is present AND has at least one field:}
### Constraints
| Constraint | Value |
|------------|-------|
| Grid | {constraints.grid} or — |
| Dark mode | {constraints.dark_mode — "disabled" / "required" / "—"} |
| Min contrast ratio | {constraints.min_contrast_ratio} or — |
| Breakpoints | {constraints.breakpoints joined as "768 / 1024 / 1280"} or — |
| Max content width | {constraints.max_content_width}px or — |
| Accessibility target | {constraints.accessibility_target} or — |
| Out of scope | {constraints.out_of_scope joined as bullet list} or — |
| Notes | {constraints.notes joined as bullet list} or — |

{If component_patterns array is present AND non-empty:}
### Component Patterns ({count})
{For each pattern:}
- **{name}** — {description}

{If browser_findings array is present AND non-empty:}
### Browser Research ({count} captures)
{For each finding, most recent first, max 5:}
- [{mode}] {url} — {patterns.length} patterns  ({captured_at as YYYY-MM-DD})

### Recent Decisions (last 10)
{numbered list of last 10 memory entries, with newest first}

---
Run `/naksha-init` to update brand/framework settings.
Run `/naksha-remember <decision>` to add constraints or component patterns.
Run `/naksha-browse <url>` to capture design research.
```

### Example Output

```
## Naksha Project Status

**Project:** Lumina SaaS   **Schema:** v5
**Initialized:** 2026-03-17

### Brand
| Setting | Value |
|---------|-------|
| Primary color | #6366F1 (indigo) |
| Secondary color | #F59E0B (amber) |
| Font | Inter |
| Voice | professional and approachable |

### Technical
| Setting | Value |
|---------|-------|
| Framework | nextjs |
| Token format | css-vars |
| Design system path | src/tokens/tokens.css |

### Constraints
| Constraint | Value |
|------------|-------|
| Grid | 8px |
| Dark mode | disabled |
| Accessibility target | WCAG AA |
| Out of scope | RTL support · print styles |

### Component Patterns (2)
- **card-layout** — White background, 1px border, 8px radius, 16px padding.
- **primary-button** — 40px height, full-radius pill shape, primary-500 fill.

### Browser Research (3 captures)
- [research] stripe.com — 5 patterns  (2026-05-29)
- [inspect] localhost:3000 — 4 patterns  (2026-05-28)
- [research] linear.app — 6 patterns  (2026-05-27)

### Recent Decisions (last 10)
1. [2026-05-29T15:01:00Z] /naksha-browse: research stripe.com — 5 patterns captured
2. [2026-05-29T14:35:00Z] /naksha-remember: grid 8px, dark_mode false, WCAG AA target
3. [2026-03-17T15:01:00Z] /design-system: Token format CSS vars, path src/tokens/tokens.css
4. [2026-03-17T14:35:00Z] /design: Landing page — hero split layout, CTA primary-500
5. [2026-03-17T14:22:00Z] /brand-kit: Primary #6366F1, secondary #F59E0B, font Inter

---
Run `/naksha-init` to update brand/framework settings.
Run `/naksha-remember <decision>` to add constraints or component patterns.
Run `/naksha-browse <url>` to capture design research.
```

## Color Hint Logic

Map hex colors to nearest standard color names using simple distance calculation:

```javascript
function getColorHint(hex) {
  const colors = {
    '#6366F1': 'indigo',
    '#3B82F6': 'blue',
    '#0EA5E9': 'sky',
    '#06B6D4': 'cyan',
    '#14B8A6': 'teal',
    '#10B981': 'emerald',
    '#22C55E': 'lime',
    '#FBBF24': 'amber',
    '#F59E0B': 'amber',
    '#F97316': 'orange',
    '#EF4444': 'red',
    '#EC4899': 'pink',
    '#8B5CF6': 'purple',
    '#A855F7': 'violet',
    '#000000': 'black',
    '#FFFFFF': 'white',
    '#6B7280': 'gray'
  };

  const upperHex = hex.toUpperCase();
  if (colors[upperHex]) return colors[upperHex];

  // Find closest match by hex distance
  let closest = '#6366F1';
  let minDist = 999;
  for (let [c, name] of Object.entries(colors)) {
    const dist = Math.abs(parseInt(c.slice(1), 16) - parseInt(upperHex.slice(1), 16));
    if (dist < minDist) {
      minDist = dist;
      closest = c;
    }
  }
  return colors[closest];
}
```

## Notes

- If `.naksha/memory.md` does not exist, simply omit the "Recent Decisions" section.
- If there are fewer than 10 entries in memory.md, display all of them.
- Format the creation date in readable form (YYYY-MM-DD) in the heading, but preserve the full ISO timestamp in the memory list.
- Keep the status output scannable and clean — use tables for structured data.
