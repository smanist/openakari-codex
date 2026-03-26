/** Dynamic skill enumeration — reads repo-local skill directories at runtime to prevent
 *  stale hardcoded skill lists in prompts. See projects/akari/experiments/
 *  doc-code-discrepancy-analysis for the motivation (27% staleness gap). */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

type SkillComplexity = "very_high" | "high" | "medium" | "low";
type SkillModelMinimum = "frontier" | "strong" | "standard" | "fast";

export interface SkillInfo {
  name: string;
  description: string;
  /** When true, the chat agent conducts an interview before delegating to deep work. */
  interview: boolean;
  /** Instructions for the chat agent's interview, extracted from ## Chat Interview in SKILL.md. */
  interviewPrompt?: string;
  /** Skill complexity level: very_high, high, medium, low. */
  complexity?: SkillComplexity;
  /** Minimum model capability required. */
  modelMinimum?: SkillModelMinimum;
}

/** Repo-local live skill root. */
function skillDirs(repoDir: string): string[] {
  return [join(repoDir, ".agents", "skills")];
}

const MAX_SKILL_CONTENT_CHARS = 8000;
const SKILL_COMPLEXITIES = new Set<SkillComplexity>(["very_high", "high", "medium", "low"]);
const SKILL_MODEL_MINIMA = new Set<SkillModelMinimum>([
  "frontier",
  "strong",
  "standard",
  "fast",
]);

function parseFrontmatterField(content: string, field: string): string | undefined {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Allow leading indentation so we can parse Codex-style frontmatter where keys
  // may be indented with tabs/spaces inside the YAML block.
  const match = content.match(
    new RegExp(`^[\\t ]*${escaped}:\\s*(?:"([^"]+)"|([^\\n]+))\\s*$`, "m"),
  );
  const value = match?.[1] ?? match?.[2];
  return value?.trim();
}

/** Read the SKILL.md content for a specific skill.
 *  Returns null if the skill doesn't exist or has no SKILL.md.
 *  Content is truncated to 8000 chars to avoid prompt bloat. */
export async function readSkillContent(
  repoDir: string,
  skillName: string,
): Promise<string | null> {
  for (const dir of skillDirs(repoDir)) {
    const skillMdPath = join(dir, skillName, "SKILL.md");
    try {
      let content = await readFile(skillMdPath, "utf-8");
      if (content.length > MAX_SKILL_CONTENT_CHARS) {
        content = content.slice(0, MAX_SKILL_CONTENT_CHARS);
      }
      return content;
    } catch {
      continue;
    }
  }
  return null;
}

/** Read all skills from repo-local skill roots. Each subdirectory with a
 *  SKILL.md is a skill. Earlier roots take precedence when mirrored copies
 *  share the same skill name. Cached for 5 minutes to avoid excessive
 *  filesystem reads. */
let cachedSkills: SkillInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Clear the skill cache. For testing only. */
export function _clearSkillCache(): void {
  cachedSkills = null;
  cacheTimestamp = 0;
}

