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

export async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  return stdout.trim();
}

export async function createTaskWorktree(opts: CreateTaskWorktreeOpts): Promise<CreatedTaskWorktree> {
  const baseBranch = await getCurrentBranch(opts.executionRepoRoot);
  const taskBranch = buildTaskBranch(opts.moduleName, opts.taskId);
  const worktreePath = buildWorktreePath(opts.repoRoot, opts.moduleName, opts.taskId, opts.taskRunId);

  await exec(
    "git",
    ["worktree", "add", "-b", taskBranch, worktreePath, baseBranch],
    { cwd: opts.executionRepoRoot },
  );

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
