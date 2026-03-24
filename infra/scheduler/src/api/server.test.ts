import { describe, expect, it } from "vitest";

import { parseEnqueueRequest, TaskClaimStore } from "./server.js";

describe("parseEnqueueRequest", () => {
  it("defaults priority to fleet when omitted", () => {
    expect(
      parseEnqueueRequest({ sessionId: "session-1", cwd: "/tmp/repo" }),
    ).toEqual({
      sessionId: "session-1",
      cwd: "/tmp/repo",
      priority: "fleet",
    });
  });

  it("preserves opus priority from the request body", () => {
    expect(
      parseEnqueueRequest({ sessionId: "session-2", cwd: "/tmp/repo", priority: "opus" }),
    ).toEqual({
      sessionId: "session-2",
      cwd: "/tmp/repo",
      priority: "opus",
    });
  });
});

describe("TaskClaimStore", () => {
  it("claims once and rejects conflicts", () => {
    const store = new TaskClaimStore();
    const now = 1_000_000;

    const first = store.claim(
      { taskText: "Do thing", project: "akari", agentId: "agent-a" },
      now,
    );
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.claim.taskText).toBe("Do thing");
      expect(first.claim.project).toBe("akari");
      expect(first.claim.agentId).toBe("agent-a");
      expect(first.claim.claimedAt).toBe(now);
      expect(first.claim.expiresAt).toBeGreaterThan(now);
    }

    const second = store.claim(
      { taskText: "Do thing", project: "akari", agentId: "agent-b" },
      now + 1,
    );
    expect(second).toEqual({
      ok: false,
      status: 409,
      claimedBy: "agent-a",
      expiresAt: (first.ok ? first.claim.expiresAt : 0),
    });
  });

  it("expires claims by TTL", () => {
    const store = new TaskClaimStore();
    const now = 1_000_000;

    const first = store.claim(
      { taskText: "Do thing", project: "akari", agentId: "agent-a", ttlMs: 10 },
      now,
    );
    expect(first.ok).toBe(true);

    const afterExpiry = store.claim(
      { taskText: "Do thing", project: "akari", agentId: "agent-b", ttlMs: 10 },
      now + 11,
    );
    expect(afterExpiry.ok).toBe(true);
    if (afterExpiry.ok) expect(afterExpiry.claim.agentId).toBe("agent-b");
  });

  it("lists active claims and filters by project", () => {
    const store = new TaskClaimStore();
    const now = 1_000_000;

    store.claim({ taskText: "Do thing", project: "akari", agentId: "a" }, now);
    store.claim({ taskText: "Do other", project: "pca_vs_ttd", agentId: "b" }, now);

    expect(store.list(now).map((c) => c.project).sort()).toEqual(["akari", "pca_vs_ttd"]);
    expect(store.list(now, "akari").map((c) => c.project)).toEqual(["akari"]);
  });

  it("releases by claimId or agentId", () => {
    const store = new TaskClaimStore();
    const now = 1_000_000;

    const c1 = store.claim({ taskText: "Do thing", project: "akari", agentId: "a" }, now);
    const c2 = store.claim({ taskText: "Do other", project: "akari", agentId: "a" }, now);
    expect(c1.ok).toBe(true);
    expect(c2.ok).toBe(true);

    if (c1.ok) {
      expect(store.release(now, { claimId: c1.claim.claimId })).toEqual({ ok: true });
    }

    expect(store.release(now, { agentId: "a" })).toEqual({ ok: true, released: 1 });
    expect(store.list(now)).toEqual([]);
  });
});
