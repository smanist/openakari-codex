/** Executes an autonomous agent session via the unified agent spawner. */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Job } from "./types.js";
import { resolveBackend } from "./backend.js";
import { runtimeRouteForBackend, type RuntimeRoute } from "./runtime.js";
import { spawnAgent, AGENT_PROFILES, generateSessionId, resolveProfileForBackend } from "./agent.js";
import type { SDKMessage } from "./sdk.js";
import { notifySessionStarted, notifySessionComplete } from "./slack.js";
import { getPendingApprovals } from "./notify.js";
import { countMetrics } from "./metrics.js";
import { autoCommitOrphanedFiles } from "./auto-commit.js";
import { findActiveExperimentDirs, getHeadCommit, classifyUncommittedFiles } from "./verify.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Uncommitted file threshold above which a warning is logged at session start. */
export const UNCOMMITTED_FILE_WARNING_THRESHOLD = 50;

/**
 * Checks uncommitted file count and logs a warning if threshold is exceeded.
 * Extracted for testability.
 */
export async function checkUncommittedFileThreshold(cwd: string): Promise<void> {
  try {
    const { stdout: statusOutput } = await exec("git", ["status", "--porcelain"], { cwd });
    const uncommittedLines = statusOutput.split("\n").filter((line) => line.trim() !== "");
    if (uncommittedLines.length > UNCOMMITTED_FILE_WARNING_THRESHOLD) {
      console.warn(
        `[executor] WARNING: ${uncommittedLines.length} uncommitted files detected (threshold: ${UNCOMMITTED_FILE_WARNING_THRESHOLD}). ` +
          `Consider committing or cleaning up before starting a session.`
      );
    }
  } catch (err) {
    // Best-effort check — errors do not block the session
    console.error("[executor] Failed to check uncommitted file count:", err);
  }
}
import { decideTiers, injectTierDirectives, wasFullOrient } from "./orient-tier.js";
import { injectConventionModules } from "./convention-modules.js";
import { enqueuePushAndWait } from "./rebase-push.js";

const LOGS_DIR = new URL("../../../.scheduler/logs", import.meta.url).pathname;

export interface ExecutionResult {
  ok: boolean;
  durationMs: number;
  exitCode: number | null;
  stdout: string;
  error?: string;
  logFile?: string;
  costUsd?: number;
  numTurns?: number;
  runtime?: RuntimeRoute;
  timedOut?: boolean;
  sessionId?: string;
  triggerSource?: "scheduler" | "slack" | "manual" | "fleet";
  modelUsage?: Record<string, { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number; costUSD: number; contextWindow?: number; maxOutputTokens?: number }>;
  toolCounts?: Record<string, number>;
  orientTurns?: number;
  ranFullOrient?: boolean;
  injectedOrientTier?: "fast" | "full";
  injectedCompoundTier?: "fast" | "full";
  injectedRole?: string | null;
  headAfterAutoCommit?: string | null;
  sleepViolation?: string;
  stallViolation?: string;
  pushQueueResult?: "queued-success" | "queued-rebase-failed" | "direct-push" | "no-push-needed";
}

