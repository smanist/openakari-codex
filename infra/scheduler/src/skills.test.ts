/** Tests for skill detection and formatting utilities. */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectSkillInvocation, readSkillContent, extractInterviewSection, listSkills, readInterviewPrompt, _clearSkillCache, canRunSkill, isFleetEligibleSkill, type SkillInfo } from "./skills.js";

const mockSkills: SkillInfo[] = [
  { name: "orient", description: "Session-start situational awareness", interview: false },
  { name: "diagnose", description: "Diagnose issues", interview: false },
  { name: "develop", description: "TDD development workflow", interview: false },
  { name: "coordinator", description: "Slack operational guidance", interview: false },
  { name: "architecture", description: "Architecture analysis", interview: false },
  { name: "feedback", description: "Process human feedback", interview: false },
];

describe("detectSkillInvocation", () => {
  // ── Slash prefix (mode 1) ──

  it("detects /orient at start of message", () => {
    const result = detectSkillInvocation("/orient", mockSkills);
    expect(result).toEqual({
      skillName: "orient",
      taskDescription: "Run /orient",
    });
  });

  it("detects /diagnose with context", () => {
    const result = detectSkillInvocation(
      "Use /diagnose skill. Find out what issues are there for the experiment",
      mockSkills,
    );
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("diagnose");
    expect(result!.taskDescription).toContain("Run /diagnose");
    expect(result!.taskDescription).toContain("Find out what issues");
  });

  it("detects /develop fix with arguments", () => {
    const result = detectSkillInvocation("/develop fix the dedup bug", mockSkills);
    expect(result).toEqual({
      skillName: "develop",
      taskDescription: "Run /develop fix the dedup bug",
    });
  });

  it("detects skill with 'Run' prefix", () => {
    const result = detectSkillInvocation("Run /orient and list tasks by priority", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("orient");
  });

  it("excludes /coordinator (runs inline)", () => {
    const result = detectSkillInvocation("/coordinator show approvals", mockSkills);
    expect(result).toBeNull();
  });

  it("returns null for unknown skill names", () => {
    const result = detectSkillInvocation("/nonexistent do something", mockSkills);
    expect(result).toBeNull();
  });

  it("returns null for paths that look like skills but aren't", () => {
    const result = detectSkillInvocation("Check /storage/home/file.txt", mockSkills);
    expect(result).toBeNull();
  });

  // ── Bare first word (mode 2) ──

  it("detects bare 'orient' as first word", () => {
    const result = detectSkillInvocation("orient", mockSkills);
    expect(result).toEqual({
      skillName: "orient",
      taskDescription: "Run /orient",
    });
  });

  it("detects bare 'feedback' with context", () => {
    const result = detectSkillInvocation("feedback the bot is too slow when invoking skills", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("feedback");
    expect(result!.taskDescription).toBe("Run /feedback the bot is too slow when invoking skills");
  });

  it("detects bare 'develop' with arguments", () => {
    const result = detectSkillInvocation("develop fix the dedup bug", mockSkills);
    expect(result).toEqual({
      skillName: "develop",
      taskDescription: "Run /develop fix the dedup bug",
    });
  });

  it("detects bare 'diagnose' case-insensitively", () => {
    const result = detectSkillInvocation("Diagnose the model comparison experiment", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("diagnose");
  });

  it("excludes bare 'coordinator'", () => {
    const result = detectSkillInvocation("coordinator show approvals", mockSkills);
    expect(result).toBeNull();
  });

  it("returns null for messages without skill patterns", () => {
    const result = detectSkillInvocation("What is the status of the experiment?", mockSkills);
    expect(result).toBeNull();
  });

  // ── Bare word with trailing punctuation (mode 2 extension) ──

  it("detects 'Feedback:' with colon", () => {
    const result = detectSkillInvocation("Feedback: make each scheduler cycle session post a brief summary", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("feedback");
    expect(result!.taskDescription).toBe("Run /feedback make each scheduler cycle session post a brief summary");
  });

  it("detects 'feedback:' lowercase with colon", () => {
    const result = detectSkillInvocation("feedback: the bot is too slow", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("feedback");
  });

  it("detects 'Diagnose,' with comma", () => {
    const result = detectSkillInvocation("Diagnose, what went wrong with the experiment?", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("diagnose");
  });

  it("detects 'feedback!' with exclamation", () => {
    const result = detectSkillInvocation("feedback! this feature is broken", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("feedback");
  });

  // ── Verb + skill name (mode 3) ──

  it("detects 'Use feedback skill for this'", () => {
    const result = detectSkillInvocation("Use feedback skill for this", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("feedback");
    expect(result!.taskDescription).toBe("Run /feedback skill for this");
  });

  it("detects 'Run diagnose on the experiment'", () => {
    const result = detectSkillInvocation("Run diagnose on the experiment", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("diagnose");
    expect(result!.taskDescription).toBe("Run /diagnose on the experiment");
  });

  it("detects 'use orient' as verb + skill", () => {
    const result = detectSkillInvocation("use orient", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("orient");
  });

  it("excludes coordinator in mode 3", () => {
    const result = detectSkillInvocation("Use coordinator for this", mockSkills);
    expect(result).toBeNull();
  });

  it("returns null for 'Run sim game cycle' (not a skill)", () => {
    const result = detectSkillInvocation("Run sim game cycle", mockSkills);
    expect(result).toBeNull();
  });

  // ── Slash takes priority over bare word ──

  it("prefers slash match over bare first word", () => {
    const result = detectSkillInvocation("run /diagnose on the experiment", mockSkills);
    expect(result).not.toBeNull();
    expect(result!.skillName).toBe("diagnose");
  });
});

describe("readSkillContent", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "akari-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reads SKILL.md content for a valid skill", async () => {
    const skillsDir = join(tempDir, ".agents", "skills", "test-skill");
    await mkdir(skillsDir, { recursive: true });
    await writeFile(
      join(skillsDir, "SKILL.md"),
      `---
name: test-skill
description: "A test skill"
---
# Test Skill
This is a test skill.`
    );

    const content = await readSkillContent(tempDir, "test-skill");
    expect(content).not.toBeNull();
    expect(content).toContain("# Test Skill");
    expect(content).toContain("This is a test skill.");
  });

  it("returns null when skill directory does not exist", async () => {
    const content = await readSkillContent(tempDir, "nonexistent");
    expect(content).toBeNull();
  });

  it("returns null when SKILL.md file does not exist", async () => {
    const skillsDir = join(tempDir, ".agents", "skills", "empty-skill");
    await mkdir(skillsDir, { recursive: true });

    const content = await readSkillContent(tempDir, "empty-skill");
    expect(content).toBeNull();
  });

  it("truncates content to 8000 chars", async () => {
    const skillsDir = join(tempDir, ".agents", "skills", "big-skill");
    await mkdir(skillsDir, { recursive: true });
    const longContent = "x".repeat(10_000);
    await writeFile(join(skillsDir, "SKILL.md"), longContent);

    const content = await readSkillContent(tempDir, "big-skill");
    expect(content).not.toBeNull();
    expect(content!.length).toBeLessThanOrEqual(8000);
  });

  it("reads from .agents/skills", async () => {
    const skillsDir = join(tempDir, ".agents", "skills", "codex-skill");
    await mkdir(skillsDir, { recursive: true });
    await writeFile(
      join(skillsDir, "SKILL.md"),
      `---
name: codex-skill
description: "A Codex-native skill"
---
# Codex Skill
Use the .agents copy.`,
    );

    const content = await readSkillContent(tempDir, "codex-skill");
    expect(content).not.toBeNull();
    expect(content).toContain("# Codex Skill");
  });

  it("reads the single live .agents/skills root", async () => {
    const agentsDir = join(tempDir, ".agents", "skills", "shared-skill");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(join(agentsDir, "SKILL.md"), "# Agents copy");

    const content = await readSkillContent(tempDir, "shared-skill");
    expect(content).toContain("# Agents copy");
  });
});

describe("extractInterviewSection", () => {
  it("extracts ## Chat Interview section from SKILL.md content", () => {
    const content = `---
name: test
description: "A test"
interview: true
---
# Test Skill

## Chat Interview

Ask the user about their goals.
Ask 2-3 questions per round.

## Mode: propose

Some other content here.`;

    const result = extractInterviewSection(content);
    expect(result).not.toBeNull();
    expect(result).toContain("Ask the user about their goals.");
    expect(result).toContain("Ask 2-3 questions per round.");
    expect(result).not.toContain("Mode: propose");
    expect(result).not.toContain("Some other content");
  });

  it("returns null when ## Chat Interview section is missing", () => {
    const content = `---
name: test
description: "A test"
---
# Test Skill

## Mode: propose
Some content.`;

    const result = extractInterviewSection(content);
    expect(result).toBeNull();
  });

  it("extracts until end of file when no following section", () => {
    const content = `## Chat Interview

This is the only section.
It has multiple lines.`;

    const result = extractInterviewSection(content);
    expect(result).not.toBeNull();
    expect(result).toContain("This is the only section.");
    expect(result).toContain("It has multiple lines.");
  });
});

describe("listSkills — interview field", () => {
  let tempDir: string;

  beforeEach(async () => {
    _clearSkillCache();
    tempDir = await mkdtemp(join(tmpdir(), "akari-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("parses interview: true from frontmatter", async () => {
    const skillDir = join(tempDir, ".agents", "skills", "interview-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---
name: interview-skill
description: "A skill with interview"
interview: true
---
# Interview Skill

## Chat Interview

Ask the user questions.

## Main Section

Do the work.`,
    );

    // Clear the cache by using a unique dir
    const skills = await listSkills(tempDir);
    const skill = skills.find(s => s.name === "interview-skill");
    expect(skill).toBeDefined();
    expect(skill!.interview).toBe(true);
    expect(skill!.interviewPrompt).toContain("Ask the user questions.");
  });

  it("parses interview: false (missing) as false", async () => {
    const skillDir = join(tempDir, ".agents", "skills", "normal-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---
name: normal-skill
description: "A normal skill"
---
# Normal Skill
Do stuff.`,
    );

    const skills = await listSkills(tempDir);
    const skill = skills.find(s => s.name === "normal-skill");
    expect(skill).toBeDefined();
    expect(skill!.interview).toBe(false);
    expect(skill!.interviewPrompt).toBeUndefined();
  });

  it("reads skills from .agents/skills and parses Codex-style frontmatter", async () => {
    const skillDir = join(tempDir, ".agents", "skills", "fast-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---
name: fast-skill
description: Fast skill without quoted description
complexity: medium
model-minimum: fast-model
interview: true
---
# Fast Skill

## Chat Interview

Ask one question.`,
    );

    const skills = await listSkills(tempDir);
    const skill = skills.find(s => s.name === "fast-skill");
    expect(skill).toBeDefined();
    expect(skill!.description).toBe("Fast skill without quoted description");
    expect(skill!.complexity).toBe("medium");
    expect(skill!.modelMinimum).toBe("fast-model" as any);
    expect(skill!.interview).toBe(true);
    expect(skill!.interviewPrompt).toContain("Ask one question.");
  });

  it("uses the .agents/skills copy for skill metadata", async () => {
    const agentsDir = join(tempDir, ".agents", "skills", "shared-skill");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, "SKILL.md"),
      `---
name: shared-skill
description: "Agents description"
---
# Shared Skill`,
    );

    const skills = await listSkills(tempDir);
    const skill = skills.find(s => s.name === "shared-skill");
    expect(skill).toBeDefined();
    expect(skill!.description).toBe("Agents description");
  });
});

describe("readInterviewPrompt", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "akari-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reads interview prompt from SKILL.md", async () => {
    const skillDir = join(tempDir, ".agents", "skills", "my-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---
name: my-skill
description: "My skill"
interview: true
---
# My Skill

## Chat Interview

Gather requirements from the user.

## Execution

Execute the plan.`,
    );

    const prompt = await readInterviewPrompt(tempDir, "my-skill");
    expect(prompt).not.toBeNull();
    expect(prompt).toContain("Gather requirements from the user.");
    expect(prompt).not.toContain("Execute the plan.");
  });

  it("returns null for skill without interview section", async () => {
    const skillDir = join(tempDir, ".agents", "skills", "no-interview");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---
name: no-interview
description: "No interview"
---
# No Interview Skill
Just do stuff.`,
    );

    const prompt = await readInterviewPrompt(tempDir, "no-interview");
    expect(prompt).toBeNull();
  });

  it("returns null for nonexistent skill", async () => {
    const prompt = await readInterviewPrompt(tempDir, "nonexistent");
    expect(prompt).toBeNull();
  });
});

describe("canRunSkill", () => {
  it("allows low-complexity skill on any backend", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "low" };
    expect(canRunSkill(skill, "opencode")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "openai")).toEqual({ canRun: true });
  });

  it("allows medium-complexity skill on any backend", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "medium" };
    expect(canRunSkill(skill, "opencode")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
  });

  it("blocks high-complexity skill on opencode backend", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "high" };
    expect(canRunSkill(skill, "opencode")).toEqual({
      canRun: false,
      reason: "/test has complexity \"high\" but opencode cannot run it",
    });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
  });

  it("blocks opus-only skill on opencode backend", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "opus-only" };
    expect(canRunSkill(skill, "opencode")).toEqual({
      canRun: false,
      reason: "/test has complexity \"opus-only\" but opencode cannot run it",
    });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "openai")).toEqual({ canRun: true });
  });

  it("blocks skill with model-minimum: opus on opencode", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, modelMinimum: "opus" };
    expect(canRunSkill(skill, "opencode")).toEqual({
      canRun: false,
      reason: "/test requires opus but opencode provides lower capability",
    });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
  });

  it("allows skill with model-minimum: glm-5 on any backend", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, modelMinimum: "glm-5" };
    expect(canRunSkill(skill, "opencode")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
  });

  it("blocks skill with model-minimum: gpt-5 on opencode", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, modelMinimum: "gpt-5" as any };
    expect(canRunSkill(skill, "opencode")).toEqual({
      canRun: false,
      reason: "/test requires gpt-5 but opencode provides lower capability",
    });
    expect(canRunSkill(skill, "openai")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
  });

  it("allows skill with model-minimum: fast-model on opencode", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, modelMinimum: "fast-model" as any };
    expect(canRunSkill(skill, "opencode")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "openai")).toEqual({ canRun: true });
  });

  it("allows skill without complexity or modelMinimum on any backend", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false };
    expect(canRunSkill(skill, "opencode")).toEqual({ canRun: true });
    expect(canRunSkill(skill, "codex")).toEqual({ canRun: true });
  });
});

