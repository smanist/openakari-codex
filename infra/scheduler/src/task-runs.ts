import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ResolvedModuleEntry } from "./project-modules.js";

export type TaskRunStatus =
  | "claimed"
  | "author_done"
  | "review_failed"
  | "review_passed"
  | "manual_intervention_required"
  | "integration_conflict"
  | "integrated"
  | "cleaned";

export type IntegrationStatus = "pending" | "queued" | "integrated" | "conflict" | "manual";

export interface TaskRunManifest {
  taskRunId: string;
  taskId: string;
  taskText: string;
  project: string;
  module: ResolvedModuleEntry;
  repoRoot: string;
  executionRepoRoot: string;
  baseBranch: string;
  parentBaseBranch?: string | null;
  taskBranch: string;
  worktreePath: string;
  status: TaskRunStatus;
  claimedAt: string;
  authorSessionId: string | null;
  reviewerSessionIds: string[];
  fixSessionIds: string[];
  reviewRounds: number;
  integrationStatus: IntegrationStatus;
}

function taskRunsDir(repoRoot: string): string {
  return join(repoRoot, ".scheduler", "task-runs");
}

function taskRunPath(repoRoot: string, taskRunId: string): string {
  return join(taskRunsDir(repoRoot), `${taskRunId}.json`);
}

async function atomicWrite(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
  await rename(tmp, path);
}

export async function writeTaskRunManifest(repoRoot: string, manifest: TaskRunManifest): Promise<void> {
  await atomicWrite(taskRunPath(repoRoot, manifest.taskRunId), manifest);
}

export async function readTaskRunManifest(repoRoot: string, taskRunId: string): Promise<TaskRunManifest> {
  const raw = await readFile(taskRunPath(repoRoot, taskRunId), "utf-8");
  return JSON.parse(raw) as TaskRunManifest;
}

export async function updateTaskRunManifest(
  repoRoot: string,
  taskRunId: string,
  patch: Partial<TaskRunManifest>,
): Promise<TaskRunManifest> {
  const current = await readTaskRunManifest(repoRoot, taskRunId);
  const next = { ...current, ...patch };
  await writeTaskRunManifest(repoRoot, next);
  return next;
}

export async function listTaskRunManifests(repoRoot: string): Promise<TaskRunManifest[]> {
  let entries: string[];
  try {
    entries = (await readdir(taskRunsDir(repoRoot))).filter((entry) => entry.endsWith(".json")).sort();
  } catch {
    return [];
  }

  const manifests = await Promise.all(
    entries.map(async (entry) => JSON.parse(await readFile(join(taskRunsDir(repoRoot), entry), "utf-8")) as TaskRunManifest),
  );
  return manifests;
}

export async function deleteTaskRunManifest(repoRoot: string, taskRunId: string): Promise<void> {
  await unlink(taskRunPath(repoRoot, taskRunId)).catch(() => undefined);
}
