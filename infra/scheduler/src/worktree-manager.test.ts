import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockExecFile = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}));

vi.mock("node:util", () => ({
  promisify: (fn: unknown) => fn,
}));

describe("worktree-manager", () => {
  beforeEach(() => {
    mockExecFile.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a root-repo worktree for local-scratch modules", async () => {
    const { createTaskWorktree } = await import("./worktree-manager.js");

    mockExecFile
      .mockResolvedValueOnce({ stdout: "main\n" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" });

    const result = await createTaskWorktree({
      repoRoot: "/repo",
      executionRepoRoot: "/repo",
      moduleName: "akari",
      moduleType: "local-scratch",
      taskId: "task-abc",
      taskRunId: "run-123",
    });

    expect(result).toEqual({
      baseBranch: "main",
      taskBranch: "codex/akari/task-abc",
      worktreePath: "/repo/modules/.worktrees/akari/task-abc-run-123",
    });
    expect(mockExecFile).toHaveBeenNthCalledWith(
      1,
      "git",
      ["rev-parse", "--abbrev-ref", "HEAD"],
      { cwd: "/repo" },
    );
    expect(mockExecFile).toHaveBeenNthCalledWith(
      2,
      "git",
      ["worktree", "add", "-b", "codex/akari/task-abc", "/repo/modules/.worktrees/akari/task-abc-run-123", "main"],
      { cwd: "/repo" },
    );
  });

  it("creates a submodule worktree from the submodule repo", async () => {
    const { createTaskWorktree } = await import("./worktree-manager.js");

    mockExecFile
      .mockResolvedValueOnce({ stdout: "feat_dev\n" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" });

    const result = await createTaskWorktree({
      repoRoot: "/repo",
      executionRepoRoot: "/repo/modules/dymad_dev",
      moduleName: "dymad_dev",
      moduleType: "submodule",
      taskId: "task-abc",
      taskRunId: "run-123",
    });

    expect(result).toEqual({
      baseBranch: "feat_dev",
      taskBranch: "codex/dymad_dev/task-abc",
      worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-123",
    });
    expect(mockExecFile).toHaveBeenNthCalledWith(
      1,
      "git",
      ["rev-parse", "--abbrev-ref", "HEAD"],
      { cwd: "/repo/modules/dymad_dev" },
    );
    expect(mockExecFile).toHaveBeenNthCalledWith(
      2,
      "git",
      ["worktree", "add", "-b", "codex/dymad_dev/task-abc", "/repo/modules/.worktrees/dymad_dev/task-abc-run-123", "feat_dev"],
      { cwd: "/repo/modules/dymad_dev" },
    );
  });

  it("reuses an existing worktree when the task branch already exists there", async () => {
    const { createTaskWorktree } = await import("./worktree-manager.js");

    const branchExistsError = Object.assign(new Error("branch exists"), {
      stderr: "fatal: a branch named 'codex/dymad_dev/task-abc' already exists\n",
    });

    mockExecFile
      .mockResolvedValueOnce({ stdout: "feat_dev\n" })
      .mockRejectedValueOnce(branchExistsError)
      .mockResolvedValueOnce({
        stdout: [
          "worktree /repo/modules/.worktrees/dymad_dev/task-abc-run-old",
          "HEAD abc123",
          "branch refs/heads/codex/dymad_dev/task-abc",
          "",
        ].join("\n"),
      });

    const result = await createTaskWorktree({
      repoRoot: "/repo",
      executionRepoRoot: "/repo/modules/dymad_dev",
      moduleName: "dymad_dev",
      moduleType: "submodule",
      taskId: "task-abc",
      taskRunId: "run-123",
    });

    expect(result).toEqual({
      baseBranch: "feat_dev",
      taskBranch: "codex/dymad_dev/task-abc",
      worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-old",
    });
    expect(mockExecFile).toHaveBeenNthCalledWith(
      3,
      "git",
      ["worktree", "list", "--porcelain"],
      { cwd: "/repo/modules/dymad_dev" },
    );
  });

  it("creates a new worktree from the existing branch when no prior worktree is attached", async () => {
    const { createTaskWorktree } = await import("./worktree-manager.js");

    const branchExistsError = Object.assign(new Error("branch exists"), {
      stderr: "fatal: a branch named 'codex/dymad_dev/task-abc' already exists\n",
    });

    mockExecFile
      .mockResolvedValueOnce({ stdout: "feat_dev\n" })
      .mockRejectedValueOnce(branchExistsError)
      .mockResolvedValueOnce({ stdout: "worktree /repo/modules/dymad_dev\nHEAD def456\nbranch refs/heads/feat_dev\n\n" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" });

    const result = await createTaskWorktree({
      repoRoot: "/repo",
      executionRepoRoot: "/repo/modules/dymad_dev",
      moduleName: "dymad_dev",
      moduleType: "submodule",
      taskId: "task-abc",
      taskRunId: "run-123",
    });

    expect(result).toEqual({
      baseBranch: "feat_dev",
      taskBranch: "codex/dymad_dev/task-abc",
      worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-123",
    });
    expect(mockExecFile).toHaveBeenNthCalledWith(
      4,
      "git",
      ["worktree", "add", "/repo/modules/.worktrees/dymad_dev/task-abc-run-123", "codex/dymad_dev/task-abc"],
      { cwd: "/repo/modules/dymad_dev" },
    );
  });

  it("removes a task worktree and deletes its branch", async () => {
    const { cleanupTaskWorktree } = await import("./worktree-manager.js");

    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" });

    await cleanupTaskWorktree({
      executionRepoRoot: "/repo/modules/dymad_dev",
      taskBranch: "codex/dymad_dev/task-abc",
      worktreePath: "/repo/modules/.worktrees/dymad_dev/task-abc-run-123",
    });

    expect(mockExecFile).toHaveBeenNthCalledWith(
      1,
      "git",
      ["worktree", "remove", "/repo/modules/.worktrees/dymad_dev/task-abc-run-123", "--force"],
      { cwd: "/repo/modules/dymad_dev" },
    );
    expect(mockExecFile).toHaveBeenNthCalledWith(
      2,
      "git",
      ["branch", "-D", "codex/dymad_dev/task-abc"],
      { cwd: "/repo/modules/dymad_dev" },
    );
  });
});
