/**
 * Slack integration stub.
 *
 * Openakari ships Slack integration as a reference implementation for agents to read,
 * not as an out-of-the-box supported integration.
 *
 * See `infra/scheduler/reference-implementations/slack/`.
 */

import type { ApprovalItem } from "./notify.js";
import type { ExecutionResult } from "./executor.js";
import type { Job } from "./types.js";

export type AkariCommandInput = Record<string, unknown>;
export type AkariCommandResult = {
  ok: boolean;
  response: string;
};

function hint(): void {
  // Keep logs short: this can be called in hot paths.
  // Intentionally not throwing: scheduler should run without Slack.
  console.log("[slack] Slack integration is disabled in openakari (reference only). See infra/scheduler/reference-implementations/slack/");
}

export function isConfigured(): boolean {
  return false;
}

export function setBotUserId(_id: string): void {
  // no-op
}

export async function startSlackBot(_opts: Record<string, unknown>): Promise<void> {
  hint();
}

export async function stopSlackBot(): Promise<void> {
  // no-op
}

export async function dm(_text: string): Promise<string | undefined> {
  // no-op
  return undefined;
}

export async function dmThread(_threadTs: string, _text: string): Promise<void> {
  // no-op
}

export async function dmBlocks(_blocks: unknown[], _fallbackText: string): Promise<void> {
  // no-op
}

export async function dmFiles(_files: unknown[], _text?: string): Promise<void> {
  // no-op
}

export async function dmThreadFiles(_threadTs: string, _files: unknown[], _text?: string): Promise<void> {
  // no-op
}

export async function channelFiles(_channel: string, _files: unknown[], _text?: string): Promise<void> {
  // no-op
}

export async function resolveDisplayName(userId: string): Promise<string> {
  return userId;
}

export async function resolveThreadUserNames<T extends { user?: string }>(messages: T[]): Promise<T[]> {
  return messages;
}

export function gracefulRestartMessage(_runningCount: number): string {
  return "Scheduler restart requested (Slack integration disabled in openakari).";
}

export function startupMessage(): string {
  return "Scheduler started (Slack integration disabled in openakari).";
}

export async function handleAkariCommand(_input: AkariCommandInput): Promise<AkariCommandResult> {
  hint();
  return { ok: false, response: "Slack integration is reference-only in openakari." };
}

export async function handleBotChannelJoin(): Promise<void> {
  // no-op
}

export function setPersistenceDir(_dir: string | null): void {
  // no-op
}

// ── Notifications (no-op) ────────────────────────────────────────────────────

export async function notifyBotStarted(): Promise<void> {}
export async function notifySessionStarted(
  _jobName: string,
  _runId: string,
): Promise<{ channel: string; threadTs: string } | null> {
  return null;
}
export async function notifySessionComplete(
  _job: Job,
  _result: ExecutionResult,
  _approvals: ApprovalItem[],
  _threadTs?: string,
): Promise<void> {}
export async function notifyPendingApprovals(_dir: string): Promise<void> {}
export async function notifyBudgetBlocked(_jobName: string, _reason: string): Promise<void> {}
export async function notifyEvolution(_description: string): Promise<void> {}
export async function notifyGracefulRestart(): Promise<void> {}

export async function notifyFleetCompletion(): Promise<void> {}
export async function notifyFleetEscalation(): Promise<void> {}
export async function notifyFleetDrain(): Promise<void> {}
export async function notifyFleetStarvation(): Promise<void> {}
export async function notifyFleetLowUtilization(): Promise<void> {}
export async function notifyFleetStatus(): Promise<void> {}

export function formatThreadMessages(): string {
  return "";
}
