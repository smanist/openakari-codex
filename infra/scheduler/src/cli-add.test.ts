import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildDefaultWorkCycleMessage,
  buildProjectWorkCycleMessage,
  resolveAddMessage,
  resolveAddCwd,
  parseFlags,
} from "./cli.js";

describe("scheduler add message helpers", () => {
  it("builds the default work-cycle boilerplate", () => {
    expect(buildDefaultWorkCycleMessage()).toBe(
      "You are an autonomous research agent starting a work session. You MUST complete ALL 5 steps of the autonomous work cycle SOP at docs/sops/autonomous-work-cycle.md: Step 1: Run /orient. Step 2: Select a task. Step 3: Classify scope. Step 4: Execute or defer to APPROVAL_QUEUE.md. Step 5: Git commit and log. Do NOT just produce a text report.",
    );
  });

  it("builds the project-scoped work-cycle boilerplate", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "cli-add-"));
    mkdirSync(join(repoRoot, "modules"), { recursive: true });
    writeFileSync(
      join(repoRoot, "modules", "registry.yaml"),
      [
        "entries:",
        "  - project: pca_vs_ttd",
        "    module: pca_vs_ttd",
        "    path: modules/pca_vs_ttd",
        "    type: submodule",
        "",
      ].join("\n"),
      "utf-8",
    );

    expect(buildProjectWorkCycleMessage("pca_vs_ttd", repoRoot)).toBe(
      "You are an autonomous research agent starting a work session on project pca_vs_ttd. Run /orient pca_vs_ttd. Work in projects/pca_vs_ttd and its registered module modules/pca_vs_ttd unless you must touch shared infra that directly supports this project. You MUST complete ALL 5 steps of the autonomous work cycle SOP at docs/sops/autonomous-work-cycle.md: Step 1: Run /orient pca_vs_ttd. Step 2: Select a task from projects/pca_vs_ttd/TASKS.md. Step 3: Classify scope. Step 4: Execute or defer to APPROVAL_QUEUE.md. Step 5: Git commit and log. Do NOT just produce a text report.",
    );
  });

  it("resolves the explicit message when provided", () => {
    expect(resolveAddMessage({ message: "custom prompt" })).toBe("custom prompt");
  });

  it("resolves the default boilerplate from --message-default", () => {
    expect(resolveAddMessage({ "message-default": true })).toBe(buildDefaultWorkCycleMessage());
  });

  it("resolves the project boilerplate from --message-project", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "cli-add-message-"));
    mkdirSync(join(repoRoot, "modules"), { recursive: true });
    writeFileSync(
      join(repoRoot, "modules", "registry.yaml"),
      [
        "entries:",
        "  - project: pca_vs_ttd",
        "    module: pca_vs_ttd",
        "    path: modules/pca_vs_ttd",
        "    type: submodule",
        "",
      ].join("\n"),
      "utf-8",
    );

    expect(resolveAddMessage({ "message-project": "pca_vs_ttd" }, repoRoot)).toBe(
      buildProjectWorkCycleMessage("pca_vs_ttd", repoRoot),
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

describe("resolveAddCwd", () => {
  it("defaults to repo root when --cwd is omitted", () => {
    expect(resolveAddCwd({}, "file:///tmp/workspace/infra/scheduler/dist/cli.js")).toBe("/tmp/workspace");
  });

  it("uses explicit --cwd when provided", () => {
    expect(resolveAddCwd({ cwd: "/tmp/custom" }, "file:///tmp/workspace/infra/scheduler/dist/cli.js")).toBe("/tmp/custom");
  });
});
