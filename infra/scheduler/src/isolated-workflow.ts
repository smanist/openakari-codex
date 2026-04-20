import type { Job } from "./types.js";
import type { ReviewArtifact } from "./review-artifacts.js";

export interface SelectedTaskResult {
  project: string;
  taskText: string;
  claimId?: string;
}

const SELECTED_TASK_START = "SELECTED_TASK_JSON_START";
const SELECTED_TASK_END = "SELECTED_TASK_JSON_END";
const ISOLATED_TRIGGER_PHRASES = [
  "use isolated mode",
  "use isolated workflow",
  "use code review",
  "with code review",
  "use local review loop",
];

function extractJsonBetweenMarkers(text: string, startMarker: string, endMarker: string): string | null {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return null;
  const raw = text.slice(start + startMarker.length, end).trim();
  return raw || null;
}

export function shouldUseIsolatedModuleWorkflow(job: Job): boolean {
  const message = job.payload.message;
  const normalized = message.toLowerCase();
  const matchesAutonomousWorkCycle =
    message.includes("autonomous work cycle SOP") && message.includes("Step 2: Select a task");
  const matchesExplicitOptIn = ISOLATED_TRIGGER_PHRASES.some((phrase) => normalized.includes(phrase));
  return matchesAutonomousWorkCycle || matchesExplicitOptIn;
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
    "SCHEDULER DIRECTIVE: Do NOT edit files, do NOT claim a task, do NOT commit, and do NOT push.",
    "Run /orient, select exactly one task, and then stop before claiming it.",
    `Return the result between markers ${SELECTED_TASK_START} and ${SELECTED_TASK_END} as JSON: {"project":"<project>","taskText":"<task>"}.`,
  ].join("\n");
}

export function buildAuthorPrompt(task: SelectedTaskResult): string {
  return [
    `You are executing a pre-selected task for project ${task.project}.`,
    task.claimId
      ? "Do NOT run /orient and do NOT claim a task."
      : "Do NOT run /orient.",
    task.claimId
      ? "This task is already selected and claimed. Begin with scope classification, then execute, compound, and close."
      : "This task is already selected. Claim it first if the claim API is available, then begin scope classification, execute, compound, and close.",
    `Selected task: ${task.taskText}`,
    task.claimId ? `Claim ID: ${task.claimId}` : "",
  ].filter(Boolean).join("\n");
}

export function buildReviewerPrompt(opts: {
  project: string;
  taskText: string;
  taskRunId: string;
  round: number;
  branch: string;
  baseBranch: string;
  headCommit: string;
}): string {
  const artifactTemplate = JSON.stringify({
    taskRunId: opts.taskRunId,
    round: opts.round,
    branch: opts.branch,
    baseBranch: opts.baseBranch,
    headCommit: opts.headCommit,
    status: "approved",
    blockingPolicy: "p0-p1",
    findings: [
      {
        id: "finding-1",
        priority: 2,
        title: "Short title",
        body: "Concrete explanation",
        file: "path/to/file.ts",
        line: 1,
        status: "open",
      },
    ],
  });

  return [
    `Review the changes on branch ${opts.branch} against ${opts.baseBranch} for project ${opts.project}.`,
    "This is a reviewer-only session. Do not edit files.",
    "Primary task under review:",
    opts.taskText,
    'Return findings-first JSON between REVIEW_ARTIFACT_JSON_START and REVIEW_ARTIFACT_JSON_END.',
    `Emit exactly one JSON object matching this schema template: ${artifactTemplate}`,
    "Preserve taskRunId, round, branch, baseBranch, headCommit, and blockingPolicy exactly as provided.",
    'Use blockingPolicy "p0-p1". Only P0-P1 findings block integration; P2-P3 are advisory.',
  ].join("\n");
}

export function hasBlockingFindings(artifact: ReviewArtifact): boolean {
  return artifact.findings.some((finding) => finding.status === "open" && finding.priority <= 1);
}
