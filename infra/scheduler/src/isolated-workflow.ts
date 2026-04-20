import type { Job } from "./types.js";
import type { ReviewArtifact } from "./review-artifacts.js";

export interface SelectedTaskResult {
  project: string;
  taskText: string;
  claimId?: string;
}

const SELECTED_TASK_START = "SELECTED_TASK_JSON_START";
const SELECTED_TASK_END = "SELECTED_TASK_JSON_END";

function extractJsonBetweenMarkers(text: string, startMarker: string, endMarker: string): string | null {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return null;
  const raw = text.slice(start + startMarker.length, end).trim();
  return raw || null;
}

export function shouldUseIsolatedModuleWorkflow(job: Job): boolean {
  const message = job.payload.message;
  return message.includes("autonomous work cycle SOP") && message.includes("Step 2: Select a task");
}

export function parseSelectedTaskResult(text: string): SelectedTaskResult | null {
  const raw = extractJsonBetweenMarkers(text, SELECTED_TASK_START, SELECTED_TASK_END);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelectedTaskResult;
  } catch {
    return null;
  }
}

export function buildSelectorPrompt(basePrompt: string): string {
  return [
    basePrompt,
    "",
    "SCHEDULER DIRECTIVE: Do NOT edit files, do NOT commit, and do NOT push.",
    "Run /orient, select exactly one task, claim it, and then stop.",
    `Return the result between markers ${SELECTED_TASK_START} and ${SELECTED_TASK_END} as JSON: {"project":"<project>","taskText":"<task>","claimId":"<claim-id or omit>"}.`,
  ].join("\n");
}

export function buildAuthorPrompt(task: SelectedTaskResult): string {
  return [
    `You are executing a pre-selected task for project ${task.project}.`,
    "Do NOT run /orient and do NOT claim a task.",
    "This task is already selected and claimed. Begin with scope classification, then execute, compound, and close.",
    `Selected task: ${task.taskText}`,
    task.claimId ? `Claim ID: ${task.claimId}` : "",
  ].filter(Boolean).join("\n");
}

export function buildReviewerPrompt(opts: {
  project: string;
  taskText: string;
  branch: string;
  baseBranch: string;
}): string {
  return [
    `Review the changes on branch ${opts.branch} against ${opts.baseBranch} for project ${opts.project}.`,
    "This is a reviewer-only session. Do not edit files.",
    "Primary task under review:",
    opts.taskText,
    'Return findings-first JSON between REVIEW_ARTIFACT_JSON_START and REVIEW_ARTIFACT_JSON_END.',
    'Use blockingPolicy "p0-p1". Only P0-P1 findings block integration; P2-P3 are advisory.',
  ].join("\n");
}

export function hasBlockingFindings(artifact: ReviewArtifact): boolean {
  return artifact.findings.some((finding) => finding.status === "open" && finding.priority <= 1);
}
