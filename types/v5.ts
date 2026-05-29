/**
 * naksha v5 — Design Agent Interface Contract
 *
 * This file is a DESIGN DOCUMENT expressed in TypeScript type notation.
 * It is not compiled or executed. It defines the schema contract that
 * all v5 capabilities (browser vision, persistent memory, agentic pipelines)
 * build to.
 *
 * Read alongside: docs/naksha-memory-schema.md (authoritative field-level spec)
 *
 * Build sequence: v5.0 Browser → v5.1 Memory Expansion → v5.2 Pipeline Runtime
 * Design sequence: all types defined here, before any v5 code is written.
 *
 * Key constraint: naksha commands are markdown prompt files, not function calls.
 * The actual injection mechanism is prompt prepending. The actual memory write
 * mechanism is the Claude Code Stop hook parsing structured HTML comment blocks.
 * These TypeScript types define the INTENT; the implementation is prompt-level.
 */

// ─── Framework & Token enums (already in project.json v4) ────────────────────

/** Supported web frameworks — must match existing tokenFormat enum in project.json */
export type Framework =
  | 'react'
  | 'vue'
  | 'svelte'
  | 'nextjs'
  | 'astro'
  | 'html';

/** Design token output formats — must match existing tokenFormat enum in project.json */
export type TokenFormat =
  | 'css-vars'
  | 'tailwind'
  | 'style-dictionary';

// ─── Brand (v4 compatible, unchanged) ────────────────────────────────────────

/**
 * Brand identity for this project.
 * Fields are identical to v4 project.json — no changes to existing brand schema.
 * v5 reads these fields; it does not restructure them.
 */
export interface Brand {
  /** Primary brand color in hex (e.g. "#6366F1"). Required. */
  primary: string;
  /** Secondary/accent color in hex. Optional. */
  secondary?: string;
  /** Primary font family (e.g. "Inter"). Required. */
  font: string;
  /** Brand voice descriptor, 1–2 phrases (e.g. "professional and approachable"). Required. */
  voice: string;
}

// ─── Constraints (NEW in v5.1) ────────────────────────────────────────────────

/**
 * Project-level design constraints established through decisions and research.
 * All fields optional — constraints accumulate as decisions are made.
 * Commands prepend relevant constraints as context before executing.
 *
 * Written by: /naksha-remember, /naksha-browse, /design-system, /brand-kit
 * Read by: /design, /design-review, /design-score, /design-system, /brand-kit
 */
export interface Constraints {
  /** Base grid unit (e.g. "4px", "8px"). Affects spacing suggestions. */
  grid?: string;
  /** Dark mode support decision. false = explicitly ruled out. */
  dark_mode?: boolean;
  /** Minimum contrast ratio for accessibility (e.g. 4.5 for WCAG AA). */
  min_contrast_ratio?: number;
  /** Target breakpoints as min-widths in px (e.g. [768, 1024, 1280]). */
  breakpoints?: number[];
  /** Max content width in px (e.g. 1280). */
  max_content_width?: number;
  /** Explicit out-of-scope decisions. Each entry is a brief statement. */
  out_of_scope?: string[];
  /** Accessibility standard target (e.g. "WCAG AA", "WCAG AAA"). */
  accessibility_target?: string;
  /**
   * Free-form additional constraints that don't map to a structured field.
   * Written when /naksha-remember decision doesn't map to a known key.
   */
  notes?: string[];
}

// ─── Component Patterns (NEW in v5.1) ─────────────────────────────────────────

/**
 * A recurring UI pattern observed or decided for this project.
 * Accumulated over time as /design, /design-review, and /naksha-remember run.
 *
 * Written by: /design, /design-review, /naksha-browse (visual inspection mode)
 * Read by: /design, /design-score, /figma-component-library
 */
export interface ComponentPattern {
  /** Short identifier (kebab-case, e.g. "card-layout", "nav-sidebar"). */
  name: string;
  /** One-sentence description of the pattern. */
  description: string;
  /** Example component or file using this pattern (relative path or component name). */
  example?: string;
  /** ISO 8601 timestamp when this pattern was recorded. */
  recorded_at: string;
  /** Which naksha command established this pattern. */
  source_command: string;
}

// ─── Browser Findings (NEW in v5.0) ───────────────────────────────────────────

/**
 * A single design pattern observation extracted from browser research.
 * Used in /naksha-browse research mode.
 */
