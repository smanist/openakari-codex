import { describe, it, expect } from "vitest";

import {
  buildSelectorPrompt,
  buildAuthorPrompt,
  buildReviewerPrompt,
  parseSelectedTaskResult,
  shouldUseIsolatedModuleWorkflow,
  hasBlockingFindings,
} from "./isolated-workflow.js";
import type { Job } from "./types.js";
import type { ReviewArtifact } from "./review-artifacts.js";

function createJob(message: string): Job {
  return {
    id: "job-1",
    name: "test-job",
    schedule: { kind: "every", everyMs: 60_000 },
    payload: { message, cwd: "/repo" },
    enabled: true,
    createdAtMs: Date.now(),
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

describe("isolated-workflow", () => {
  it("recognizes autonomous work-cycle jobs as isolated-flow candidates", () => {
    const job = createJob(
      "You MUST complete ALL 5 steps of the autonomous work cycle SOP at docs/sops/autonomous-work-cycle.md: Step 1: Run /orient. Step 2: Select a task.",
    );
    expect(shouldUseIsolatedModuleWorkflow(job)).toBe(true);
  });

  it("recognizes explicit isolated-mode directives as isolated-flow candidates", () => {
    const job = createJob("Run /orient dymad_dev. Use isolated mode for module-backed execution.");
    expect(shouldUseIsolatedModuleWorkflow(job)).toBe(true);
  });

  it("recognizes explicit code-review directives as isolated-flow candidates", () => {
    const job = createJob("Use code review for this task and execute it in the scheduler workflow.");
    expect(shouldUseIsolatedModuleWorkflow(job)).toBe(true);
  });

  it("does not use isolated flow for non-work-cycle prompts", () => {
    const job = createJob("Do NOT run /orient. This is a deep work task.");
    expect(shouldUseIsolatedModuleWorkflow(job)).toBe(false);
  });

  it("parses selected task JSON marker from selector output", () => {
    const result = parseSelectedTaskResult(`
Completed selection.
SELECTED_TASK_JSON_START
{"project":"dymad_dev","taskText":"Implement the deterministic harness redesign","claimId":"claim-123"}
SELECTED_TASK_JSON_END
`);
    expect(result).toEqual({
      project: "dymad_dev",
      taskText: "Implement the deterministic harness redesign",
      claimId: "claim-123",
    });
  });

  it("returns null when selector output does not include markers", () => {
    expect(parseSelectedTaskResult("plain output")).toBeNull();
  });

  it("builds selector prompt that forbids file edits and requires structured output", () => {
    const prompt = buildSelectorPrompt("base autonomous work-cycle prompt");
    expect(prompt).toContain("Do NOT edit files");
    expect(prompt).toContain("do NOT claim a task");
    expect(prompt).toContain("SELECTED_TASK_JSON_START");
  });

  it("builds author prompt that skips orient and claim", () => {
    const prompt = buildAuthorPrompt({
      project: "dymad_dev",
      taskText: "Implement isolated execution",
      claimId: "claim-123",
    });
    expect(prompt).toContain("Do NOT run /orient");
    expect(prompt).toContain("This task is already selected and claimed");
    expect(prompt).toContain("Implement isolated execution");
  });

  it("builds author prompt that claims only after isolated routing succeeds", () => {
    const prompt = buildAuthorPrompt({
      project: "dymad_dev",
      taskText: "Implement isolated execution",
    });
    expect(prompt).toContain("Do NOT run /orient");
    expect(prompt).toContain("Claim it first if the claim API is available");
  });

  it("builds reviewer prompt that requests findings-first JSON output", () => {
    const prompt = buildReviewerPrompt({
      project: "dymad_dev",
      taskText: "Implement isolated execution",
      taskRunId: "run-1",
      round: 1,
      branch: "codex/dymad_dev/task-abc",
      baseBranch: "feat_dev",
      headCommit: "abc123",
    });
    expect(prompt).toContain("Review the changes on branch");
    expect(prompt).toContain("REVIEW_ARTIFACT_JSON_START");
    expect(prompt).toContain("P0-P1");
    expect(prompt).toContain('"taskRunId":"run-1"');
    expect(prompt).toContain('"round":1');
    expect(prompt).toContain('"headCommit":"abc123"');
  });

  it("treats only P0-P1 findings as blocking", () => {
    const artifact: ReviewArtifact = {
      taskRunId: "run-1",
      round: 1,
      branch: "codex/dymad_dev/task-abc",
      baseBranch: "feat_dev",
      headCommit: "abc123",
      status: "changes_requested",
      blockingPolicy: "p0-p1",
      findings: [
        {
          id: "f1",
          priority: 2,
          title: "Advisory",
          body: "Nice to have.",
          file: "foo.ts",
          status: "open",
        },
        {
          id: "f2",
          priority: 1,
          title: "Blocking",
          body: "Must fix.",
          file: "bar.ts",
          status: "open",
        },
      ],
    };
    expect(hasBlockingFindings(artifact)).toBe(true);
  });
});
