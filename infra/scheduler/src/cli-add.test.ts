import { describe, expect, it } from "vitest";

import {
  buildDefaultWorkCycleMessage,
  buildProjectWorkCycleMessage,
  resolveAddMessage,
  parseFlags,
} from "./cli.js";

describe("scheduler add message helpers", () => {
  it("builds the default work-cycle boilerplate", () => {
    expect(buildDefaultWorkCycleMessage()).toBe(
      "You are an autonomous research agent starting a work session. You MUST complete ALL 5 steps of the autonomous work cycle SOP at docs/sops/autonomous-work-cycle.md: Step 1: Run /orient. Step 2: Select a task. Step 3: Classify scope. Step 4: Execute or defer to APPROVAL_QUEUE.md. Step 5: Git commit and log. Do NOT just produce a text report.",
    );
  });

  it("builds the project-scoped work-cycle boilerplate", () => {
    expect(buildProjectWorkCycleMessage("pca_vs_ttd")).toBe(
      "You are an autonomous research agent starting a work session on project pca_vs_ttd. Run /orient pca_vs_ttd. Work only on projects/pca_vs_ttd unless you must touch shared infra that directly supports this project. You MUST complete ALL 5 steps of the autonomous work cycle SOP at docs/sops/autonomous-work-cycle.md: Step 1: Run /orient pca_vs_ttd. Step 2: Select a task from projects/pca_vs_ttd/TASKS.md. Step 3: Classify scope. Step 4: Execute or defer to APPROVAL_QUEUE.md. Step 5: Git commit and log. Do NOT just produce a text report.",
    );
  });

  it("resolves the explicit message when provided", () => {
    expect(resolveAddMessage({ message: "custom prompt" })).toBe("custom prompt");
  });

  it("resolves the default boilerplate from --message-default", () => {
    expect(resolveAddMessage({ "message-default": true })).toBe(buildDefaultWorkCycleMessage());
  });

  it("resolves the project boilerplate from --message-project", () => {
    expect(resolveAddMessage({ "message-project": "pca_vs_ttd" })).toBe(
      buildProjectWorkCycleMessage("pca_vs_ttd"),
    );
  });

  it("throws when multiple message options are provided", () => {
    expect(() =>
      resolveAddMessage({ message: "custom", "message-default": true }),
    ).toThrow("Choose exactly one of --message, --message-default, or --message-project.");
  });

  it("throws when no message option is provided", () => {
    expect(() => resolveAddMessage({})).toThrow(
      "Error: choose one of --message, --message-default, or --message-project.",
    );
  });
});

describe("parseFlags", () => {
  it("supports boolean flags without consuming the next flag", () => {
    expect(parseFlags(["--message-default", "--model", "gpt-5.2"])).toEqual({
      "message-default": true,
      model: "gpt-5.2",
    });
  });
});
