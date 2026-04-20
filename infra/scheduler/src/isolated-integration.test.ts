import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const mockExecFile = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}));

vi.mock("node:util", () => ({
  promisify: (fn: unknown) => fn,
}));

describe("isolated-integration", () => {
  let repoRoot: string;

  beforeEach(async () => {
    mockExecFile.mockReset();
    repoRoot = await mkdtemp(join(tmpdir(), "akari-isolated-integration-"));
    await mkdir(join(repoRoot, "projects", "dymad_dev"), { recursive: true });
    await writeFile(
      join(repoRoot, "projects", "dymad_dev", "TASKS.md"),
      [
        "# Tasks",
        "",
        "- [ ] Implement isolated execution",
        "  Why: Needed for scheduler worktrees",
        "  Done when: Works",
        "",
      ].join("\n"),
    );
    await writeFile(
      join(repoRoot, "projects", "dymad_dev", "README.md"),
      [
        "# DyMAD Development",
        "",
        "## Log",
        "",
        "### 2026-04-16 (Previous entry)",
        "",
        "Earlier notes.",
        "",
      ].join("\n"),
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(repoRoot, { recursive: true, force: true });
  });

  it("integrates a local-scratch task branch and updates project bookkeeping", async () => {
    const { integrateTaskBranch } = await import("./isolated-integration.js");

    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // checkout
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // merge --squash
      .mockResolvedValueOnce({ stdout: "modules/akari/file.ts\nprojects/dymad_dev/TASKS.md\n", stderr: "" }) // staged files
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // commit

    const result = await integrateTaskBranch({
      repoRoot,
      project: "dymad_dev",
      moduleName: "akari",
      moduleType: "local-scratch",
      executionRepoRoot: repoRoot,
      baseBranch: "main",
      taskBranch: "codex/akari/task-abc",
      taskText: "Implement isolated execution",
      reviewRounds: 1,
      totalDurationMs: 42_000,
    });

    expect(result).toEqual({ status: "integrated" });
    expect(mockExecFile).toHaveBeenNthCalledWith(
      1,
      "git",
      ["checkout", "main"],
      { cwd: repoRoot },
    );
    expect(mockExecFile).toHaveBeenNthCalledWith(
      2,
      "git",
      ["merge", "--squash", "codex/akari/task-abc"],
      { cwd: repoRoot },
    );

    const tasks = await readFile(join(repoRoot, "projects", "dymad_dev", "TASKS.md"), "utf-8");
    expect(tasks).toContain("- [x] Implement isolated execution");

    const readme = await readFile(join(repoRoot, "projects", "dymad_dev", "README.md"), "utf-8");
    expect(readme).toContain("Integrated isolated task `Implement isolated execution`");
    expect(readme).toContain("Task-selected: Implement isolated execution");
  });

  it("integrates a submodule task branch, then commits the parent repo pointer update", async () => {
    const { integrateTaskBranch } = await import("./isolated-integration.js");

    const moduleRepo = join(repoRoot, "modules", "dymad_dev");
    await mkdir(moduleRepo, { recursive: true });

    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // submodule checkout
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // submodule merge
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // submodule add
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // submodule commit
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // parent checkout
      .mockResolvedValueOnce({ stdout: "modules/dymad_dev\nprojects/dymad_dev/README.md\n", stderr: "" }) // staged files
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // parent add
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // parent commit

    const result = await integrateTaskBranch({
      repoRoot,
      project: "dymad_dev",
      moduleName: "dymad_dev",
      moduleType: "submodule",
      executionRepoRoot: moduleRepo,
      baseBranch: "feat_dev",
      parentBaseBranch: "main",
      taskBranch: "codex/dymad_dev/task-abc",
      taskText: "Implement isolated execution",
      reviewRounds: 2,
      totalDurationMs: 84_000,
    });

    expect(result).toEqual({ status: "integrated" });
    expect(mockExecFile).toHaveBeenNthCalledWith(
      1,
      "git",
      ["checkout", "feat_dev"],
      { cwd: moduleRepo },
    );
    expect(mockExecFile).toHaveBeenNthCalledWith(
      5,
      "git",
      ["checkout", "main"],
      { cwd: repoRoot },
    );
  });

  it("returns conflict when squash merge fails", async () => {
    const { integrateTaskBranch } = await import("./isolated-integration.js");

    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockRejectedValueOnce(new Error("merge conflict"));

    const result = await integrateTaskBranch({
      repoRoot,
      project: "dymad_dev",
      moduleName: "akari",
      moduleType: "local-scratch",
      executionRepoRoot: repoRoot,
      baseBranch: "main",
      taskBranch: "codex/akari/task-abc",
      taskText: "Implement isolated execution",
      reviewRounds: 1,
      totalDurationMs: 42_000,
    });

    expect(result).toEqual({
      status: "conflict",
      error: "merge conflict",
    });
  });
});
