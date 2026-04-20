import { rm } from "node:fs/promises";

import { deleteReviewArtifacts } from "./review-artifacts.js";
import { deleteTaskRunManifest, listTaskRunManifests, type TaskRunManifest } from "./task-runs.js";
import { cleanupTaskWorktree } from "./worktree-manager.js";

export interface IsolatedCleanupOptions {
  keepDays?: number;
  dryRun?: boolean;
}

export interface IsolatedCleanupResult {
  deleted: Array<{ taskRunId: string; reason: "stale-completed" | "stale-abandoned" }>;
  kept: Array<{ taskRunId: string; reason: string }>;
  dryRun: boolean;
}

function classifyManifest(
  manifest: TaskRunManifest,
  cutoffMs: number,
): { delete: false; reason: string } | { delete: true; reason: "stale-completed" | "stale-abandoned" } {
  const claimedAtMs = Date.parse(manifest.claimedAt);
  if (!Number.isFinite(claimedAtMs)) {
    return { delete: false, reason: "invalid-claimedAt" };
  }
  if (claimedAtMs >= cutoffMs) {
    return { delete: false, reason: "within-keep-window" };
  }
  if (manifest.status === "manual_intervention_required" || manifest.status === "integration_conflict") {
    return { delete: false, reason: "manual-follow-up-required" };
  }
  if (manifest.status === "cleaned" || manifest.status === "integrated" || manifest.status === "review_failed") {
    return { delete: true, reason: "stale-completed" };
  }
  return { delete: true, reason: "stale-abandoned" };
}

export async function cleanupStaleIsolatedTaskRuns(
  repoRoot: string,
  opts: IsolatedCleanupOptions = {},
): Promise<IsolatedCleanupResult> {
  const keepDays = opts.keepDays ?? 3;
  const dryRun = opts.dryRun ?? false;
  const cutoffMs = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const manifests = await listTaskRunManifests(repoRoot);

  const result: IsolatedCleanupResult = {
    deleted: [],
    kept: [],
    dryRun,
  };

  for (const manifest of manifests) {
    const decision = classifyManifest(manifest, cutoffMs);
    if (!decision.delete) {
      result.kept.push({ taskRunId: manifest.taskRunId, reason: decision.reason });
      continue;
    }

    result.deleted.push({ taskRunId: manifest.taskRunId, reason: decision.reason });
    if (dryRun) continue;

    await cleanupTaskWorktree({
      executionRepoRoot: manifest.executionRepoRoot,
      taskBranch: manifest.taskBranch,
      worktreePath: manifest.worktreePath,
    }).catch(async () => {
      await rm(manifest.worktreePath, { recursive: true, force: true }).catch(() => undefined);
    });
    await deleteReviewArtifacts(repoRoot, manifest.taskRunId);
    await deleteTaskRunManifest(repoRoot, manifest.taskRunId);
  }

  return result;
}
