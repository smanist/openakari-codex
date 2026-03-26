/**
 * Shared task-parsing utilities for TASKS.md files.
 * Extracted from fleet-tasks.ts for reuse across the scheduler.
 */

// ── Tag patterns ─────────────────────────────────────────────────────────────

export const BLOCKED_RE = /\[blocked-by:\s*[^\]]+\]/i;
export const IN_PROGRESS_RE = /\[in-progress:\s*[^\]]+\]/i;
export const APPROVAL_NEEDED_RE = /\[approval-needed\]/i;
export const APPROVED_RE = /\[approved:\s*[^\]]+\]/i;
export const REQUIRES_FRONTIER_RE = /\[(?:requires-frontier|requires-opus)\]/i;
// Deprecated alias retained for back-compat with existing imports/tests.
export const REQUIRES_OPUS_RE = REQUIRES_FRONTIER_RE;
export const FLEET_ELIGIBLE_RE = /\[fleet-eligible\]/i;
export const ZERO_RESOURCE_RE = /\[zero-resource\]/i;
export const ESCALATE_RE = /\[escalate(?::\s*[^\]]+)?\]/i;

// ── Task line parsing ────────────────────────────────────────────────────────

export function isOpenTaskLine(line: string): boolean {
  return /^\s*-\s+\[ \]\s+/.test(line);
}

export function isIndentedContinuation(line: string): boolean {
  return /^\s{2,}/.test(line) && !isOpenTaskLine(line) && !/^\s*-\s+\[/.test(line);
}

export function extractTaskText(line: string): string {
  return line.replace(/^\s*-\s+\[ \]\s+/, "").trim();
}
