#!/usr/bin/env bash
set -e

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKETPLACE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/naksha-marketplace"

echo "Installing naksha..."

# Create local marketplace structure
mkdir -p "$MARKETPLACE_DIR/plugins"
mkdir -p "$MARKETPLACE_DIR/.claude-plugin"

# Link the plugin into the marketplace (always points to this repo)
LINK="$MARKETPLACE_DIR/plugins/naksha"
LINK_KIND="symlink"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    # Git Bash's ln copies the directory unless Developer Mode is on, so use a
    # directory junction instead: it needs no admin rights and stays live.
    if [ -e "$LINK" ] || [ -L "$LINK" ]; then
      # rmdir without /s removes a junction without touching the repo it points to;
      # only a plain copied folder from an older install needs the recursive delete.
      cmd //c rmdir "$(cygpath -w "$LINK")" >/dev/null 2>&1 || rm -rf "$LINK"
    fi
    if cmd //c mklink //J "$(cygpath -w "$LINK")" "$(cygpath -w "$PLUGIN_DIR")" >/dev/null 2>&1; then
      LINK_KIND="junction"
    else
      cp -R "$PLUGIN_DIR" "$LINK"
      LINK_KIND="copy"
    fi
    ;;
  *)
    ln -sfn "$PLUGIN_DIR" "$LINK"
    ;;
esac

# Read version from plugin.json (node first, since Windows often has no python3)
PLUGIN_JSON="$PLUGIN_DIR/.claude-plugin/plugin.json"
VERSION=$(node -e 'console.log(require(process.argv[1]).version)' "$PLUGIN_JSON" 2>/dev/null \
  || sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$PLUGIN_JSON" | head -n 1)
if [ -z "$VERSION" ]; then
  echo "Could not read the version from $PLUGIN_JSON" >&2
  exit 1
fi

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
      "description": "A virtual design team for Claude Code — 30 roles, 70 commands, 16,000+ lines of expert design knowledge.",
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

# Install, or reinstall when already installed. Claude Code loads plugins from its own
# cached copy and only refreshes it on a version change, so a git pull alone is not
# picked up; uninstall --keep-data + install refreshes the copy and keeps plugin data.
if claude plugin list 2>/dev/null | grep -q "naksha@naksha-local"; then
  claude plugin uninstall naksha@naksha-local --keep-data >/dev/null 2>&1 || true
fi
claude plugin install naksha@naksha-local 2>/dev/null || claude plugin update naksha 2>/dev/null || true

echo ""
echo "Done! Restart Claude Code, then try:"
echo "  /design Build a landing page for a SaaS analytics product"
echo ""
echo "To update later: cd $(basename "$PLUGIN_DIR") && git pull && bash install.sh"
echo "(Claude Code runs its own cached copy of the plugin, so re-run install.sh after each pull.)"
if [ "$LINK_KIND" = "copy" ]; then
  echo "(The plugin folder was copied, not linked: install.sh refreshes that copy too.)"
fi