describe("isFleetEligibleSkill", () => {
  it("returns true for medium complexity + glm-5 minimum", () => {
    const skill: SkillInfo = { name: "self-audit", description: "test", interview: false, complexity: "medium", modelMinimum: "glm-5" };
    expect(isFleetEligibleSkill(skill)).toBe(true);
  });

  it("returns true for low complexity + glm-5 minimum", () => {
    const skill: SkillInfo = { name: "coordinator", description: "test", interview: false, complexity: "low", modelMinimum: "glm-5" };
    expect(isFleetEligibleSkill(skill)).toBe(true);
  });

  it("returns true for medium complexity without model-minimum", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "medium" };
    expect(isFleetEligibleSkill(skill)).toBe(true);
  });

  it("returns false for high complexity", () => {
    const skill: SkillInfo = { name: "develop", description: "test", interview: false, complexity: "high", modelMinimum: "gpt-5" as any };
    expect(isFleetEligibleSkill(skill)).toBe(false);
  });

  it("returns false for opus-only complexity", () => {
    const skill: SkillInfo = { name: "diagnose", description: "test", interview: false, complexity: "opus-only", modelMinimum: "opus" };
    expect(isFleetEligibleSkill(skill)).toBe(false);
  });

  it("returns false for model-minimum: opus regardless of complexity", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "medium", modelMinimum: "opus" };
    expect(isFleetEligibleSkill(skill)).toBe(false);
  });

  it("returns false for model-minimum: sonnet", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "medium", modelMinimum: "sonnet" };
    expect(isFleetEligibleSkill(skill)).toBe(false);
  });

  it("returns false for model-minimum: gpt-5", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false, complexity: "medium", modelMinimum: "gpt-5" as any };
    expect(isFleetEligibleSkill(skill)).toBe(false);
  });

  it("returns false when complexity is not set", () => {
    const skill: SkillInfo = { name: "test", description: "test", interview: false };
    expect(isFleetEligibleSkill(skill)).toBe(false);
  });
});
