import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface ReviewFinding {
  id: string;
  priority: number;
  title: string;
  body: string;
  file: string;
  line?: number;
  status: "open" | "resolved" | "accepted-risk";
}

export interface ReviewArtifact {
  taskRunId: string;
  round: number;
  branch: string;
  baseBranch: string;
  headCommit: string;
  status: "approved" | "changes_requested" | "review_failed";
  blockingPolicy: "p0-p1";
  findings: ReviewFinding[];
}

export type ParsedReviewArtifact = Pick<ReviewArtifact, "status" | "blockingPolicy" | "findings"> &
  Partial<Pick<ReviewArtifact, "taskRunId" | "round" | "branch" | "baseBranch" | "headCommit">>;

function reviewArtifactPath(repoRoot: string, taskRunId: string, round: number): string {
  return join(repoRoot, ".scheduler", "reviews", taskRunId, `round-${String(round).padStart(2, "0")}.json`);
}

async function atomicWrite(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
  await rename(tmp, path);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFindingStatus(value: unknown): value is ReviewFinding["status"] {
  return value === "open" || value === "resolved" || value === "accepted-risk";
}

function isReviewStatus(value: unknown): value is ReviewArtifact["status"] {
  return value === "approved" || value === "changes_requested" || value === "review_failed";
}

function isBlockingPolicy(value: unknown): value is ReviewArtifact["blockingPolicy"] {
  return value === "p0-p1";
}

function isReviewFinding(value: unknown): value is ReviewFinding {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.priority === "number" &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.file === "string" &&
    (value.line === undefined || typeof value.line === "number") &&
    isFindingStatus(value.status)
  );
}

function isParsedReviewArtifact(value: unknown): value is ParsedReviewArtifact {
  return (
    isObject(value) &&
    isReviewStatus(value.status) &&
    isBlockingPolicy(value.blockingPolicy) &&
    Array.isArray(value.findings) &&
    value.findings.every(isReviewFinding)
  );
}

export function parseReviewArtifact(text: string): ParsedReviewArtifact | null {
  const startMarker = "REVIEW_ARTIFACT_JSON_START";
  const endMarker = "REVIEW_ARTIFACT_JSON_END";
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return null;

  const raw = text.slice(start + startMarker.length, end).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isParsedReviewArtifact(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeReviewArtifact(repoRoot: string, artifact: ReviewArtifact): Promise<void> {
  await atomicWrite(reviewArtifactPath(repoRoot, artifact.taskRunId, artifact.round), artifact);
}

export async function readReviewArtifact(repoRoot: string, taskRunId: string, round: number): Promise<ReviewArtifact> {
  const raw = await readFile(reviewArtifactPath(repoRoot, taskRunId, round), "utf-8");
  return JSON.parse(raw) as ReviewArtifact;
}

export async function deleteReviewArtifacts(repoRoot: string, taskRunId: string): Promise<void> {
  await rm(join(repoRoot, ".scheduler", "reviews", taskRunId), { recursive: true, force: true });
}