export async function listSkills(repoDir: string): Promise<SkillInfo[]> {
  const now = Date.now();
  if (cachedSkills && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSkills;
  }

  const skillsByName = new Map<string, SkillInfo>();

  for (const dir of skillDirs(repoDir)) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || skillsByName.has(entry.name)) continue;
        try {
          const skillMd = await readFile(join(dir, entry.name, "SKILL.md"), "utf-8");
          const description = parseFrontmatterField(skillMd, "description");
          const complexity = parseFrontmatterField(skillMd, "complexity");
          const modelMinimum = parseFrontmatterField(skillMd, "model-minimum");
          const interview = /^[\t ]*interview:\s*true\s*$/m.test(skillMd);
          const interviewPrompt = interview ? extractInterviewSection(skillMd) : undefined;

          skillsByName.set(entry.name, {
            name: entry.name,
            description: description ?? "(no description)",
            interview,
            interviewPrompt: interviewPrompt ?? undefined,
            complexity: complexity && SKILL_COMPLEXITIES.has(complexity as SkillComplexity)
              ? (complexity as SkillComplexity)
              : undefined,
            modelMinimum: modelMinimum && SKILL_MODEL_MINIMA.has(modelMinimum as SkillModelMinimum)
              ? (modelMinimum as SkillModelMinimum)
              : undefined,
          });
        } catch {
          // No SKILL.md — skip
        }
      }
    } catch (err) {
      if (!(err && typeof err === "object" && "code" in err && err.code === "ENOENT")) {
        console.warn("[skills] Could not read skills directory:", dir);
      }
      continue;
    }
  }

  const skills = Array.from(skillsByName.values());
  skills.sort((a, b) => a.name.localeCompare(b.name));
  cachedSkills = skills;
  cacheTimestamp = now;
  return skills;
}

/** Format the skill list for inclusion in a prompt.
 *  @param exclude Skills to exclude from the list (e.g., "coordinator" for deep work). */
export function formatSkillList(skills: SkillInfo[], exclude?: string[]): string {
  const filtered = exclude
    ? skills.filter((s) => !exclude.includes(s.name))
    : skills;
  return filtered.map((s) => `/${s.name}`).join(", ");
}

/** Detect if a message is invoking a skill. Returns the skill name and the
 *  full message as task description, or null if no skill is detected.
 *  Three detection modes:
 *  1. Slash prefix: "/orient", "run /diagnose ...", "use /develop fix ..."
 *  2. Bare first word: "orient", "feedback the bot is slow", "Feedback: context"
 *     (Slack intercepts /commands, so users type skill names without slash)
 *     Strips trailing punctuation (colon, comma, etc.) before matching.
 *  3. Verb + skill: "Use feedback skill for this", "Run diagnose on the experiment"
 *     Matches "use/run/invoke <skill-name>" as second word.
 *  Excludes "coordinator" which runs inline in chat. */
export function detectSkillInvocation(
  message: string,
  skills: SkillInfo[],
): { skillName: string; taskDescription: string } | null {
  const excludes = new Set(["coordinator"]);
  const skillNames = new Set(skills.filter((s) => !excludes.has(s.name)).map((s) => s.name));

  // Mode 1: /skill-name anywhere in the message
  const slashMatch = message.match(/\/([a-z][a-z0-9-]*)/);
  if (slashMatch) {
    const candidate = slashMatch[1];
    if (skillNames.has(candidate)) {
      const rest = message.replace(slashMatch[0], "").trim();
      return {
        skillName: candidate,
        taskDescription: `Run /${candidate}${rest ? " " + rest : ""}`,
      };
    }
  }

  const words = message.trim().split(/\s+/);

  // Mode 2: bare skill name as first word (strip trailing punctuation)
  const firstWordRaw = words[0] ?? "";
  const firstWord = firstWordRaw.replace(/[:,.!?;]+$/, "").toLowerCase();
  if (firstWord && skillNames.has(firstWord)) {
    const rest = message.trim().slice(firstWordRaw.length).trim();
    return {
      skillName: firstWord,
      taskDescription: `Run /${firstWord}${rest ? " " + rest : ""}`,
    };
  }

  // Mode 3: "use/run/invoke <skill-name> ..." where skill is second word
  const verbPrefixes = new Set(["use", "run", "invoke", "apply"]);
  if (words.length >= 2 && verbPrefixes.has(firstWordRaw.toLowerCase())) {
    const secondWord = words[1].replace(/[:,.!?;]+$/, "").toLowerCase();
    if (skillNames.has(secondWord)) {
      const rest = words.slice(2).join(" ").trim();
      return {
        skillName: secondWord,
        taskDescription: `Run /${secondWord}${rest ? " " + rest : ""}`,
      };
    }
  }

  return null;
}

