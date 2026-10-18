'use strict';
// Role roster + heuristics that map hook payloads to naksha roles.
// Only role NAMES ever leave this module — never the text they were matched in.

const fs = require('fs');
const path = require('path');

const DESIGN_MANAGER = 'Design Manager';

// naksha's own subagents (agents/*.md) → the roles they embody.
const AGENT_ROLES = {
  'accessibility-auditor': ['UX Researcher'],
  'design-critic': ['UX Researcher', 'Creative Director'],
  'design-critique': ['UX Researcher', 'Creative Director'],
  'design-lint': ['Design System Lead'],
  'design-qa': ['UI Designer', 'UX Researcher'],
  'design-token-extractor': ['Design System Lead'],
  'figma-creator': ['UI Designer'],
};

// Commands whose prompt files do not name their roles explicitly. Merged with
// the roles found by scanning commands/<cmd>.md. "Staffed" is a hint, not a claim.
const COMMAND_ROLES = {
  'ab-variants': ['UI Designer', 'Growth/Analytics Specialist'],
  'accessibility-audit': ['UX Researcher'],
  'brand-kit': ['Brand Strategist', 'UI Designer', 'Design System Lead'],
  'competitive-audit': ['UX Researcher', 'Brand Strategist'],
  'component-docs': ['Design System Lead', 'Content Designer'],
  'design-compare': ['UX Researcher', 'UI Designer'],
  'design-critique': ['Creative Director', 'UX Researcher'],
  'design-handoff': ['Design System Lead', 'Framework Specialist'],
  'design-present': ['Presentation Designer', 'Creative Director'],
  'design-qa': ['UI Designer', 'UX Researcher'],
  'design-reel': ['Video/Content Producer', 'Motion Designer'],
  'design-review': ['UX Researcher', 'UI Designer', 'Content Designer', 'Motion Designer'],
  'design-score': ['UX Researcher', 'UI Designer', 'Design System Lead'],
  'design-sprint': ['Product Designer', 'UX Designer', 'UX Researcher'],
  'figma-component-library': ['Design System Lead', 'UI Designer'],
  'figma-create': ['UI Designer'],
  'figma-prototype': ['UX Designer', 'Motion Designer'],
  'figma-responsive': ['UI Designer'],
  'figma-sync': ['Design System Lead'],
  figma: ['Framework Specialist', 'UI Designer'],
  'lint-design': ['Design System Lead'],
  'naksha-browse': ['UX Researcher'],
  'site-to-figma': ['UI Designer'],
  'ux-audit': ['UX Researcher', 'UX Designer'],
};

function loadRoles(pluginRoot) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'adapters', 'roles.json'), 'utf8'));
    return (data.roles || [])
      .filter((r) => r && typeof r.name === 'string')
      .map((r) => ({
        name: r.name,
        group: r.group || 'Other',
        label: r.label || '',
        focus: r.focus || '',
      }));
  } catch {
    return [];
  }
}

function groupRoles(roles) {
  const groups = [];
  const byName = new Map();
  for (const role of roles) {
    if (!byName.has(role.group)) {
      const g = { name: role.group, roles: [] };
      byName.set(role.group, g);
      groups.push(g);
    }
    byName.get(role.group).roles.push(role);
  }
  return groups;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** "naksha:design-critic" → "design-critic"; trimmed to a safe identifier. */
function normalizeAgent(agentType) {
  if (typeof agentType !== 'string') return '';
  return agentType
    .trim()
    .replace(/^naksha(-studio)?:/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .slice(0, 64);
}

/** Role names whose name or slug appears in free text (case-insensitive). */
function rolesInText(text, roles) {
  if (typeof text !== 'string' || !text) return [];
  const found = [];
  for (const role of roles) {
    const nameRe = new RegExp(`(^|[^a-z0-9])${escapeRe(role.name)}($|[^a-z0-9])`, 'i');
    const slugRe = new RegExp(`(^|[^a-z0-9-])${escapeRe(slug(role.name))}($|[^a-z0-9-])`, 'i');
    if (nameRe.test(text) || slugRe.test(text)) found.push(role.name);
  }
  return found;
}

function rolesForAgent(agentType, roles) {
  const agent = normalizeAgent(agentType);
  if (!agent) return [];
  const known = new Set(roles.map((r) => r.name));
  const mapped = (AGENT_ROLES[agent] || []).filter((n) => known.has(n));
  if (mapped.length) return mapped;
  return rolesInText(agent, roles);
}

const commandRoleCache = new Map();

/**
 * Roles a naksha command staffs, inferred from the roles its prompt file
 * names (commands/<cmd>.md). Design Manager always leads.
 */
function commandRoles(pluginRoot, cmd, roles) {
  const key = `${pluginRoot}::${cmd}`;
  if (commandRoleCache.has(key)) return commandRoleCache.get(key);
  const known = roles.filter((r) => r.name !== DESIGN_MANAGER);
  const staffed = new Set();
  if (/^[a-z0-9][a-z0-9-]{0,63}$/.test(cmd)) {
    try {
      const text = fs.readFileSync(path.join(pluginRoot, 'commands', `${cmd}.md`), 'utf8');
      known.filter((r) => text.includes(r.name)).forEach((r) => staffed.add(r.name));
    } catch {
      /* unknown command */
    }
    const names = new Set(known.map((r) => r.name));
    (COMMAND_ROLES[cmd] || []).filter((n) => names.has(n)).forEach((n) => staffed.add(n));
  }
  const result = [DESIGN_MANAGER, ...known.map((r) => r.name).filter((n) => staffed.has(n))];
  commandRoleCache.set(key, result);
  return result;
}

module.exports = {
  DESIGN_MANAGER,
  AGENT_ROLES,
  loadRoles,
  groupRoles,
  normalizeAgent,
  rolesInText,
  rolesForAgent,
  commandRoles,
  slug,
};
