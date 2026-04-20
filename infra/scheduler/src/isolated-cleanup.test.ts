import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

const cleanupTaskWorktreeMock = vi.fn();

vi.mock("./worktree-manager.js", () => ({
  cleanupTaskWorktree: cleanupTaskWorktreeMock,
}));

describe("isolated-cleanup", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "isolated-cleanup-"));
    await mkdir(join(repoRoot, ".scheduler", "task-runs"), { recursive: true });
    await mkdir(join(repoRoot, ".scheduler", "reviews"), { recursive: true });
    cleanupTaskWorktreeMock.mockReset();
    cleanupTaskWorktreeMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes stale cleaned task runs and review artifacts", async () => {
    const claimedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const manifest = {
      taskRunId: "run-1",
      taskId: "task-1",
      taskText: "Task 1",
      project: "dymad_dev",
      module: {
        project: "dymad_dev",
        module: "dymad_dev",
        path: "modules/dymad_dev",
        absolutePath: join(repoRoot, "modules", "dymad_dev"),
        type: "submodule",
        exists: true,
      },
      repoRoot,
      executionRepoRoot: join(repoRoot, "modules", "dymad_dev"),
      baseBranch: "main",
      parentBaseBranch: "main",
      taskBranch: "codex/dymad_dev/task-1",
      worktreePath: join(repoRoot, "modules", ".worktrees", "dymad_dev", "task-1-run-1"),
      status: "cleaned",
      claimedAt,
      authorSessionId: "author-1",
      reviewerSessionIds: ["review-1"],
      fixSessionIds: [],
      reviewRounds: 1,
      integrationStatus: "integrated",
    };
    await writeFile(join(repoRoot, ".scheduler", "task-runs", "run-1.json"), JSON.stringify(manifest, null, 2));
    await mkdir(join(repoRoot, ".scheduler", "reviews", "run-1"), { recursive: true });
    await writeFile(join(repoRoot, ".scheduler", "reviews", "run-1", "round-01.json"), "{}");

    const { cleanupStaleIsolatedTaskRuns } = await import("./isolated-cleanup.js");
    const result = await cleanupStaleIsolatedTaskRuns(repoRoot, { keepDays: 3 });

    expect(result.deleted).toEqual([{ taskRunId: "run-1", reason: "stale-completed" }]);
    expect(cleanupTaskWorktreeMock).toHaveBeenCalledWith({
      executionRepoRoot: manifest.executionRepoRoot,
      taskBranch: manifest.taskBranch,
      worktreePath: manifest.worktreePath,
    });
    await expect(readFile(join(repoRoot, ".scheduler", "task-runs", "run-1.json"), "utf-8")).rejects.toThrow();
    await expect(readFile(join(repoRoot, ".scheduler", "reviews", "run-1", "round-01.json"), "utf-8")).rejects.toThrow();
  });

  it("keeps stale manual intervention runs", async () => {
    const claimedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const manifest = {
      taskRunId: "run-2",
      taskId: "task-2",
      taskText: "Task 2",
      project: "dymad_dev",
      module: {
        project: "dymad_dev",
        module: "dymad_dev",
        path: "modules/dymad_dev",
        absolutePath: join(repoRoot, "modules", "dymad_dev"),
        type: "submodule",
        exists: true,
      },
      repoRoot,
      executionRepoRoot: join(repoRoot, "modules", "dymad_dev"),
      baseBranch: "main",
      parentBaseBranch: "main",
      taskBranch: "codex/dymad_dev/task-2",
      worktreePath: join(repoRoot, "modules", ".worktrees", "dymad_dev", "task-2-run-2"),
      status: "manual_intervention_required",
      claimedAt,
      authorSessionId: "author-2",
      reviewerSessionIds: ["review-2"],
      fixSessionIds: ["fix-2"],
      reviewRounds: 3,
      integrationStatus: "manual",
    };
    await writeFile(join(repoRoot, ".scheduler", "task-runs", "run-2.json"), JSON.stringify(manifest, null, 2));

    const { cleanupStaleIsolatedTaskRuns } = await import("./isolated-cleanup.js");
    const result = await cleanupStaleIsolatedTaskRuns(repoRoot, { keepDays: 3 });

    expect(result.deleted).toEqual([]);
    expect(result.kept).toEqual([{ taskRunId: "run-2", reason: "manual-follow-up-required" }]);
    expect(cleanupTaskWorktreeMock).not.toHaveBeenCalled();
  });

  it("can dry-run stale abandoned worktrees", async () => {
    const claimedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const manifest = {
      taskRunId: "run-3",
      taskId: "task-3",
      taskText: "Task 3",
      project: "dymad_dev",
      module: {
        project: "dymad_dev",
        module: "dymad_dev",
        path: "modules/dymad_dev",
        absolutePath: join(repoRoot, "modules", "dymad_dev"),
        type: "submodule",
        exists: true,
      },
      repoRoot,
      executionRepoRoot: join(repoRoot, "modules", "dymad_dev"),
      baseBranch: "main",
      parentBaseBranch: "main",
      taskBranch: "codex/dymad_dev/task-3",
      worktreePath: join(repoRoot, "modules", ".worktrees", "dymad_dev", "task-3-run-3"),
      status: "author_done",
      claimedAt,
      authorSessionId: "author-3",
      reviewerSessionIds: [],
      fixSessionIds: [],
      reviewRounds: 0,
      integrationStatus: "pending",
    };
    await writeFile(join(repoRoot, ".scheduler", "task-runs", "run-3.json"), JSON.stringify(manifest, null, 2));

    const { cleanupStaleIsolatedTaskRuns } = await import("./isolated-cleanup.js");
    const result = await cleanupStaleIsolatedTaskRuns(repoRoot, { keepDays: 3, dryRun: true });

    expect(result.deleted).toEqual([{ taskRunId: "run-3", reason: "stale-abandoned" }]);
    expect(cleanupTaskWorktreeMock).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(join(repoRoot, ".scheduler", "task-runs", "run-3.json"), "utf-8")).taskRunId).toBe("run-3");
  });
});