/** Extract the ## Chat Interview section from a SKILL.md file.
 *  Returns null if the section is not found. */
export function extractInterviewSection(content: string): string | null {
  const startIdx = content.indexOf("## Chat Interview");
  if (startIdx === -1) return null;
  // Find end of heading line
  const afterHeading = content.indexOf("\n", startIdx);
  if (afterHeading === -1) return null;
  const bodyStart = afterHeading + 1;
  // Find end: next ## heading or --- separator
  const rest = content.slice(bodyStart);
  const nextSection = rest.search(/\n## /);
  const nextSeparator = rest.search(/\n---\s*$/m);
  let endOffset = rest.length;
  if (nextSection !== -1) endOffset = Math.min(endOffset, nextSection);
  if (nextSeparator !== -1) endOffset = Math.min(endOffset, nextSeparator);
  const result = rest.slice(0, endOffset).trim();
  return result || null;
}

/** Read the interview prompt for a specific skill from its SKILL.md.
 *  Returns null if the skill doesn't exist, has no SKILL.md, or has no ## Chat Interview section. */
export async function readInterviewPrompt(
  repoDir: string,
  skillName: string,
): Promise<string | null> {
  const content = await readSkillContent(repoDir, skillName);
  if (!content) return null;
  return extractInterviewSection(content);
}

/** Format a detailed skill list with descriptions for prompt context. */
export function formatSkillListDetailed(skills: SkillInfo[], exclude?: string[]): string {
  const filtered = exclude
    ? skills.filter((s) => !exclude.includes(s.name))
    : skills;
  return filtered.map((s) => `- /${s.name} — ${s.description}`).join("\n");
}

/** Check if a skill can be routed to fleet workers instead of requiring Opus deep work.
 *  Fleet-eligible skills have complexity medium/low and model-minimum standard/fast (or unset). */
export function isFleetEligibleSkill(skill: SkillInfo): boolean {
  if (!skill.complexity || skill.complexity === "high" || skill.complexity === "very_high") {
    return false;
  }
  // Unset => eligible; unknown => conservatively not eligible.
  if (
    skill.modelMinimum
    && skill.modelMinimum !== "fast"
    && skill.modelMinimum !== "standard"
  ) return false;
  return true;
}

/** Backend capability tiers. Higher values can run more complex skills. */
const BACKEND_TIER: Record<string, number> = {
  codex: 3,     // GPT-5-class: can run all current repo skills
  openai: 3,    // GPT-5-class fallback route
  opencode: 1,  // GLM-5: can run medium/low only
};

/** Skill complexity tiers. Higher values require more capable backends. */
const COMPLEXITY_TIER: Record<string, number> = {
  very_high: 3,
  high: 2,
  medium: 1,
  low: 0,
};

/** Check if a skill can run on the given backend.
 *  Returns { canRun: true } if the skill is compatible, or
 *  { canRun: false, reason: string } explaining why not. */
export function canRunSkill(
  skill: SkillInfo,
  backendName: string,
): { canRun: boolean; reason?: string } {
  const backendTier = BACKEND_TIER[backendName] ?? 1;
  
  if (skill.modelMinimum) {
    const minimumTier =
      skill.modelMinimum === "frontier"
        ? 3
        : skill.modelMinimum === "strong"
          ? 2
          : skill.modelMinimum === "standard"
            ? 1
            : 0;
    if (backendTier < minimumTier) {
      return {
        canRun: false,
        reason: `/${skill.name} requires ${skill.modelMinimum} but ${backendName} provides lower capability`,
      };
    }
  }
  
  if (skill.complexity) {
    const complexityTier = COMPLEXITY_TIER[skill.complexity] ?? 0;
    if (backendTier < complexityTier) {
      return {
        canRun: false,
        reason: `/${skill.name} has complexity "${skill.complexity}" but ${backendName} cannot run it`,
      };
    }
  }
  
  return { canRun: true };
}