export async function executeJob(
  job: Job,
  triggerSource?: "scheduler" | "slack" | "manual",
): Promise<ExecutionResult> {
  const start = Date.now();
  const cwd = job.payload.cwd ?? process.cwd();
  const backend = resolveBackend({
    model: job.payload.model,
    requiredCapabilities: job.payload.requiredCapabilities,
  });
  const runtime = runtimeRouteForBackend(backend.name);

  let threadInfo: { channel: string; threadTs: string } | null = null;

  console.log(`[executor] Running job ${job.name} with ${runtime} runtime`);

  // Pre-session: auto-commit orphaned artifacts so the agent starts with a clean working tree.
  // Best-effort — errors are logged but do not block the session.
  // Discover running experiments so their output files are not committed prematurely.
  const activeExpDirs = await findActiveExperimentDirs(cwd).catch(() => [] as string[]);
  await autoCommitOrphanedFiles(cwd, activeExpDirs);

  // Check uncommitted file count and warn if threshold exceeded
  await checkUncommittedFileThreshold(cwd);

  // Capture HEAD after auto-commit so verification attributes only the agent's work,
  // not orphaned files from prior sessions (fixes attribution misalignment per
  // diagnosis-work-cycle-report-attribution-2026-02-23.md).
  const headAfterAutoCommit = await getHeadCommit(cwd);

  try {
    // Resolve agent profile: use payload.profile key if specified, else workSession
    const baseProfileKey = job.payload.profile as keyof typeof AGENT_PROFILES | undefined;
    const baseProfile = (baseProfileKey && AGENT_PROFILES[baseProfileKey]) ?? AGENT_PROFILES.workSession;
    // Apply backend-specific overrides (e.g. tighter limits for opencode/GLM-5)
    const backendAdjusted = resolveProfileForBackend(baseProfile, backend.name);
    const profile = {
      ...backendAdjusted,
      model: job.payload.model ?? backendAdjusted.model,
      maxDurationMs: job.payload.maxDurationMs ?? backendAdjusted.maxDurationMs,
    };

    let prompt = job.payload.message;

    // Pre-generate session ID so it can be injected into the prompt for task claiming
    const sessionId = generateSessionId(profile.label);

    // Orient/compound tier decision based on scheduler-tracked timestamps (ADR 0030)
    const tierDecision = decideTiers({
      lastFullOrientAt: job.state.lastFullOrientAt ?? null,
      lastFullCompoundAt: job.state.lastFullCompoundAt ?? null,
    });
    prompt = injectTierDirectives(prompt, tierDecision);

    // Inject convention modules based on task type
    prompt = injectConventionModules(prompt, job.payload.taskType);
    if (job.payload.taskType) {
      console.log(`[executor] Convention modules injected for task type: ${job.payload.taskType}`);
    }

    // Inject session ID so the agent can claim tasks via the scheduler API
    prompt = `SCHEDULER DIRECTIVE: SESSION_ID=${sessionId}\n` + prompt;

    // Inject specialist role directive if configured on the job
    const injectedRole = job.payload.role ?? null;
    if (injectedRole) {
      const roleProject = job.payload.roleProject;
      const roleDirective = roleProject
        ? `SCHEDULER DIRECTIVE: ROLE=${injectedRole} PROJECT=${roleProject}. Use /orient ${roleProject}`
        : `SCHEDULER DIRECTIVE: ROLE=${injectedRole}`;
      prompt = roleDirective + "\n" + prompt;
      console.log(`[executor] Role directive: ${injectedRole}${roleProject ? ` (project: ${roleProject})` : ""}`);
    }

    const { result } = spawnAgent({
      profile,
      prompt,
      cwd,
      sessionId,
      requiredCapabilities: job.payload.requiredCapabilities,
      jobId: job.id,
      jobName: job.name,
      onMessage: (msg) => {
        // Stream assistant text to stdout for live monitoring
        if (msg.type === "assistant") {
          const content = msg.message;
          if (content?.content) {
            for (const block of content.content) {
              if (block.type === "text" && block.text) process.stdout.write(block.text);
            }
          }
        }
      },
    });

    threadInfo = await notifySessionStarted(job.name, sessionId);

    const agentResult = await result;

    // Write log file
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const logFile = join(LOGS_DIR, `${job.name}-${ts}.log`);
    try {
      await mkdir(LOGS_DIR, { recursive: true });
      await writeFile(
        logFile,
        `# ${job.name} — ${new Date().toISOString()}\n# Runtime: ${runtime}\n# Duration: ${Math.round(agentResult.durationMs / 1000)}s, Cost: $${agentResult.costUsd.toFixed(4)}, Turns: ${agentResult.numTurns}\n\n## output\n${agentResult.text}\n`,
      );
    } catch { /* best-effort logging */ }

    // Post-session: auto-commit any orphaned files before push.
    // Sessions that timeout or exit without committing leave orphaned files.
    // This ensures files reach origin even when agent forgets or times out.
    const postSessionActiveDirs = await findActiveExperimentDirs(cwd);
    const postAutoCommit = await autoCommitOrphanedFiles(cwd, postSessionActiveDirs);
    if (postAutoCommit) {
      console.log(`[auto-commit] Post-session committed ${postAutoCommit.filesCommitted} orphaned file(s)`);
    }

    // Post-session: rebase and push any unpushed commits.
    // The agent may have committed but failed to push (timeout, conflict).
    // This ensures work reaches origin even under concurrent sessions.
    // See architecture/concurrency-safety.md §3 Race 3.
    const pushResult = await enqueuePushAndWait(cwd, sessionId, { priority: "opus" });
    if (pushResult.status === "branch-fallback") {
      console.log(`[rebase-push] Conflict detected — pushed to branch ${pushResult.branch}`);
    } else if (pushResult.status === "error") {
      console.error(`[rebase-push] Error: ${pushResult.error}`);
    } else if (pushResult.status === "pushed") {
      console.log(`[rebase-push] Successfully rebased and pushed to origin`);
    }

    const hasViolation = !!(agentResult.sleepViolation || agentResult.stallViolation);
    const execResult: ExecutionResult = {
      ok: !hasViolation,
      durationMs: agentResult.durationMs,
      exitCode: hasViolation ? 1 : 0,
      stdout: agentResult.text,
      error: agentResult.sleepViolation
        ? `Sleep violation: ${agentResult.sleepViolation.slice(0, 200)}`
        : agentResult.stallViolation
          ? `Stall violation: shell tool call >120s: ${agentResult.stallViolation.slice(0, 200)}`
          : undefined,
      logFile,
      costUsd: agentResult.costUsd,
      numTurns: agentResult.numTurns,
      runtime,
      timedOut: agentResult.timedOut,
      sessionId,
      modelUsage: agentResult.modelUsage,
      toolCounts: agentResult.toolCounts,
      orientTurns: agentResult.orientTurns,
      ranFullOrient: wasFullOrient(agentResult.orientTurns),
      injectedOrientTier: tierDecision.orientTier,
      injectedCompoundTier: tierDecision.compoundTier,
      injectedRole,
      headAfterAutoCommit,
      sleepViolation: agentResult.sleepViolation,
      stallViolation: agentResult.stallViolation,
      triggerSource: triggerSource ?? "scheduler",
      pushQueueResult: pushResult.pushQueueResult,
    };

    const approvals = await getPendingApprovals(cwd).catch(() => [] as never[]);
    await notifySessionComplete(job, execResult, approvals, threadInfo?.threadTs);

    return execResult;
  } catch (err) {
    const durationMs = Date.now() - start;

    // Best-effort error log
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const logFile = join(LOGS_DIR, `${job.name}-${ts}.log`);
    const errMsg = err instanceof Error ? err.message : String(err);
    try {
      await mkdir(LOGS_DIR, { recursive: true });
      await writeFile(
        logFile,
        `# ${job.name} — ${new Date().toISOString()}\n# Runtime: ${runtime}\n# Duration: ${Math.round(durationMs / 1000)}s, ERROR\n\n## error\n${errMsg}\n`,
      );
    } catch { /* best-effort logging */ }

    const execResult: ExecutionResult = {
      ok: false,
      durationMs,
      exitCode: 1,
      stdout: "",
      error: errMsg,
      logFile,
      runtime,
      headAfterAutoCommit,
      triggerSource: triggerSource ?? "scheduler",
    };

    const approvals = await getPendingApprovals(cwd).catch(() => [] as never[]);
    await notifySessionComplete(job, execResult, approvals, threadInfo?.threadTs);

    return execResult;
  }
}
