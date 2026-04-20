import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ExecutionResult } from "./executor.js";
import type { SpawnAgentOpts, AgentResult } from "./agent.js";
import type { ResolvedModuleEntry } from "./project-modules.js";
import type { ReviewArtifact } from "./review-artifacts.js";
import type { Job } from "./types.js";

import { spawnAgent, AGENT_PROFILES, resolveProfileForBackend } from "./agent.js";
import { buildAuthorPrompt, buildReviewerPrompt, buildSelectorPrompt, hasBlockingFindings, parseSelectedTaskResult } from "./isolated-workflow.js";
import { resolveRegisteredModule } from "./project-modules.js";
import { createTaskWorktree, cleanupTaskWorktree, getCurrentBranch } from "./worktree-manager.js";
import { writeTaskRunManifest, updateTaskRunManifest, type TaskRunManifest } from "./task-runs.js";
import { parseReviewArtifact, writeReviewArtifact } from "./review-artifacts.js";
import { getHeadCommit } from "./verify.js";
import { integrateTaskBranch } from "./isolated-integration.js";
import { IntegrationQueue } from "./integration-queue.js";

const exec = promisify(execFile);
const integrationQueue = new IntegrationQueue();

type SpawnAgentFn = (opts: SpawnAgentOpts) => { sessionId: string; result: Promise<AgentResult> };
type IntegrationResult = Awaited<ReturnType<typeof integrateTaskBranch>>;

export interface IsolatedWorkflowSummary extends Pick<ExecutionResult, "ok" | "stdout" | "costUsd" | "numTurns" | "durationMs" | "sessionId" | "runtime" | "triggerSource" | "timedOut"> {
  executionMode: "isolated-module";
  taskRunId: string;
  reviewRounds: number;
  integrationStatus: "integrated" | "manual" | "conflict" | "review_failed";
  error?: string;
}

interface SelectedTaskResult {
  project: string;
  taskText: string;
  claimId?: string;
}

export interface IsolatedExecutorDeps {
  resolveRegisteredModule?: typeof resolveRegisteredModule;
  createTaskWorktree?: typeof createTaskWorktree;
  getCurrentBranch?: typeof getCurrentBranch;
  spawnAgent?: SpawnAgentFn;
  writeTaskRunManifest?: typeof writeTaskRunManifest;
  updateTaskRunManifest?: typeof updateTaskRunManifest;
  writeReviewArtifact?: typeof writeReviewArtifact;
  getHeadCommit?: typeof getHeadCommit;
  isWorktreeClean?: (cwd: string) => Promise<boolean>;
  integrateTaskBranch?: typeof integrateTaskBranch;
  cleanupTaskWorktree?: typeof cleanupTaskWorktree;
  taskRunIdFactory?: () => string;
}

async function runAgent(
  spawn: SpawnAgentFn,
  opts: SpawnAgentOpts,
): Promise<{ sessionId: string; result: AgentResult }> {
  const session = spawn(opts);
  return {
    sessionId: session.sessionId,
    result: await session.result,
  };
}

function pickAuthorProfile(job: Job) {
  const baseProfile = AGENT_PROFILES.workSession;
  return {
    ...resolveProfileForBackend(baseProfile, "codex"),
    model: job.payload.model ?? baseProfile.model,
  };
}

function pickReviewerProfile(job: Job) {
  const baseProfile = AGENT_PROFILES.workSession;
  return {
    ...resolveProfileForBackend(baseProfile, "codex"),
    model: job.payload.reviewerModel ?? "gpt-5.4",
  };
}

function buildFixPrompt(task: SelectedTaskResult, artifact: ReviewArtifact): string {
  const blocking = artifact.findings.filter((finding) => finding.status === "open" && finding.priority <= 1);
  return [
    buildAuthorPrompt(task),
    "",
    "Address only these blocking review findings:",
    JSON.stringify(blocking, null, 2),
  ].join("\n");
}

async function defaultIsWorktreeClean(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await exec("git", ["status", "--porcelain"], { cwd });
    return stdout.trim() === "";
  } catch {
    return false;
  }
}

