# /naksha-doctor — Plugin Health Check

**Running naksha quality checks...**

---

## Health Report

```
╔══════════════════════════════════════════════╗
║            naksha doctor — v5.0.0            ║
╚══════════════════════════════════════════════╝

Check 1 — validate-structure
  ✅ PASS  commands: 62
  ✅ PASS  reference_files: 32
  ✅ PASS  knowledge_lines: 15261
  ✅ PASS  version: 5.0.0
  ✅ PASS  all required fields present across commands
  ✅ PASS  pipeline YAML structure valid
  ✅ PASS  evals.json structure valid
  ✅ PASS  fixture count matches registry

Check 2 — verify-metadata
  ✅ PASS  stats.json matches filesystem
  ✅ PASS  README badge matches stats
  ✅ PASS  plugin.json version matches stats

Check 3 — behavioral-smoke
  ✅ PASS  60 fixtures verified
  ⚠  WARN  3 fixtures not yet populated (naksha-browse, naksha-remember, naksha-doctor)

Check 4 — guard-legacy-branding
  ✅ PASS  no legacy branding found

Check 5 — guard-counts
  ✅ PASS  command count 62 consistent across all files
  ✅ PASS  knowledge-line floor claims consistent
```

---

## MCP Availability

| MCP | Status | Commands Affected |
|-----|--------|-------------------|
| Playwright MCP | ✅ AVAILABLE | `/figma-create`, `/site-to-figma`, `/design-qa`, `/naksha-browse`, `/design-score` (URL mode) |
| Figma MCP | ✅ AVAILABLE | `/figma-create`, `/figma-responsive`, `/figma-sync`, `/figma-component-library`, `/ux-audit` |

---

## Memory Check

| Field | Status |
|-------|--------|
| `.naksha/project.json` | ✅ found |
| Schema version | ✅ v5 |
| Constraints | `grid_base: 8px`, `wcag_level: AA`, `dark_mode: false` |
| Component patterns | 0 patterns stored |
| Browser findings | 1 finding stored (stripe.com) |

Memory     schema      ✅ v5 (project.json found)

---

## Summary

```
╔══════════════════════════════════════════════╗
║  naksha doctor: HEALTHY                      ║
║  5/5 quality checks pass                     ║
║  All MCPs available                          ║
║  Project memory: v5 schema active            ║
╚══════════════════════════════════════════════╝
```

**3 warnings** (not failures): 3 smoke fixtures are not yet populated with real command output. Run each command and paste output into `evals/fixtures/` to populate them.

To validate your full project setup: run `/naksha-doctor --fix` for remediation guidance on any check that fails.
