import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AgentResult } from "./agent.js";
import type { ResolvedModuleEntry } from "./project-modules.js";
import type { ReviewArtifact } from "./review-artifacts.js";
import type { Job } from "./types.js";

import { runIsolatedTaskWorkflow } from "./isolated-executor.js";

function createJob(): Job {
  return {
    id: "job-1",
    name: "test-job",
    schedule: { kind: "every", everyMs: 60_000 },
    payload: {
      message: "You MUST complete ALL 5 steps of the autonomous work cycle SOP at docs/sops/autonomous-work-cycle.md: Step 1: Run /orient. Step 2: Select a task.",
      cwd: "/repo",
      model: "gpt-5.3",
      reviewerModel: "gpt-5.4",
    },
    enabled: true,
    createdAtMs: Date.now(),
    state: {
      nextRunAtMs: null,
      lastRunAtMs: null,
      lastStatus: null,
      lastError: null,
      lastDurationMs: null,
      runCount: 0,
    },
  };
}

function makeResult(text: string, sessionId: string): { sessionId: string; result: Promise<AgentResult> } {
  return {
    sessionId,
    result: Promise.resolve({
      text,
      costUsd: 0.1,
      numTurns: 2,
      durationMs: 1000,
      timedOut: false,
    }),
  };
}

