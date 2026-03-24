import { describe, expect, it } from "vitest";

import {
  dmBlocks,
  notifyBudgetBlocked,
  notifyEvolution,
  notifyPendingApprovals,
  notifySessionComplete,
  notifySessionStarted,
  setPersistenceDir,
} from "./slack.js";
import type { ExecutionResult } from "./executor.js";
import type { Job } from "./types.js";

function makeJob(): Job {
  return {
    id: "job-1",
    name: "test-job",
    enabled: true,
    createdAtMs: Date.now(),
    schedule: { kind: "every", everyMs: 60_000 },
    payload: {
      message: "Run test session",
      cwd: "/tmp/repo",
    },
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

function makeResult(): ExecutionResult {
  return {
    ok: true,
    durationMs: 1000,
    exitCode: 0,
    stdout: "ok",
    backend: "codex",
    sessionId: "session-1",
  };
}

describe("openakari slack stub", () => {
  it("accepts Block Kit payloads with fallback text", async () => {
    await expect(
      dmBlocks([{ type: "section", text: { type: "mrkdwn", text: "hello" } }], "fallback"),
    ).resolves.toBeUndefined();
  });

  it("accepts scheduler notification arguments without throwing", async () => {
    const threadInfo = await notifySessionStarted("test-job", "session-1");
    expect(threadInfo).toBeNull();

    await expect(
      notifySessionComplete(makeJob(), makeResult(), [], "123.456"),
    ).resolves.toBeUndefined();
    await expect(notifyPendingApprovals("/tmp/repo")).resolves.toBeUndefined();
    await expect(notifyBudgetBlocked("test-job", "budget exhausted")).resolves.toBeUndefined();
    await expect(notifyEvolution("scheduler self-evolution")).resolves.toBeUndefined();
  });

  it("supports setting and clearing the living-message persistence directory", () => {
    expect(() => setPersistenceDir("/tmp/akari")).not.toThrow();
    expect(() => setPersistenceDir(null)).not.toThrow();
  });
});