function summarizeText(parts: string[]): string {
  return parts.filter(Boolean).join("\n\n");
}

export async function runIsolatedTaskWorkflow(
  context: {
    job: Job;
    runtime: ExecutionResult["runtime"];
    triggerSource: ExecutionResult["triggerSource"];
  },
  deps: IsolatedExecutorDeps = {},
): Promise<IsolatedWorkflowSummary | null> {
  const repoRoot = context.job.payload.cwd ?? process.cwd();
  const spawn = deps.spawnAgent ?? spawnAgent;
  const resolveModule = deps.resolveRegisteredModule ?? resolveRegisteredModule;
  const createWorktree = deps.createTaskWorktree ?? createTaskWorktree;
  const currentBranch = deps.getCurrentBranch ?? getCurrentBranch;
  const writeManifest = deps.writeTaskRunManifest ?? writeTaskRunManifest;
  const updateManifestEntry = deps.updateTaskRunManifest ?? updateTaskRunManifest;
  const writeReview = deps.writeReviewArtifact ?? writeReviewArtifact;
  const getHead = deps.getHeadCommit ?? getHeadCommit;
  const isWorktreeClean = deps.isWorktreeClean ?? defaultIsWorktreeClean;
  const integrate = deps.integrateTaskBranch ?? integrateTaskBranch;
  const cleanupWorktree = deps.cleanupTaskWorktree ?? cleanupTaskWorktree;
  const taskRunId = deps.taskRunIdFactory ? deps.taskRunIdFactory() : `task-run-${Date.now().toString(36)}`;

  let totalCostUsd = 0;
  let totalTurns = 0;
  let totalDurationMs = 0;
  let latestSessionId: string | undefined;
  const outputs: string[] = [];

  const selector = await runAgent(spawn, {
    profile: pickAuthorProfile(context.job),
    prompt: buildSelectorPrompt(context.job.payload.message),
    cwd: repoRoot,
    disallowedTools: ["Edit", "Write", "MultiEdit"],
  });
  latestSessionId = selector.sessionId;
  totalCostUsd += selector.result.costUsd;
  totalTurns += selector.result.numTurns;
  totalDurationMs += selector.result.durationMs;
  outputs.push(selector.result.text);

  const selected = parseSelectedTaskResult(selector.result.text);
  if (!selected) {
    return {
      ok: false,
      stdout: selector.result.text,
      error: "Selector did not emit selected task JSON",
      costUsd: totalCostUsd,
      numTurns: totalTurns,
      durationMs: totalDurationMs,
      sessionId: latestSessionId,
      runtime: context.runtime,
      triggerSource: context.triggerSource,
      timedOut: false,
      executionMode: "isolated-module",
      taskRunId,
      reviewRounds: 0,
      integrationStatus: "review_failed",
    };
  }

  const module = await resolveModule(repoRoot, selected.project);
  if (!module || !module.exists) {
    return null;
  }

  const routedTask: SelectedTaskResult = { ...selected, claimId: undefined };

  const parentBaseBranch = module.type === "submodule" ? await currentBranch(repoRoot) : null;
  const worktree = await createWorktree({
    repoRoot,
    executionRepoRoot: module.absolutePath,
    moduleName: module.module,
    moduleType: module.type,
    taskId: routedTask.taskText.replace(/\W+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "task",
    taskRunId,
  });

  const manifest: TaskRunManifest = {
    taskRunId,
    taskId: routedTask.taskText.replace(/\W+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "task",
    taskText: routedTask.taskText,
    project: routedTask.project,
    module,
    repoRoot,
    executionRepoRoot: module.absolutePath,
    baseBranch: worktree.baseBranch,
    parentBaseBranch,
    taskBranch: worktree.taskBranch,
    worktreePath: worktree.worktreePath,
    status: "claimed",
    claimedAt: new Date().toISOString(),
    authorSessionId: null,
    reviewerSessionIds: [],
    fixSessionIds: [],
    reviewRounds: 0,
    integrationStatus: "pending",
  };
  await writeManifest(repoRoot, manifest);

  const author = await runAgent(spawn, {
    profile: pickAuthorProfile(context.job),
    prompt: buildAuthorPrompt(routedTask),
    cwd: worktree.worktreePath,
  });
  latestSessionId = author.sessionId;
  totalCostUsd += author.result.costUsd;
  totalTurns += author.result.numTurns;
  totalDurationMs += author.result.durationMs;
  outputs.push(author.result.text);
  await updateManifestEntry(repoRoot, taskRunId, { authorSessionId: author.sessionId, status: "author_done" });

  let reviewRounds = 0;
  let fixRounds = 0;
  let integrationStatus: IsolatedWorkflowSummary["integrationStatus"] = "review_failed";
  const reviewerSessionIds: string[] = [];
  const fixSessionIds: string[] = [];

  while (reviewRounds < 3) {
    reviewRounds += 1;
    const headCommit = await getHead(worktree.worktreePath);
    if (!headCommit) {
      await updateManifestEntry(repoRoot, taskRunId, { status: "review_failed", reviewRounds });
      return {
        ok: false,
        stdout: summarizeText(outputs),
        error: "Unable to resolve head commit before review",
        costUsd: totalCostUsd,
        numTurns: totalTurns,
        durationMs: totalDurationMs,
        sessionId: latestSessionId,
        runtime: context.runtime,
        triggerSource: context.triggerSource,
        timedOut: false,
        executionMode: "isolated-module",
        taskRunId,
        reviewRounds,
        integrationStatus: "review_failed",
      };
    }

    const reviewer = await runAgent(spawn, {
      profile: pickReviewerProfile(context.job),
      prompt: buildReviewerPrompt({
        project: selected.project,
        taskText: routedTask.taskText,
        taskRunId,
        round: reviewRounds,
        branch: worktree.taskBranch,
        baseBranch: worktree.baseBranch,
        headCommit,
      }),
      cwd: worktree.worktreePath,
      disallowedTools: ["Edit", "Write", "MultiEdit"],
    });
    latestSessionId = reviewer.sessionId;
    totalCostUsd += reviewer.result.costUsd;
    totalTurns += reviewer.result.numTurns;
    totalDurationMs += reviewer.result.durationMs;
    outputs.push(reviewer.result.text);

    const parsedArtifact = parseReviewArtifact(reviewer.result.text);
    if (!parsedArtifact) {
      await updateManifestEntry(repoRoot, taskRunId, { status: "review_failed", reviewRounds });
      return {
        ok: false,
        stdout: summarizeText(outputs),
        error: "Reviewer did not emit structured review artifact",
        costUsd: totalCostUsd,
        numTurns: totalTurns,
        durationMs: totalDurationMs,
        sessionId: latestSessionId,
        runtime: context.runtime,
        triggerSource: context.triggerSource,
        timedOut: false,
        executionMode: "isolated-module",
        taskRunId,
        reviewRounds,
        integrationStatus: "review_failed",
      };
    }

    const artifact: ReviewArtifact = {
      ...parsedArtifact,
      taskRunId,
      round: reviewRounds,
      branch: worktree.taskBranch,
      baseBranch: worktree.baseBranch,
      headCommit,
    };

    await writeReview(repoRoot, artifact);
    const clean = await isWorktreeClean(worktree.worktreePath);
    if (!clean) {
      await updateManifestEntry(repoRoot, taskRunId, { status: "review_failed", reviewRounds });
      return {
        ok: false,
        stdout: summarizeText(outputs),
        error: "Reviewer left worktree dirty",
        costUsd: totalCostUsd,
        numTurns: totalTurns,
        durationMs: totalDurationMs,
        sessionId: latestSessionId,
        runtime: context.runtime,
        triggerSource: context.triggerSource,
        timedOut: false,
        executionMode: "isolated-module",
        taskRunId,
        reviewRounds,
        integrationStatus: "review_failed",
      };
    }

    reviewerSessionIds.push(reviewer.sessionId);
    await updateManifestEntry(repoRoot, taskRunId, {
      reviewerSessionIds,
      reviewRounds,
    });

    if (!hasBlockingFindings(artifact)) {
      await updateManifestEntry(repoRoot, taskRunId, {
        status: "review_passed",
        integrationStatus: "queued",
        reviewRounds,
      });
      const integration = await integrationQueue.enqueue({ taskRunId, repoRoot }, async () =>
        integrate({
          repoRoot,
          project: routedTask.project,
          moduleName: module.module,
          moduleType: module.type,
          executionRepoRoot: module.absolutePath,
          baseBranch: worktree.baseBranch,
          parentBaseBranch,
          taskBranch: worktree.taskBranch,
          taskText: routedTask.taskText,
          reviewRounds,
          totalDurationMs,
        }),
      );

      if (integration.status === "conflict") {
        await updateManifestEntry(repoRoot, taskRunId, {
          status: "integration_conflict",
          integrationStatus: "conflict",
          reviewRounds,
        });
        return {
          ok: false,
          stdout: summarizeText(outputs),
          error: integration.error,
          costUsd: totalCostUsd,
          numTurns: totalTurns,
          durationMs: totalDurationMs,
          sessionId: latestSessionId,
          runtime: context.runtime,
          triggerSource: context.triggerSource,
          timedOut: false,
          executionMode: "isolated-module",
          taskRunId,
          reviewRounds,
          integrationStatus: "conflict",
        };
      }

      await cleanupWorktree({
        executionRepoRoot: module.absolutePath,
        taskBranch: worktree.taskBranch,
        worktreePath: worktree.worktreePath,
      });
      await updateManifestEntry(repoRoot, taskRunId, {
        status: "cleaned",
        integrationStatus: "integrated",
        reviewRounds,
      });
      integrationStatus = "integrated";
      return {
        ok: true,
        stdout: summarizeText(outputs),
        costUsd: totalCostUsd,
        numTurns: totalTurns,
        durationMs: totalDurationMs,
        sessionId: latestSessionId,
        runtime: context.runtime,
        triggerSource: context.triggerSource,
        timedOut: false,
        executionMode: "isolated-module",
        taskRunId,
        reviewRounds,
        integrationStatus,
      };
    }

    if (fixRounds >= 2) {
      await updateManifestEntry(repoRoot, taskRunId, {
        status: "manual_intervention_required",
        integrationStatus: "manual",
        reviewRounds,
      });
      return {
        ok: false,
        stdout: summarizeText(outputs),
        error: "Blocking findings remain after 2 fix rounds",
        costUsd: totalCostUsd,
        numTurns: totalTurns,
        durationMs: totalDurationMs,
        sessionId: latestSessionId,
        runtime: context.runtime,
        triggerSource: context.triggerSource,
        timedOut: false,
        executionMode: "isolated-module",
        taskRunId,
        reviewRounds,
        integrationStatus: "manual",
      };
    }

    fixRounds += 1;
    const fix = await runAgent(spawn, {
      profile: pickAuthorProfile(context.job),
      prompt: buildFixPrompt(routedTask, artifact),
      cwd: worktree.worktreePath,
    });
    latestSessionId = fix.sessionId;
    totalCostUsd += fix.result.costUsd;
    totalTurns += fix.result.numTurns;
    totalDurationMs += fix.result.durationMs;
    outputs.push(fix.result.text);
    fixSessionIds.push(fix.sessionId);
    await updateManifestEntry(repoRoot, taskRunId, {
      fixSessionIds,
      reviewRounds,
    });
  }

  return {
    ok: false,
    stdout: summarizeText(outputs),
    error: "Review loop exited unexpectedly",
    costUsd: totalCostUsd,
    numTurns: totalTurns,
    durationMs: totalDurationMs,
    sessionId: latestSessionId,
    runtime: context.runtime,
    triggerSource: context.triggerSource,
    timedOut: false,
    executionMode: "isolated-module",
    taskRunId,
    reviewRounds,
    integrationStatus,
  };
}