describe("isolated-executor", () => {
  const moduleEntry: ResolvedModuleEntry = {
    project: "dymad_dev",
    module: "dymad_dev",
    path: "modules/dymad_dev",
    absolutePath: "/repo/modules/dymad_dev",
    type: "submodule",
    exists: true,
  };

  let spawnAgent: ReturnType<typeof vi.fn>;
  let writeManifest: ReturnType<typeof vi.fn>;
  let updateManifest: ReturnType<typeof vi.fn>;
  let writeReviewArtifact: ReturnType<typeof vi.fn>;
  let cleanupTaskWorktree: ReturnType<typeof vi.fn>;
  let integrateTaskBranch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spawnAgent = vi.fn();
    writeManifest = vi.fn().mockResolvedValue(undefined);
    updateManifest = vi.fn().mockImplementation(async (_repoRoot, _taskRunId, patch) => patch);
    writeReviewArtifact = vi.fn().mockResolvedValue(undefined);
    cleanupTaskWorktree = vi.fn().mockResolvedValue(undefined);
    integrateTaskBranch = vi.fn().mockResolvedValue({ status: "integrated" });
  });

  it("runs selector, author, review, and integration for advisory-only review", async () => {
    const review: ReviewArtifact = {
      taskRunId: "run-1",
      round: 1,
      branch: "codex/dymad_dev/task-abc",
      baseBranch: "feat_dev",
      headCommit: "abc123",
      status: "approved",
      blockingPolicy: "p0-p1",
      findings: [
        { id: "f1", priority: 2, title: "note", body: "advisory", file: "a.ts", status: "open" },
      ],
    };

    spawnAgent
      .mockReturnValueOnce(makeResult(`
SELECTED_TASK_JSON_START
{"project":"dymad_dev","taskText":"Implement isolated execution","claimId":"claim-123"}
SELECTED_TASK_JSON_END
`, "selector-1"))
      .mockReturnValueOnce(makeResult("author complete", "author-1"))
      .mockReturnValueOnce(makeResult(`
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(review)}
REVIEW_ARTIFACT_JSON_END
`, "reviewer-1"));

    const result = await runIsolatedTaskWorkflow({
      job: createJob(),
      runtime: "codex_cli",
      triggerSource: "scheduler",
    }, {
      resolveRegisteredModule: vi.fn().mockResolvedValue(moduleEntry),
      createTaskWorktree: vi.fn().mockResolvedValue({
        baseBranch: "feat_dev",
        taskBranch: "codex/dymad_dev/task-abc",
        worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-1",
      }),
      getCurrentBranch: vi.fn().mockResolvedValue("main"),
      spawnAgent,
      writeTaskRunManifest: writeManifest,
      updateTaskRunManifest: updateManifest,
      writeReviewArtifact,
      getHeadCommit: vi.fn().mockResolvedValue("abc123"),
      isWorktreeClean: vi.fn().mockResolvedValue(true),
      integrateTaskBranch,
      cleanupTaskWorktree,
      taskRunIdFactory: () => "run-1",
    });

    expect(result.ok).toBe(true);
    expect(result.executionMode).toBe("isolated-module");
    expect(result.taskRunId).toBe("run-1");
    expect(result.reviewRounds).toBe(1);
    expect(result.integrationStatus).toBe("integrated");
    expect(integrateTaskBranch).toHaveBeenCalled();
    expect(cleanupTaskWorktree).toHaveBeenCalled();
  });

  it("normalizes reviewer metadata before writing artifacts", async () => {
    const reviewerPayload = {
      status: "approved",
      blockingPolicy: "p0-p1",
      findings: [
        { id: "f1", priority: 2, title: "note", body: "advisory", file: "a.ts", status: "open" },
      ],
    };

    spawnAgent
      .mockReturnValueOnce(makeResult(`
SELECTED_TASK_JSON_START
{"project":"dymad_dev","taskText":"Implement isolated execution","claimId":"claim-123"}
SELECTED_TASK_JSON_END
`, "selector-1"))
      .mockReturnValueOnce(makeResult("author complete", "author-1"))
      .mockReturnValueOnce(makeResult(`
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(reviewerPayload)}
REVIEW_ARTIFACT_JSON_END
`, "reviewer-1"));

    const result = await runIsolatedTaskWorkflow({
      job: createJob(),
      runtime: "codex_cli",
      triggerSource: "scheduler",
    }, {
      resolveRegisteredModule: vi.fn().mockResolvedValue(moduleEntry),
      createTaskWorktree: vi.fn().mockResolvedValue({
        baseBranch: "feat_dev",
        taskBranch: "codex/dymad_dev/task-abc",
        worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-1",
      }),
      getCurrentBranch: vi.fn().mockResolvedValue("main"),
      spawnAgent,
      writeTaskRunManifest: writeManifest,
      updateTaskRunManifest: updateManifest,
      writeReviewArtifact,
      getHeadCommit: vi.fn().mockResolvedValue("abc123"),
      isWorktreeClean: vi.fn().mockResolvedValue(true),
      integrateTaskBranch,
      cleanupTaskWorktree,
      taskRunIdFactory: () => "run-1",
    });

    expect(result.ok).toBe(true);
    expect(writeReviewArtifact).toHaveBeenCalledWith("/repo", {
      taskRunId: "run-1",
      round: 1,
      branch: "codex/dymad_dev/task-abc",
      baseBranch: "feat_dev",
      headCommit: "abc123",
      status: "approved",
      blockingPolicy: "p0-p1",
      findings: [
        { id: "f1", priority: 2, title: "note", body: "advisory", file: "a.ts", status: "open" },
      ],
    });
  });

  it("fails cleanly when the reviewer round cannot resolve HEAD", async () => {
    spawnAgent
      .mockReturnValueOnce(makeResult(`
SELECTED_TASK_JSON_START
{"project":"dymad_dev","taskText":"Implement isolated execution","claimId":"claim-123"}
SELECTED_TASK_JSON_END
`, "selector-1"))
      .mockReturnValueOnce(makeResult("author complete", "author-1"));

    const result = await runIsolatedTaskWorkflow({
      job: createJob(),
      runtime: "codex_cli",
      triggerSource: "scheduler",
    }, {
      resolveRegisteredModule: vi.fn().mockResolvedValue(moduleEntry),
      createTaskWorktree: vi.fn().mockResolvedValue({
        baseBranch: "feat_dev",
        taskBranch: "codex/dymad_dev/task-abc",
        worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-1",
      }),
      getCurrentBranch: vi.fn().mockResolvedValue("main"),
      spawnAgent,
      writeTaskRunManifest: writeManifest,
      updateTaskRunManifest: updateManifest,
      writeReviewArtifact,
      getHeadCommit: vi.fn().mockResolvedValue(null),
      isWorktreeClean: vi.fn().mockResolvedValue(true),
      integrateTaskBranch,
      cleanupTaskWorktree,
      taskRunIdFactory: () => "run-1",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Unable to resolve head commit before review");
    expect(writeReviewArtifact).not.toHaveBeenCalled();
    expect(spawnAgent).toHaveBeenCalledTimes(2);
  });

  it("runs one fix round when reviewer returns a blocking P1 finding", async () => {
    const firstReview: ReviewArtifact = {
      taskRunId: "run-1",
      round: 1,
      branch: "codex/dymad_dev/task-abc",
      baseBranch: "feat_dev",
      headCommit: "abc123",
      status: "changes_requested",
      blockingPolicy: "p0-p1",
      findings: [
        { id: "f1", priority: 1, title: "blocker", body: "must fix", file: "a.ts", status: "open" },
      ],
    };
    const secondReview: ReviewArtifact = {
      ...firstReview,
      round: 2,
      status: "approved",
      findings: [
        { ...firstReview.findings[0], status: "resolved" },
      ],
    };

    spawnAgent
      .mockReturnValueOnce(makeResult(`
SELECTED_TASK_JSON_START
{"project":"dymad_dev","taskText":"Implement isolated execution","claimId":"claim-123"}
SELECTED_TASK_JSON_END
`, "selector-1"))
      .mockReturnValueOnce(makeResult("author complete", "author-1"))
      .mockReturnValueOnce(makeResult(`
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(firstReview)}
REVIEW_ARTIFACT_JSON_END
`, "reviewer-1"))
      .mockReturnValueOnce(makeResult("fix complete", "fix-1"))
      .mockReturnValueOnce(makeResult(`
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(secondReview)}
REVIEW_ARTIFACT_JSON_END
`, "reviewer-2"));

    const result = await runIsolatedTaskWorkflow({
      job: createJob(),
      runtime: "codex_cli",
      triggerSource: "scheduler",
    }, {
      resolveRegisteredModule: vi.fn().mockResolvedValue(moduleEntry),
      createTaskWorktree: vi.fn().mockResolvedValue({
        baseBranch: "feat_dev",
        taskBranch: "codex/dymad_dev/task-abc",
        worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-1",
      }),
      getCurrentBranch: vi.fn().mockResolvedValue("main"),
      spawnAgent,
      writeTaskRunManifest: writeManifest,
      updateTaskRunManifest: updateManifest,
      writeReviewArtifact,
      getHeadCommit: vi.fn().mockResolvedValue("abc123"),
      isWorktreeClean: vi.fn().mockResolvedValue(true),
      integrateTaskBranch,
      cleanupTaskWorktree,
      taskRunIdFactory: () => "run-1",
    });

    expect(result.ok).toBe(true);
    expect(result.reviewRounds).toBe(2);
    expect(result.integrationStatus).toBe("integrated");
    expect(spawnAgent).toHaveBeenCalledTimes(5);
  });

  it("stops after two fix rounds when blocking review findings remain", async () => {
    const blockingReview = (round: number): ReviewArtifact => ({
      taskRunId: "run-1",
      round,
      branch: "codex/dymad_dev/task-abc",
      baseBranch: "feat_dev",
      headCommit: "abc123",
      status: "changes_requested",
      blockingPolicy: "p0-p1",
      findings: [
        { id: `f${round}`, priority: 1, title: "blocker", body: "must fix", file: "a.ts", status: "open" },
      ],
    });

    spawnAgent
      .mockReturnValueOnce(makeResult(`
SELECTED_TASK_JSON_START
{"project":"dymad_dev","taskText":"Implement isolated execution","claimId":"claim-123"}
SELECTED_TASK_JSON_END
`, "selector-1"))
      .mockReturnValueOnce(makeResult("author complete", "author-1"))
      .mockReturnValueOnce(makeResult(`
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(blockingReview(1))}
REVIEW_ARTIFACT_JSON_END
`, "reviewer-1"))
      .mockReturnValueOnce(makeResult("fix 1 complete", "fix-1"))
      .mockReturnValueOnce(makeResult(`
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(blockingReview(2))}
REVIEW_ARTIFACT_JSON_END
`, "reviewer-2"))
      .mockReturnValueOnce(makeResult("fix 2 complete", "fix-2"))
      .mockReturnValueOnce(makeResult(`
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(blockingReview(3))}
REVIEW_ARTIFACT_JSON_END
`, "reviewer-3"));

    const result = await runIsolatedTaskWorkflow({
      job: createJob(),
      runtime: "codex_cli",
      triggerSource: "scheduler",
    }, {
      resolveRegisteredModule: vi.fn().mockResolvedValue(moduleEntry),
      createTaskWorktree: vi.fn().mockResolvedValue({
        baseBranch: "feat_dev",
        taskBranch: "codex/dymad_dev/task-abc",
        worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-1",
      }),
      getCurrentBranch: vi.fn().mockResolvedValue("main"),
      spawnAgent,
      writeTaskRunManifest: writeManifest,
      updateTaskRunManifest: updateManifest,
      writeReviewArtifact,
      getHeadCommit: vi.fn().mockResolvedValue("abc123"),
      isWorktreeClean: vi.fn().mockResolvedValue(true),
      integrateTaskBranch,
      cleanupTaskWorktree,
      taskRunIdFactory: () => "run-1",
    });

    expect(result.ok).toBe(false);
    expect(result.integrationStatus).toBe("manual");
    expect(result.reviewRounds).toBe(3);
    expect(integrateTaskBranch).not.toHaveBeenCalled();
    expect(cleanupTaskWorktree).not.toHaveBeenCalled();
  });
});
