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

function reviewArtifactPath(repoRoot: string, taskRunId: string, round: number): string {
  return join(repoRoot, ".scheduler", "reviews", taskRunId, `round-${String(round).padStart(2, "0")}.json`);
}

async function atomicWrite(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
  await rename(tmp, path);
}

export function parseReviewArtifact(text: string): ReviewArtifact | null {
  const startMarker = "REVIEW_ARTIFACT_JSON_START";
  const endMarker = "REVIEW_ARTIFACT_JSON_END";
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return null;

  const raw = text.slice(start + startMarker.length, end).trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ReviewArtifact;
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