export interface BrowserPattern {
  /** Short pattern name (e.g. "card-grid layout", "sticky nav on scroll"). */
  name: string;
  /** What the pattern does and why it's notable. 1–2 sentences. */
  description: string;
}

/**
 * A design score snapshot captured by /design-score.
 * Written to browser_findings so subsequent /design runs know the last baseline.
 */
export interface DesignScoreSnapshot {
  /** 0–100 composite score. */
  overall: number;
  /** Accessibility dimension score (0–25). */
  accessibility: number;
  /** Usability dimension score (0–25). */
  usability: number;
  /** Visual quality dimension score (0–25). */
  visual_quality: number;
  /** Token compliance dimension score (0–25). */
  token_compliance: number;
  /** Top issues returned by /design-score, highest impact first. */
  top_issues: string[];
}

/**
 * A single browser session finding — either a research capture or a design score.
 * The browser_findings array is capped at 20 entries (FIFO eviction).
 * Entries older than 30 days are evicted on the next write.
 * Commands prepend only the 5 most recent entries as context.
 */
export interface BrowserFinding {
  /** ISO 8601 timestamp of this capture. Used for eviction logic. */
  captured_at: string;
  /**
   * "inspect" — visual capture of a localhost URL (rendered UI analysis).
   * "research" — external URL fetched for design pattern reference.
   * "score" — /design-score snapshot written back to memory.
   */
  mode: 'inspect' | 'research' | 'score';
  /** The URL that was captured. localhost URLs for inspect, external for research. */
  url: string;
  /** Design patterns extracted (populated for inspect and research modes). */
  patterns?: BrowserPattern[];
  /** Design score snapshot (populated for score mode only). */
  score?: DesignScoreSnapshot;
  /** Which naksha command generated this finding. */
  source_command: string;
}

// ─── Project Brain — the full v5 project.json schema ─────────────────────────

/**
 * ProjectBrain: the complete v5 project.json schema.
 *
 * BACKWARD COMPATIBILITY: All v4 fields are preserved unchanged.
 * All v5 fields are optional — v4 project.json files are valid v5 documents.
 *
 * Migration: /naksha-init on a v4 project.json adds the new optional fields
 * with undefined/empty defaults and updates `updatedAt`. Existing values unchanged.
 * /naksha-doctor --fix detects v4 schema (missing `constraints` field) and upgrades.
 *
 * Authoritative field-level spec: docs/naksha-memory-schema.md
 */
export interface ProjectBrain {
  // ── v4 fields (unchanged) ──────────────────────────────────────────────────

  /** Project display name (1–100 chars). Required. */
  name: string;
  /** Brand identity. Required. */
  brand: Brand;
  /** Target web framework. Required. */
  framework: Framework;
  /** Design token output format. Required. */
  tokenFormat: TokenFormat;
  /** Relative path to existing design system file. Optional. */
  designSystemPath?: string;
  /** ISO 8601 timestamp: when /naksha-init ran. Auto-set. */
  createdAt: string;
  /** ISO 8601 timestamp: last write to any .naksha/ file. Auto-updated. */
  updatedAt: string;

  // ── v5 fields (all optional — additive, backward compatible) ──────────────

  /**
   * Project-level design constraints (v5.1+).
   * Accumulated from /naksha-remember, /design-system, and browser research.
   */
  constraints?: Constraints;

  /**
   * Recurring UI patterns established for this project (v5.1+).
   * Commands use these to generate consistent components.
   * Cap: 50 patterns. If over cap, oldest by recorded_at are evicted.
   */
  component_patterns?: ComponentPattern[];

  /**
   * Browser session findings: visual captures and design research (v5.0+).
   * Cap: 20 entries (FIFO). Entries older than 30 days are evicted on next write.
   * Context window: commands prepend only the 5 most recent entries.
   */
  browser_findings?: BrowserFinding[];

  /**
   * v5 schema version marker. Absent = v4. "5" = this schema.
   * Used by /naksha-doctor to detect and offer migration.
   */
  schema_version?: '5';
}

// ─── NakshaContext — the runtime context object ───────────────────────────────

