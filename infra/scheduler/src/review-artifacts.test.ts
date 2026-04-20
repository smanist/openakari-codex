import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  parseReviewArtifact,
  writeReviewArtifact,
  readReviewArtifact,
  type ReviewArtifact,
} from "./review-artifacts.js";

describe("review-artifacts", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "akari-review-artifact-test-"));
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  const artifact: ReviewArtifact = {
    taskRunId: "run-123",
    round: 1,
    branch: "codex/dymad_dev/task-abc",
    baseBranch: "feat_dev",
    headCommit: "abc123",
    status: "changes_requested",
    blockingPolicy: "p0-p1",
    findings: [
      {
        id: "finding-1",
        priority: 1,
        title: "Missing guard",
        body: "This path can merge from a dirty base branch.",
        file: "infra/scheduler/src/isolation.ts",
        line: 42,
        status: "open",
      },
    ],
  };

  it("writes and reads a review artifact", async () => {
    await writeReviewArtifact(repoRoot, artifact);
    await expect(readReviewArtifact(repoRoot, artifact.taskRunId, artifact.round)).resolves.toEqual(artifact);
  });

  it("parses JSON payload embedded in reviewer text", () => {
    const text = `
Review complete.
REVIEW_ARTIFACT_JSON_START
${JSON.stringify(artifact, null, 2)}
REVIEW_ARTIFACT_JSON_END
`;
    expect(parseReviewArtifact(text)).toEqual(artifact);
  });

  it("returns null when no review payload markers exist", () => {
    expect(parseReviewArtifact("plain review text")).toBeNull();
  });
});
