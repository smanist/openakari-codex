import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  writeTaskRunManifest,
  readTaskRunManifest,
  updateTaskRunManifest,
  listTaskRunManifests,
  type TaskRunManifest,
} from "./task-runs.js";

describe("task-runs", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "akari-task-run-test-"));
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  const manifest: TaskRunManifest = {
    taskRunId: "run-123",
    taskId: "task-abc",
    taskText: "Implement isolated module workflow",
    project: "dymad_dev",
    module: {
      project: "dymad_dev",
      module: "dymad_dev",
      path: "modules/dymad_dev",
      absolutePath: "/repo/modules/dymad_dev",
      type: "submodule",
      exists: true,
    },
    repoRoot: "/repo",
    executionRepoRoot: "/repo/modules/dymad_dev",
    baseBranch: "feat_dev",
    parentBaseBranch: "main",
    taskBranch: "codex/dymad_dev/task-abc",
    worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-123",
    status: "claimed",
    claimedAt: "2026-04-19T00:00:00.000Z",
    authorSessionId: null,
    reviewerSessionIds: [],
    fixSessionIds: [],
    reviewRounds: 0,
    integrationStatus: "pending",
  };

  it("writes and reads a task-run manifest", async () => {
    await writeTaskRunManifest(repoRoot, manifest);
    await expect(readTaskRunManifest(repoRoot, manifest.taskRunId)).resolves.toEqual(manifest);
  });

  it("updates a manifest atomically", async () => {
    await writeTaskRunManifest(repoRoot, manifest);
    await updateTaskRunManifest(repoRoot, manifest.taskRunId, {
      status: "review_passed",
      reviewRounds: 1,
      integrationStatus: "queued",
    });

    await expect(readTaskRunManifest(repoRoot, manifest.taskRunId)).resolves.toMatchObject({
      status: "review_passed",
      reviewRounds: 1,
      integrationStatus: "queued",
    });
  });

  it("lists manifests in lexical order", async () => {
    await writeTaskRunManifest(repoRoot, manifest);
    await writeTaskRunManifest(repoRoot, {
      ...manifest,
      taskRunId: "run-999",
      taskId: "task-zzz",
      taskText: "Later task",
      taskBranch: "codex/dymad_dev/task-zzz",
      worktreePath: "/repo/modules/.worktrees/dymad_dev/task-zzz-run-999",
    });

    const runs = await listTaskRunManifests(repoRoot);
    expect(runs.map((run) => run.taskRunId)).toEqual(["run-123", "run-999"]);
  });
});
