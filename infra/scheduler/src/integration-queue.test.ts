import { describe, it, expect } from "vitest";

import { IntegrationQueue } from "./integration-queue.js";

describe("integration-queue", () => {
  it("processes integration requests sequentially", async () => {
    const queue = new IntegrationQueue();
    const seen: string[] = [];

    const first = queue.enqueue({ taskRunId: "run-1", repoRoot: "/repo" }, async (req) => {
      seen.push(`${req.taskRunId}:start`);
      await Promise.resolve();
      seen.push(`${req.taskRunId}:end`);
      return req.taskRunId;
    });
    const second = queue.enqueue({ taskRunId: "run-2", repoRoot: "/repo" }, async (req) => {
      seen.push(`${req.taskRunId}:start`);
      await Promise.resolve();
      seen.push(`${req.taskRunId}:end`);
      return req.taskRunId;
    });

    await Promise.all([first, second]);

    expect(seen).toEqual([
      "run-1:start",
      "run-1:end",
      "run-2:start",
      "run-2:end",
    ]);
  });

  it("waits for requests enqueued while processing is active", async () => {
    const queue = new IntegrationQueue();
    const seen: string[] = [];
    let releaseFirst!: () => void;
    const firstPause = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue({ taskRunId: "run-1", repoRoot: "/repo" }, async (req) => {
      seen.push(`${req.taskRunId}:start`);
      await firstPause;
      seen.push(`${req.taskRunId}:end`);
      return req.taskRunId;
    });
    const second = queue.enqueue({ taskRunId: "run-2", repoRoot: "/repo" }, async (req) => {
      seen.push(`${req.taskRunId}:start`);
      await Promise.resolve();
      seen.push(`${req.taskRunId}:end`);
      return req.taskRunId;
    });

    releaseFirst();
    await Promise.all([first, second]);

    expect(seen).toEqual([
      "run-1:start",
      "run-1:end",
      "run-2:start",
      "run-2:end",
    ]);
  });
});
