# akari: Meta-Project for Self-Improvement

Status: active
Mission: Study and improve the autonomous research system itself.
Done when: The system demonstrates self-directed capability improvement by identifying gaps from operational data, implementing changes, and measuring whether autonomy and knowledge output improve over time.

## Context

Akari's core idea is that the research system should study itself.

This project is the meta-project for openakari. Its subject is not an external benchmark or domain problem. Its subject is the behavior of the autonomous system itself: how sessions coordinate, where they fail, how human intervention changes over time, and which infrastructure or convention changes actually improve performance.

The artifacts here are adapted from the original private akari repo's operational history. They are included as examples of what it looks like when an AI-native software system treats its own operations as a research object.

## Log

### 2026-03-24 (verification follow-up)

Re-ran verification for the Codex skill-discovery patch after Node/npm and scheduler dependencies became available locally. Focused scheduler tests now pass for the patched area, while the scheduler-wide typecheck still fails on pre-existing errors outside `src/skills.ts`.

Verification: `cd infra/scheduler && npx vitest run src/skills.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  57 passed (57)`

Verification: `cd infra/scheduler && npx tsc --noEmit`
Output: typecheck still fails in unrelated files including `src/api/server.ts`, `src/cli.ts`, and `src/executor.ts`. No typecheck errors were reported for `src/skills.ts` or `src/skills.test.ts`.

### 2026-03-24

Improved repo-local skill discovery so Codex-facing `.agents/skills/` files are no longer ignored by scheduler-side enumeration. Added a completed plan at `projects/akari/plans/2026-03-24-codex-skill-discovery.md`, patched `infra/scheduler/src/skills.ts` to prefer `.agents/skills/` over `.claude/skills/`, and added regression tests/documentation for dual-root discovery and Codex-style frontmatter parsing.

Verification attempt: `cd infra/scheduler && npm test -- src/skills.test.ts`
Output: `zsh:1: command not found: npm`

Verification attempt: `cd infra/scheduler && npx tsc --noEmit`
Output: `zsh:1: command not found: npx`

Follow-up verification gap: this environment does not have Node/npm/npx on PATH, so Vitest and `tsc` could not be executed locally in-session.

### 2026-03-08

Created the public meta-project scaffold for openakari. Added a project README, task list, and three example artifacts adapted from the original akari repo: a self-improvement measurement plan, a human-intervention trend analysis, and a self-observation diagnosis. These examples show how the system studies its own behavior rather than only external tasks.

## Open questions

- Which self-improvement metrics are robust enough to compare across different forks or deployments of openakari?
- What is the smallest useful amount of operational logging needed to support real self-study without overwhelming orient cost?
- Which kinds of capability improvements transfer across projects, and which depend on the specific repo's history and conventions?