/**
 * NakshaContext: what every v5 command receives as context.
 *
 * IMPORTANT: This is NOT a typed runtime dispatch. naksha commands are markdown
 * prompt files. The actual injection mechanism is prompt prepending — the command
 * reads .naksha/project.json and prepends relevant fields as context text.
 *
 * This interface defines the INTENT. The implementation is:
 * 1. Read .naksha/project.json into ProjectBrain
 * 2. Serialize relevant fields to human-readable text
 * 3. Prepend to the command prompt before execution
 *
 * Which fields get prepended:
 * - All commands: brand, framework, tokenFormat (v4 baseline)
 * - Design commands (/design, /design-review, /design-score): + constraints, component_patterns, browser_findings[0..4]
 * - Research commands (/naksha-browse): + browser_findings[0..4] (prior research context)
 * - Pipeline commands (/pipeline run): + full ProjectBrain as structured context
 */
export interface NakshaContext {
  /**
   * The project brain — full v5 project.json contents.
   * Undefined if .naksha/project.json does not exist (graceful degradation).
   */
  project?: ProjectBrain;

  /**
   * Browser session — available when Playwright MCP is running.
   * Undefined if Playwright is unavailable.
   *
   * When undefined, commands that use browser capabilities emit:
   * "ℹ Browser vision unavailable (Playwright MCP not running).
   *  Run /naksha-doctor for setup instructions."
   * then continue without browser steps.
   *
   * Exception: /naksha-browse requires browser and fails explicitly when unavailable.
   */
  browser?: BrowserSession;

  /**
   * Pipeline runtime — available when a command is invoked as a pipeline step.
   * Undefined when invoked interactively.
   */
  pipeline?: PipelineRuntime;
}

// ─── BrowserSession ───────────────────────────────────────────────────────────

/**
 * BrowserSession: the active Playwright MCP connection.
 * Only populated when Playwright MCP is available and a session is active.
 */
export interface BrowserSession {
  /**
   * "inspect" — connected to a localhost dev server.
   * "research" — connected to an external URL for design reference.
   */
  mode: 'inspect' | 'research';
  /** The target URL (e.g. "http://localhost:3000" or "https://stripe.com/settings"). */
  target_url: string;
  /** Whether a screenshot has already been captured in this session. */
  has_screenshot: boolean;
}

// ─── PipelineRuntime ──────────────────────────────────────────────────────────

/**
 * PipelineRuntime: context available when a command runs as a pipeline step.
 */
export interface PipelineRuntime {
  /** Name of the currently executing pipeline (from YAML `name:` field). */
  pipeline_name: string;
  /** Zero-indexed current step number. */
  step_index: number;
  /** Total steps in this pipeline. */
  total_steps: number;
  /** Outputs from previously completed steps, keyed by step name. */
  prior_outputs: Record<string, string>;
}

// ─── CommandOutput — the memory write contract ────────────────────────────────

/**
 * CommandOutput: what commands return to the memory system.
 *
 * IMPORTANT: Commands do not return typed objects — they produce text.
 * The memory write is signaled via a structured HTML comment block at the
 * END of the command's response:
 *
 * <!-- naksha-memory-update
 * {
 *   "type": "project_json_patch",
 *   "path": "constraints.grid",
 *   "value": "4px"
 * }
 * -->
 *
 * The Claude Code Stop hook (hooks/hooks.json) reads this block, validates
 * the path against ProjectBrain, and patches .naksha/project.json atomically.
 * For memory.md writes, commands use the Write tool directly (already established).
 *
 * Reliability target: ≥90% successful writes across the 5 upgraded commands.
 * Failed writes (malformed block or absent) are logged to ~/.naksha/hook-errors.log.
 */
export interface CommandOutput {
  /** The command's primary text response shown to the user. */
  result: string;

  /**
   * Optional partial update to write to .naksha/project.json.
   * Only fields present in this partial are written — other fields unchanged.
   * Validated against ProjectBrain schema before write.
   */
  memory_updates?: Partial<ProjectBrain>;

  /**
   * Optional entry to append to .naksha/memory.md.
   * Max 100 characters (enforced by Stop hook).
   * Format: "/{command}: {decision summary}"
   */
  memory_log_entry?: string;
}

// ─── Pipeline YAML step types (v5.2 schema extension) ─────────────────────────

/**
 * PipelineStepType: the step types supported in v5.2 pipeline YAML.
 *
 * Existing "command" type (already in v4 YAML) is extended with memory_read
 * and memory_write fields. New "browser" type added for v5.
 */

/**
 * An existing naksha command invoked as a pipeline step.
 * Extends the v4 `command:` step with memory I/O.
 */
