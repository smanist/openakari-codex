import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { stopScheduler, type StopSchedulerResult } from "./cli.js";

describe("stopScheduler", () => {
  let baseDir: string;
  let lockfilePath: string;

  beforeEach(() => {
    baseDir = join(tmpdir(), `akari-stop-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(baseDir, { recursive: true });
    lockfilePath = join(baseDir, "scheduler.pid");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends SIGTERM to the PID from the lockfile", async () => {
    writeFileSync(lockfilePath, "12345");
    const killFn = vi.fn<(pid: number, signal?: NodeJS.Signals | number) => void>();
    const isPidAlive = vi
      .fn<(pid: number) => boolean>()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const sleepFn = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

    const result = await stopScheduler({
      lockfilePath,
      killFn,
      isPidAlive,
      pollIntervalMs: 1,
      waitTimeoutMs: 10,
      sleepFn,
    });

    expect(result).toEqual<StopSchedulerResult>({
      stopped: true,
      pid: 12345,
      message: "Scheduler PID 12345 stopped.",
    });
    expect(killFn).toHaveBeenCalledWith(12345, "SIGTERM");
    expect(existsSync(lockfilePath)).toBe(false);
  });

  it("reports not running when no lockfile exists", async () => {
    const result = await stopScheduler({ lockfilePath });

    expect(result).toEqual<StopSchedulerResult>({
      stopped: false,
      message: "No running scheduler found.",
    });
  });

  it("removes a stale lockfile when the PID is dead", async () => {
    writeFileSync(lockfilePath, "54321");
    const isPidAlive = vi.fn<(pid: number) => boolean>().mockReturnValue(false);

    const result = await stopScheduler({
      lockfilePath,
      isPidAlive,
    });

    expect(result).toEqual<StopSchedulerResult>({
      stopped: false,
      pid: 54321,
      message: "Removed stale scheduler lockfile for PID 54321.",
    });
    expect(existsSync(lockfilePath)).toBe(false);
  });

  it("returns a waiting message when the process does not exit before timeout", async () => {
    writeFileSync(lockfilePath, "77777");
    const killFn = vi.fn<(pid: number, signal?: NodeJS.Signals | number) => void>();
    const isPidAlive = vi.fn<(pid: number) => boolean>().mockReturnValue(true);
    const sleepFn = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

    const result = await stopScheduler({
      lockfilePath,
      killFn,
      isPidAlive,
      pollIntervalMs: 1,
      waitTimeoutMs: 2,
      sleepFn,
    });

    expect(result).toEqual<StopSchedulerResult>({
      stopped: true,
      pid: 77777,
      message: "Sent SIGTERM to scheduler PID 77777; waiting for graceful shutdown.",
    });
    expect(existsSync(lockfilePath)).toBe(true);
  });
});
