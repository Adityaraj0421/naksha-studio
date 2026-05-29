#!/usr/bin/env bash
set -e

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKETPLACE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/naksha-marketplace"

echo "Installing naksha..."

# Create local marketplace structure
mkdir -p "$MARKETPLACE_DIR/plugins"
mkdir -p "$MARKETPLACE_DIR/.claude-plugin"

# Symlink the plugin into the marketplace (always points to this repo)
ln -sfn "$PLUGIN_DIR" "$MARKETPLACE_DIR/plugins/naksha"

# Read version from plugin.json
VERSION=$(python3 -c "import json; print(json.load(open('$PLUGIN_DIR/.claude-plugin/plugin.json'))['version'])" 2>/dev/null || echo "4.8.0")

# Write marketplace manifest
cat > "$MARKETPLACE_DIR/.claude-plugin/marketplace.json" << EOF
{
  "\$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "naksha-local",
  "description": "Local naksha-studio plugin marketplace",
  "owner": { "name": "adityaraj0421" },
  "plugins": [
    {
      "name": "naksha",
      "description": "A virtual design team for Claude Code — 26 roles, 60 commands, 13,800+ lines of expert design knowledge.",
      "version": "$VERSION",
      "author": { "name": "adityaraj0421" },
      "source": "./plugins/naksha",
      "category": "design",
      "strict": false
    }
  ]
}
EOF

# Register marketplace (safe to run multiple times)
claude plugin marketplace add "$MARKETPLACE_DIR" 2>/dev/null || true

# Install (or reinstall) plugin
claude plugin install naksha@naksha-local 2>/dev/null || claude plugin update naksha 2>/dev/null || true

echo ""
echo "Done! Restart Claude Code, then try:"
echo "  /design Build a landing page for a SaaS analytics product"
echo ""
echo "To update later: cd $(basename "$PLUGIN_DIR") && git pull"
echo "(No reinstall needed — the plugin is a live symlink to this repo.)"