export interface PipelineCommandStep {
  type?: 'command'; // default; can be omitted for backward compatibility
  /** The naksha command to run (e.g. "design", "design-score"). Without the slash. */
  command: string;
  /** Input/brief passed to the command. May reference prior step outputs via {{step_name}}. */
  input?: string;
  /**
   * ProjectBrain fields to prepend as context (v5.1+).
   * e.g. ["brand", "constraints", "browser_findings.latest_capture"]
   */
  memory_read?: string[];
  /**
   * ProjectBrain path to write the step's output to (v5.1+).
   * e.g. "component_patterns.settings_page"
   */
  memory_write?: string;
  /** Human-readable step name for status reporting. */
  name?: string;
}

/**
 * A browser capture or research step (v5.0+).
 * Requires Playwright MCP. Skips gracefully when unavailable.
 */
export interface PipelineBrowserStep {
  type: 'browser';
  /**
   * "inspect" — visual capture of a localhost dev server.
   * "research" — fetch an external URL for design reference.
   */
  mode: 'inspect' | 'research';
  /** Target URL. Use "localhost:{port}/{path}" for inspect mode. */
  target: string;
  /** What to capture. "screenshot" is fastest; "dom" adds structure; "both" is richest. */
  capture: 'screenshot' | 'dom' | 'both';
  /** ProjectBrain path to write findings to. */
  memory_write?: string;
  /** Human-readable step name for status reporting. */
  name?: string;
}

/** Union of all pipeline step types. */
export type PipelineStep = PipelineCommandStep | PipelineBrowserStep;

/**
 * Pipeline YAML schema (v5.2).
 * Extends v4 YAML — existing pipeline files remain valid.
 * New fields: steps may include PipelineBrowserStep; command steps may include memory_read/memory_write.
 */
export interface PipelineDefinition {
  /** Pipeline display name. Required. */
  name: string;
  /** One-sentence description. Required. */
  description: string;
  /** Ordered sequence of steps. Required. At least 1 step. */
  steps: PipelineStep[];
  /** Pipeline version marker. "2" = v5.2 schema. Absent = v4. */
  version?: '2';
}

// ─── Memory Write Mechanism — the structured block format ─────────────────────

/**
 * MemoryUpdateBlock: the structure inside <!-- naksha-memory-update --> comments.
 *
 * The Stop hook parses these blocks from session transcripts and applies them
 * to .naksha/project.json using atomic mktemp+mv writes.
 */

/** Patch a specific ProjectBrain field via dot-notation path. */
export interface ProjectJsonPatch {
  type: 'project_json_patch';
  /**
   * Dot-notation path into ProjectBrain (e.g. "constraints.grid", "brand.primary").
   * Must resolve to a known field in the v5 schema. Unknown paths are rejected.
   */
  path: string;
  /** Value to set. Must match the field's TypeScript type. */
  value: unknown;
}

/** Append a finding to browser_findings (with FIFO cap enforcement). */
export interface BrowserFindingWrite {
  type: 'browser_finding';
  /** The full BrowserFinding object to append. */
  finding: BrowserFinding;
}

/** Union of all memory update types the Stop hook can process. */
export type MemoryUpdateBlock = ProjectJsonPatch | BrowserFindingWrite;

// ─── v5 schema version marker ─────────────────────────────────────────────────

/**
 * The schema_version value used in v5 project.json files.
 * Absent in v4; present in v5 after /naksha-init upgrade or re-init.
 */
export const NAKSHA_SCHEMA_VERSION = '5' as const;

/**
 * browser_findings array hard cap.
 * Enforced by the Stop hook and by /naksha-browse on every write.
 */
export const BROWSER_FINDINGS_CAP = 20 as const;

/**
 * Maximum age in days for browser_findings entries before eviction.
 * Entries older than this are removed on the next write to browser_findings.
 */
export const BROWSER_FINDINGS_MAX_AGE_DAYS = 30 as const;

/**
 * Number of browser_findings entries prepended as context to commands.
 * Most recent N entries only — prevents context window bloat.
 */
export const BROWSER_FINDINGS_CONTEXT_WINDOW = 5 as const;

/**
 * Maximum length of a memory.md decision summary (excluding timestamp + command).
 * Matches the constraint in docs/naksha-memory-schema.md.
 */
export const MEMORY_SUMMARY_MAX_CHARS = 100 as const;
