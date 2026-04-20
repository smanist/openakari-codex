import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface CreateTaskWorktreeOpts {
  repoRoot: string;
  executionRepoRoot: string;
  moduleName: string;
  moduleType: "submodule" | "local-scratch";
  taskId: string;
  taskRunId: string;
}

export interface CreatedTaskWorktree {
  baseBranch: string;
  taskBranch: string;
  worktreePath: string;
}

function buildTaskBranch(moduleName: string, taskId: string): string {
  return `codex/${moduleName}/${taskId}`;
}

function buildWorktreePath(repoRoot: string, moduleName: string, taskId: string, taskRunId: string): string {
  return join(repoRoot, "modules", ".worktrees", moduleName, `${taskId}-${taskRunId}`);
}

function isBranchAlreadyExistsError(error: unknown): error is { stderr?: string } {
  const branchExistsPattern = /a branch named .* already exists/;
  return (
    (error instanceof Error && branchExistsPattern.test(error.message)) ||
    (typeof error === "object" && error !== null && "stderr" in error &&
      typeof (error as { stderr?: unknown }).stderr === "string" &&
      branchExistsPattern.test((error as { stderr: string }).stderr))
  );
}

function parseWorktreeList(stdout: string): Array<{ worktreePath: string; branch?: string }> {
  const entries: Array<{ worktreePath: string; branch?: string }> = [];
  let current: { worktreePath?: string; branch?: string } = {};

  for (const line of stdout.split("\n")) {
    if (!line.trim()) {
      if (current.worktreePath) {
        entries.push({ worktreePath: current.worktreePath, branch: current.branch });
      }
      current = {};
      continue;
    }

    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) continue;
    const key = line.slice(0, spaceIndex);
    const value = line.slice(spaceIndex + 1);

    if (key === "worktree") current.worktreePath = value;
    if (key === "branch") current.branch = value.replace(/^refs\/heads\//, "");
  }

  if (current.worktreePath) {
    entries.push({ worktreePath: current.worktreePath, branch: current.branch });
  }

  return entries;
}

async function findExistingWorktreeForBranch(cwd: string, taskBranch: string): Promise<string | null> {
  const { stdout } = await exec("git", ["worktree", "list", "--porcelain"], { cwd });
  const match = parseWorktreeList(stdout).find((entry) => entry.branch === taskBranch);
  return match?.worktreePath ?? null;
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  return stdout.trim();
}

export async function createTaskWorktree(opts: CreateTaskWorktreeOpts): Promise<CreatedTaskWorktree> {
  const baseBranch = await getCurrentBranch(opts.executionRepoRoot);
  const taskBranch = buildTaskBranch(opts.moduleName, opts.taskId);
  const worktreePath = buildWorktreePath(opts.repoRoot, opts.moduleName, opts.taskId, opts.taskRunId);

  try {
    await exec(
      "git",
      ["worktree", "add", "-b", taskBranch, worktreePath, baseBranch],
      { cwd: opts.executionRepoRoot },
    );
  } catch (error) {
    if (!isBranchAlreadyExistsError(error)) {
      throw error;
    }

    const existingWorktreePath = await findExistingWorktreeForBranch(opts.executionRepoRoot, taskBranch);
    if (existingWorktreePath) {
      return { baseBranch, taskBranch, worktreePath: existingWorktreePath };
    }

    await exec(
      "git",
      ["worktree", "add", worktreePath, taskBranch],
      { cwd: opts.executionRepoRoot },
    );
  }

  return { baseBranch, taskBranch, worktreePath };
}

export async function cleanupTaskWorktree(opts: {
  executionRepoRoot: string;
  taskBranch: string;
  worktreePath: string;
}): Promise<void> {
  await exec("git", ["worktree", "remove", opts.worktreePath, "--force"], { cwd: opts.executionRepoRoot });
  await exec("git", ["branch", "-D", opts.taskBranch], { cwd: opts.executionRepoRoot });
}
