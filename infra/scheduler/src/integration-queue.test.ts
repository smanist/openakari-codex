import { describe, it, expect } from "vitest";

import { IntegrationQueue } from "./integration-queue.js";

describe("integration-queue", () => {
  it("processes integration requests sequentially", async () => {
    const queue = new IntegrationQueue();
    const seen: string[] = [];

    queue.enqueue({ taskRunId: "run-1", repoRoot: "/repo" });
    queue.enqueue({ taskRunId: "run-2", repoRoot: "/repo" });

    await queue.processQueue(async (req) => {
      seen.push(`${req.taskRunId}:start`);
      await Promise.resolve();
      seen.push(`${req.taskRunId}:end`);
    });

    expect(seen).toEqual([
      "run-1:start",
      "run-1:end",
      "run-2:start",
      "run-2:end",
    ]);
  });

  it("does not re-enter processing when already active", async () => {
    const queue = new IntegrationQueue();
    const seen: string[] = [];

    queue.enqueue({ taskRunId: "run-1", repoRoot: "/repo" });

    const first = queue.processQueue(async (req) => {
      seen.push(req.taskRunId);
      await Promise.resolve();
    });
    const second = queue.processQueue(async () => {
      seen.push("unexpected");
    });

    await Promise.all([first, second]);
    expect(seen).toEqual(["run-1"]);
  });
});
