# /naksha-remember grid is 8px; no dark mode; WCAG AA required

**Parsing and persisting design constraints to project memory**

---

## Classified Constraints

Input parsed into 3 discrete constraints:

| # | Input | Classified As | Key | Value |
|---|-------|---------------|-----|-------|
| 1 | `grid is 8px` | `constraint` | `grid_base` | `"8px"` |
| 2 | `no dark mode` | `constraint` | `dark_mode` | `false` |
| 3 | `WCAG AA required` | `constraint` | `wcag_level` | `"AA"` |

---

## Memory Patch Applied

The following `project_json_patch` blocks will be applied to `.naksha/project.json` at session end:

```
<!-- naksha-memory-update
{"type":"project_json_patch","path":"constraints.grid_base","value":"8px"}
-->

<!-- naksha-memory-update
{"type":"project_json_patch","path":"constraints.dark_mode","value":false}
-->

<!-- naksha-memory-update
{"type":"project_json_patch","path":"constraints.wcag_level","value":"AA"}
-->
```

---

## Updated Project Memory

`.naksha/project.json` (constraints section after patch):

```json
{
  "constraints": {
    "grid_base": "8px",
    "dark_mode": false,
    "wcag_level": "AA"
  }
}
```

---

## How These Constraints Flow Into Future Commands

These stored constraints will automatically be injected as context in:

- **`/design`** — spacing system will use 8px grid; dark mode variants will not be generated
- **`/design-system`** — token scale built on 8px base unit; no dark mode token tier generated
- **`/accessibility-audit`** — WCAG AA level enforced for all contrast and interaction checks
- **`/design-score`** — Token Compliance dimension reads grid constraint; Accessibility dimension uses AA threshold

Run `/naksha-status` to view all stored constraints. Use `/naksha-remember <new constraint>` to add more. To remove a constraint, edit `.naksha/project.json` directly.
