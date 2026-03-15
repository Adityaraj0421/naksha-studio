#!/usr/bin/env node
/**
 * Naksha — Design Lint Script
 *
 * Checks HTML and CSS files for common design quality issues:
 * - Accessibility (semantic HTML, ARIA, alt text, lang attribute)
 * - Token compliance (hardcoded color/spacing values instead of CSS variables)
 * - Responsive design (missing meta viewport, fixed pixel widths)
 * - Contrast-critical patterns (common low-contrast text colors)
 *
 * Usage:
 *   node scripts/design-lint.js                  # reads CHANGED_FILES env var (CI mode)
 *   node scripts/design-lint.js file1.html ...   # explicit files (local mode)
 *
 * Configuration: .design-lint.json in repo root (optional)
 * Output: design-lint-report.json + console
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  failThreshold: 70,      // score below this fails CI
  warnOnTokens: true,     // warn when hardcoded colors/spacing found
  checkContrast: true,    // check for common low-contrast patterns
  checkSemantic: true,    // check for semantic HTML
  checkResponsive: true,  // check for responsive design basics
  ignorePatterns: [],     // glob patterns to ignore
};

// NOTE: checkContrast is declared in config but has no corresponding check in CHECKS.
// Passing checkContrast: false is a deliberate no-op. To implement contrast checking,
// add a check with configKey: 'checkContrast' to the CHECKS array.

function loadConfig() {
  const configPath = path.join(process.cwd(), '.design-lint.json');
  if (fs.existsSync(configPath)) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
    } catch {
      console.warn('Warning: could not parse .design-lint.json, using defaults');
    }
  }
  return DEFAULT_CONFIG;
}

// ─── File collection ──────────────────────────────────────────────────────────

function getFilesToLint() {
  // CI mode: read from CHANGED_FILES env var (set by GitHub Actions)
  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES.split(/\s+/).filter(Boolean);
  }
  // Local mode: explicit args
  if (process.argv.length > 2) {
    return process.argv.slice(2);
  }
  // Fallback: scan common directories
  const dirs = ['src', 'public', 'dist', '.'];
  const found = [];
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      scanDir(dir, found);
    }
  }
  return found;
}

function scanDir(dir, result, depth = 0) {
  if (depth > 4) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, result, depth + 1);
    } else if (/\.(html|css|scss)$/.test(entry.name)) {
      result.push(full);
    }
  }
}

// ─── Checks ───────────────────────────────────────────────────────────────────

const CHECKS = [];

// Accessibility checks (HTML only)
CHECKS.push({
  name: 'html-lang',
  configKey: 'checkSemantic',
  label: 'HTML lang attribute',
  type: 'html',
  severity: 'error',
  check(content, file) {
    if (content.includes('<html') && !/<html[^>]*\blang\s*=/i.test(content)) {
      return '<html> tag is missing a lang attribute (required for screen readers)';
    }
    return null;
  },
});

CHECKS.push({
  name: 'img-alt',
  configKey: 'checkSemantic',
  label: 'Image alt text',
  type: 'html',
  severity: 'error',
  check(content) {
    const matches = content.match(/<img(?![^>]*\balt\s*=)[^>]*>/gi) || [];
    if (matches.length > 0) {
      return `${matches.length} <img> element(s) missing alt attribute`;
    }
    return null;
  },
});

CHECKS.push({
  name: 'semantic-html',
  configKey: 'checkSemantic',
  label: 'Semantic HTML',
  type: 'html',
  severity: 'warning',
  check(content) {
    const hasSemantics = /<(nav|main|section|article|header|footer|aside|figure|figcaption|h[1-6])\b/i.test(content);
    const hasManyDivs = (content.match(/<div\b/gi) || []).length > 10;
    if (hasManyDivs && !hasSemantics) {
      return 'Page uses many <div> elements but no semantic landmarks (<nav>, <main>, <section>, etc.)';
    }
    return null;
  },
});

CHECKS.push({
  name: 'button-vs-div',
  configKey: 'checkSemantic',
  label: 'Button elements',
  type: 'html',
  severity: 'error',
  check(content) {
    const divClicks = (content.match(/<div[^>]*\bonclick\s*=/gi) || []).length;
    if (divClicks > 0) {
      return `${divClicks} <div> element(s) with onclick handler — use <button> for interactive elements`;
    }
    return null;
  },
});

CHECKS.push({
  name: 'viewport-meta',
  configKey: 'checkResponsive',
  label: 'Viewport meta tag',
  type: 'html',
  severity: 'error',
  check(content) {
    if (content.includes('<head') && !content.includes('name="viewport"') && !content.includes("name='viewport'")) {
      return 'Missing <meta name="viewport"> — page will not be responsive on mobile';
    }
    return null;
  },
});

CHECKS.push({
  name: 'input-label',
  configKey: 'checkSemantic',
  label: 'Form input labels',
  type: 'html',
  severity: 'warning',
  check(content) {
    const inputs = (content.match(/<input(?![^>]*type\s*=\s*["']?hidden)/gi) || []).length;
    const labels = (content.match(/<label\b/gi) || []).length;
    if (inputs > 0 && labels === 0) {
      return `${inputs} input element(s) found but no <label> elements — inputs need associated labels`;
    }
    return null;
  },
});

// Token compliance checks (CSS/HTML)
CHECKS.push({
  name: 'hardcoded-hex',
  configKey: 'warnOnTokens',
  label: 'CSS token compliance (colors)',
  type: 'css',
  severity: 'warning',
  check(content, file) {
    // Skip if file itself defines variables (it's the token source)
    if (content.includes(':root') && (content.match(/#[0-9a-f]{3,6}/gi) || []).length < 10) return null;
    const hexes = content.match(/#[0-9a-f]{6}\b/gi) || [];
    const uniqueHexes = [...new Set(hexes.map(h => h.toLowerCase()))];
    if (uniqueHexes.length > 5) {
      return `${uniqueHexes.length} hardcoded hex colors found — consider using CSS custom properties (var(--color-*))`;
    }
    return null;
  },
});

CHECKS.push({
  name: 'fixed-width',
  configKey: 'checkResponsive',
  label: 'Responsive widths',
  type: 'css',
  severity: 'warning',
  check(content) {
    // Look for fixed pixel widths wider than 400px not inside a media query or max-width
    const fixedWidths = content.match(/(?<![max|min]-)\bwidth\s*:\s*([5-9]\d{2}|[1-9]\d{3})px\b/g) || [];
    if (fixedWidths.length > 3) {
      return `${fixedWidths.length} fixed pixel widths found — use % or max-width for responsive layouts`;
    }
    return null;
  },
});

CHECKS.push({
  name: 'inline-styles',
  configKey: 'warnOnTokens',
  label: 'Inline style attributes',
  type: 'html',
  severity: 'warning',
  check(content) {
    const inlineStyles = (content.match(/\bstyle\s*=\s*["'][^"']{20,}/gi) || []).length;
    if (inlineStyles > 5) {
      return `${inlineStyles} inline style attributes with significant CSS — move to stylesheet for maintainability`;
    }
    return null;
  },
});

// Responsive checks
CHECKS.push({
  name: 'media-queries',
  configKey: 'checkResponsive',
  label: 'Responsive breakpoints',
  type: 'css',
  severity: 'warning',
  check(content, file) {
    // Only warn on substantial CSS files without any media queries
    if (content.length < 2000) return null;
    if (!content.includes('@media')) {
      return 'No @media queries found — add responsive breakpoints (768px tablet, 1024px desktop)';
    }
    return null;
  },
});

// ─── Runner ───────────────────────────────────────────────────────────────────

function classifyFile(file) {
  if (/\.html$/i.test(file)) return 'html';
  if (/\.(css|scss)$/i.test(file)) return 'css';
  return null;
}

function runChecks(file, content, type, config) {
  const issues = [];
  let passed = 0;

  for (const check of CHECKS) {
    // Gate on config flag — skip check if explicitly disabled
    if (check.configKey && config[check.configKey] === false) {
      passed++;
      continue;
    }
    // Match check to file type ('html' checks run on HTML, 'css' checks run on CSS and HTML)
    if (check.type === 'css' && type === 'html' && !content.includes('<style')) {
      // HTML files without <style> blocks skip CSS checks
      if (!content.includes('<style')) { passed++; continue; }
    }
    if (check.type === 'html' && type === 'css') {
      passed++;
      continue;
    }

    const result = check.check(content, file);
    if (result) {
      issues.push({
        file: path.relative(process.cwd(), file),
        check: check.label,
        severity: check.severity,
        message: result,
      });
    } else {
      passed++;
    }
  }

  return { issues, passed };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calculateScore(allIssues, totalChecks) {
  if (totalChecks === 0) return 100;
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  // Each error deducts more than a warning
  const deductions = (errors * 10) + (warnings * 3);
  return Math.max(0, Math.min(100, 100 - deductions));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const config = loadConfig();
  const files = getFilesToLint().filter(f => {
    if (!fs.existsSync(f)) return false;
    const type = classifyFile(f);
    return type !== null;
  });

  if (files.length === 0) {
    console.log('No HTML/CSS files to lint.');
    const report = { score: 100, issues: [], passed: 0, failed: 0, warnings: 0, files: 0 };
    fs.writeFileSync('design-lint-report.json', JSON.stringify(report, null, 2));
    process.exit(0);
  }

  console.log(`\n🎨 Naksha Lint — checking ${files.length} file(s)\n`);

  const allIssues = [];
  let totalPassed = 0;
  let totalChecks = 0;

  for (const file of files) {
    const type = classifyFile(file);
    const content = fs.readFileSync(file, 'utf-8');
    const { issues, passed } = runChecks(file, content, type, config);

    allIssues.push(...issues);
    totalPassed += passed;
    totalChecks += passed + issues.length;

    const fileLabel = path.relative(process.cwd(), file);
    if (issues.length === 0) {
      console.log(`  ✅ ${fileLabel}`);
    } else {
      console.log(`  ${issues.some(i => i.severity === 'error') ? '❌' : '⚠️'} ${fileLabel}`);
      for (const issue of issues) {
        const prefix = issue.severity === 'error' ? '    🔴' : '    🟡';
        console.log(`${prefix} [${issue.check}] ${issue.message}`);
      }
    }
  }

  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const score = calculateScore(allIssues, totalChecks);

  const report = {
    score,
    issues: allIssues,
    passed: totalPassed,
    failed: errors,
    warnings,
    files: files.length,
  };

  fs.writeFileSync('design-lint-report.json', JSON.stringify(report, null, 2));

  console.log(`\n─────────────────────────────────────────`);
  console.log(`  Score: ${score}/100`);
  console.log(`  ✅ ${totalPassed} checks passed`);
  console.log(`  ⚠️  ${warnings} warnings`);
  console.log(`  ❌ ${errors} errors`);
  console.log(`─────────────────────────────────────────\n`);

  if (score < config.failThreshold) {
    console.error(`Design quality score ${score} is below threshold ${config.failThreshold}. Fix errors and re-run.`);
    process.exit(1);
  }

  process.exit(0);
}

main();
