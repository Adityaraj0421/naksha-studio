# Contributing to Naksha

Thanks for your interest in contributing! This guide explains how to add new roles, commands, agents, and references to the plugin.

## Plugin Architecture

```
naksha/
├── .claude-plugin/plugin.json    # Plugin manifest (name, version, description)
├── skills/design/
│   ├── SKILL.md                  # Orchestrator — routes tasks to roles
│   ├── settings.local.md         # User-configurable preferences
│   └── references/               # Knowledge bases (role expertise)
├── commands/                     # Slash commands (user entry points)
├── agents/                       # Specialist agents (delegatable)
├── hooks/hooks.json              # Lifecycle hooks (SessionStart, etc.)
├── scripts/                      # Shell scripts for hooks
└── evals/evals.json              # Test cases
```

### Key Concepts

| Concept | What it is | When to create one |
|---------|-----------|-------------------|
| **Command** | A `/slash` entry point that users invoke directly | When there's a distinct workflow users should trigger |
| **Agent** | A specialist that the Design Manager or commands can delegate to | When a task needs focused expertise and should run in its own context |
| **Reference** | A knowledge base file that roles read for expertise | When you need to encode domain knowledge (design rules, API patterns, best practices) |
| **Skill** | The orchestrator that routes tasks to the right roles | There's only one — `SKILL.md`. Update it when adding roles/commands |

## Adding a New Command

1. Create `commands/your-command.md` with frontmatter:

```yaml
---
description: "One-line description of what the command does."
argument-hint: "[what arguments it accepts]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---
```

2. Write the command body with:
   - Clear process steps (numbered)
   - Figma API code snippets (if Figma-related)
   - Expected output format
   - Notes section for gotchas

3. Update `skills/design/SKILL.md`:
   - Add to the Plugin Commands table
   - Add team assembly examples if relevant

4. Update `plugin.json` description to include the new command name.

5. Update `README.md`:
   - Add command documentation section
   - Update badge count
   - Update file tree
   - Update knowledge breakdown

6. Add an eval in `evals/evals.json` with 4-6 assertions.

## Adding a New Agent

1. Create `agents/your-agent.md` with frontmatter:

```yaml
---
name: your-agent
description: |
  When to trigger this agent. Include 2-3 examples with
  <example> tags showing user messages and expected behavior.
model: inherit
color: blue  # blue, orange, yellow, green, red, purple
tools: ["Read", "Grep", "Glob", "mcp__figma-console__*"]
---
```

2. Write the agent body with:
   - Role definition ("You are a...")
   - Knowledge base references to read
   - Evaluation framework or process
   - Output format template
   - Operating principles

3. Update `skills/design/SKILL.md`:
   - Add to Cross-Cutting Tools table
   - Add team assembly examples

4. Update `README.md` agents table.

## Adding a New Reference

1. Create `skills/design/references/your-reference.md`
2. No frontmatter needed — references are pure knowledge
3. Structure with clear headings, tables, and code examples
4. Keep it focused on one domain (don't mix typography rules with deployment)
5. Update `SKILL.md` to reference it in the appropriate role row
6. Update `README.md` knowledge breakdown table

## Adding a New Role

Roles are virtual — they're defined in `SKILL.md`, not in separate files. To add a role:

1. Add the role to the Core Makers table in `SKILL.md`
2. Create a reference file with the role's expertise
3. Add team assembly examples showing when the role activates
4. Update `README.md` team table and role count badge

## Code Style

- **Markdown**: Use ATX headings (`##`), pipe tables, fenced code blocks
- **Figma API**: Always use async APIs (`getNodeByIdAsync`, not `getNodeById`)
- **Font loading**: Always `await figma.loadFontAsync()` before text operations
- **Process steps**: Number them, use clear verbs ("Create", "Extract", "Validate")
- **Output templates**: Show the exact markdown structure the command produces

## Testing

Run the evals to verify:

```bash
# Validate JSON
cat evals/evals.json | python3 -m json.tool > /dev/null && echo "Valid"

# Validate plugin manifest
cat .claude-plugin/plugin.json | python3 -m json.tool > /dev/null && echo "Valid"

# Check all referenced files exist
grep -roh 'references/[a-z-]*.md' skills/design/SKILL.md | sort -u | while read f; do
  [ -f "skills/design/$f" ] && echo "OK $f" || echo "MISSING: $f"
done
```

## Platform Adapters

Naksha runs on 5 AI coding tools. The knowledge lives in the same role reference files — adapters just surface it differently:

| Tool | Adapter File | How It Loads |
|------|-------------|-------------|
| **Claude Code** | `.claude-plugin/plugin.json` + `skills/design/` | Plugin system — full 38 commands, agents, hooks |
| **Cursor** | `.cursor/rules/naksha.mdc` | Glob-matched rules — activates on CSS/HTML/TSX/SVG |
| **Windsurf** | `.windsurfrules` | Read at session start for entire project |
| **Gemini CLI** | `GEMINI.md` | Read at session start for entire project |
| **VS Code Copilot** | `.github/copilot-instructions.md` | Applied to Copilot Chat + inline completions |

### Updating Adapters

When adding a new role or significant design rule:
1. Update the role reference file in `skills/design/references/`
2. Update `skills/design/SKILL.md` routing
3. Add a summary row to the role table in each adapter file
4. Key design rules (new token patterns, new platform specs) should be reflected in adapter files too

Adapters are condensed representations — they don't need to include the full depth of role files, just the actionable rules and role descriptions.

## Sync to Plugin Install

After making changes, sync to the plugin install directory:

```bash
cp -r . ~/.claude/plugins/naksha/
```

Then restart Claude Code to reload the plugin.

## Submitting Changes

1. Fork and clone the repo
2. Create a feature branch: `git checkout -b feature/my-improvement`
3. Make your changes and test locally in Claude Code
4. Submit a PR with a clear description of what was added/changed
