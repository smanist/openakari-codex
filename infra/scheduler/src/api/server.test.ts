import { describe, expect, it } from "vitest";

import { parseEnqueueRequest } from "./server.js";

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
