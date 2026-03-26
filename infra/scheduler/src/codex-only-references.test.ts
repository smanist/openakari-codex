import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const ACTIVE_PATHS = [
  "AGENTS.md",
  "docs",
  ".agents/skills",
  "infra/budget-verify/budget-status.py",
  "infra/experiment-validator/validate.py",
];

const BANNED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bCLAUDE\.md\b/, label: "CLAUDE.md" },
  { pattern: /\.claude\/skills\//, label: ".claude/skills" },
  { pattern: /\bcursor\b/i, label: "cursor" },
  { pattern: /\bclaude\b/i, label: "claude" },
];

function collectFiles(path: string): string[] {
  const absPath = join(repoRoot, path);
  const st = statSync(absPath);
  if (st.isFile()) return [absPath];

  const files: string[] = [];
  for (const entry of readdirSync(absPath)) {
    files.push(...collectFiles(join(path, entry)));
  }
  return files;
}

describe("active codex-only references", () => {
  it("does not mention removed Claude/Cursor artifacts", () => {
    const offenders: string[] = [];

    for (const path of ACTIVE_PATHS) {
      for (const file of collectFiles(path)) {
        const content = readFileSync(file, "utf-8");
        for (const { pattern, label } of BANNED_PATTERNS) {
          if (pattern.test(content)) {
            offenders.push(`${file.replace(`${repoRoot}/`, "")}: ${label}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
