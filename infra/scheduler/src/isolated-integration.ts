import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface IntegrateTaskBranchOpts {
  repoRoot: string;
  project: string;
  moduleName: string;
  moduleType: "submodule" | "local-scratch";
  executionRepoRoot: string;
  baseBranch: string;
  parentBaseBranch?: string | null;
  taskBranch: string;
  taskText: string;
  reviewRounds: number;
  totalDurationMs: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function markTaskCompleted(tasksPath: string, taskText: string, reviewRounds: number): Promise<void> {
  let content: string;
  try {
    content = await readFile(tasksPath, "utf-8");
  } catch {
    return;
  }

  const lineRe = new RegExp(`^- \\[ \\] ${escapeRegex(taskText)}$`, "m");
  if (!lineRe.test(content)) return;

  const completedLine = `- [x] ${taskText}`;
  const completedNote = `  Completed: ${new Date().toISOString().slice(0, 10)}. Integrated after ${reviewRounds} review round(s).`;
  const next = content.replace(lineRe, `${completedLine}\n${completedNote}`);
  await writeFile(tasksPath, next, "utf-8");
}

function buildFooter(taskText: string, durationMinutes: number, filesChanged: number): string {
  return [
    "Session-type: autonomous",
    `Duration: ${durationMinutes}`,
    `Task-selected: ${taskText}`,
    "Task-completed: yes",
    "Approvals-created: 0",
    `Files-changed: ${filesChanged}`,
    "Commits: 1",
    "Compound-actions: none",
    "Resources-consumed: none",
    "Budget-remaining: n/a",
  ].join("\n");
}

async function prependReadmeLog(readmePath: string, taskText: string, reviewRounds: number, totalDurationMs: number, filesChanged: number): Promise<void> {
  let content: string;
  try {
    content = await readFile(readmePath, "utf-8");
  } catch {
    return;
  }

  const marker = "\n## Log\n\n";
  const idx = content.indexOf(marker);
  if (idx === -1) return;

  const date = new Date().toISOString().slice(0, 10);
  const durationMinutes = Math.max(1, Math.round(totalDurationMs / 60_000));
  const entry = [
    `### ${date} (Integrated isolated task \`${taskText}\`)`,
    "",
    `Integrated isolated task \`${taskText}\` after ${reviewRounds} review round(s).`,
    "",
    buildFooter(taskText, durationMinutes, filesChanged),
    "",
  ].join("\n");

  const insertAt = idx + marker.length;
  const next = content.slice(0, insertAt) + entry + content.slice(insertAt);
  await writeFile(readmePath, next, "utf-8");
}

async function countStagedFiles(cwd: string): Promise<number> {
  try {
    const { stdout } = await exec("git", ["diff", "--cached", "--name-only"], { cwd });
    return stdout.split("\n").filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

async function commitCurrentIndex(cwd: string, message: string): Promise<void> {
  await exec("git", ["add", "-A"], { cwd });
  await exec("git", ["commit", "-m", message], { cwd });
}

export async function integrateTaskBranch(opts: IntegrateTaskBranchOpts): Promise<{ status: "integrated" } | { status: "conflict"; error: string }> {
  const tasksPath = join(opts.repoRoot, "projects", opts.project, "TASKS.md");
  const readmePath = join(opts.repoRoot, "projects", opts.project, "README.md");

  try {
    if (opts.moduleType === "submodule") {
      await exec("git", ["checkout", opts.baseBranch], { cwd: opts.executionRepoRoot });
      await exec("git", ["merge", "--squash", opts.taskBranch], { cwd: opts.executionRepoRoot });
      await commitCurrentIndex(opts.executionRepoRoot, `Integrate isolated task ${opts.taskText}`);

      await exec("git", ["checkout", opts.parentBaseBranch ?? "main"], { cwd: opts.repoRoot });
      await markTaskCompleted(tasksPath, opts.taskText, opts.reviewRounds);
      const filesChanged = await countStagedFiles(opts.repoRoot);
      await prependReadmeLog(readmePath, opts.taskText, opts.reviewRounds, opts.totalDurationMs, filesChanged || 1);
      await commitCurrentIndex(opts.repoRoot, `Update ${opts.moduleName} submodule for isolated task ${opts.taskText}`);
      return { status: "integrated" };
    }

    await exec("git", ["checkout", opts.baseBranch], { cwd: opts.executionRepoRoot });
    await exec("git", ["merge", "--squash", opts.taskBranch], { cwd: opts.executionRepoRoot });
    await markTaskCompleted(tasksPath, opts.taskText, opts.reviewRounds);
    const filesChanged = await countStagedFiles(opts.executionRepoRoot);
    await prependReadmeLog(readmePath, opts.taskText, opts.reviewRounds, opts.totalDurationMs, filesChanged || 1);
    await commitCurrentIndex(opts.executionRepoRoot, `Integrate isolated task ${opts.taskText}`);
    return { status: "integrated" };
  } catch (err) {
    return {
      status: "conflict",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
