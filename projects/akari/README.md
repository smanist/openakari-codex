# akari: Meta-Project for Self-Improvement

Status: active
Mission: Study and improve the autonomous research system itself.
Done when: The system demonstrates self-directed capability improvement by identifying gaps from operational data, implementing changes, and measuring whether autonomy and knowledge output improve over time.

## Context

Akari's core idea is that the research system should study itself.

This project is the meta-project for openakari. Its subject is not an external benchmark or domain problem. Its subject is the behavior of the autonomous system itself: how sessions coordinate, where they fail, how human intervention changes over time, and which infrastructure or convention changes actually improve performance.

The artifacts here are adapted from the original private akari repo's operational history. They are included as examples of what it looks like when an AI-native software system treats its own operations as a research object.

## Log

### 2026-03-25 (Codex CLI stream-json parsing fixes)

Fixed the Codex backend instrumentation that caused some `work-cycle` sessions to record `Turns: 0` and empty output. The root cause was a schema mismatch: `codex exec --json` (codex-cli 0.110.0) emits `thread.started` / `turn.*` / `item.*` events rather than Claude-SDK-shaped `{type:"assistant", message:{content:[...]}}` lines.

Changes:
- Updated `infra/scheduler/src/backend.ts` `parseCodexMessage()` to parse Codex CLI `thread.started`, `item.completed` (`agent_message`), and `item.*` (`command_execution`) events.
- Fixed Codex text accumulation to append assistant text (rather than overwriting).
- Updated `infra/scheduler/src/agent.ts` to fall back to incrementally tracked session turns when a backend reports 0.
- Extended `infra/scheduler/src/sleep-guard.ts` to detect violations from `tool_use_summary` events (covers Cursor/opencode and Codex CLI mappings).
- Added a sanitized fixture at `infra/scheduler/src/__fixtures__/codex-cli-json-stream.sample.jsonl` plus regression tests.

Verification:
- `cd infra/scheduler && npx vitest run src/backend-all.test.ts src/sleep-guard.test.ts`
- Smoke run via executor produced a `work-cycle` log with non-empty output and `Turns: 1`: `.scheduler/logs/work-cycle-2026-03-25T01-47-37-609Z.log`.

Note: Task claiming could not be used because the scheduler control API was not reachable (`curl: (7) Failed to connect to localhost port 8420 ...`).

Session-type: autonomous
Duration: 25
Task-selected: Fix Codex work-cycle turn/output instrumentation
Task-completed: yes
Approvals-created: 0
Files-changed: 9
Commits: 2
Compound-actions: none
Resources-consumed: OpenAI via `codex exec` (cost not captured in scheduler metrics)
Budget-remaining: n/a

### 2026-03-25 (Codex work-cycle self-observation gap)

Wrote a self-observation diagnosis for a metrics/instrumentation failure where Codex `work-cycle` sessions can record `Turns: 0` and empty output, despite post-session verification showing file/commit activity. See `projects/akari/diagnosis/diagnosis-2026-03-25-codex-work-cycle-empty-output.md`.

Updated the local measurement plan to reflect that `.scheduler/metrics/sessions.jsonl` now exists in this repo checkout (though it’s currently sparse) and to explicitly flag “Turns=0 / empty output” as an instrumentation gap that invalidates derived trends until fixed.

Task claiming attempt (per SOP) could not be executed because the scheduler control API was not reachable in this environment (`curl` to `http://localhost:8420/api/tasks/claim` failed to connect).

Session-type: autonomous
Duration: 20
Task-selected: Write one self-observation diagnosis from operational evidence
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-24 (Task claim control API)

Implemented task-claim endpoints in the scheduler control API so agents can coordinate via `POST /api/tasks/claim`, `POST /api/tasks/release`, and `GET /api/tasks/claims`. This resolves the mismatch where the SOP and API docs referenced task claiming but the server returned `{"error":"not found"}`.

Verification: `cd infra/scheduler && npx vitest run src/api/server.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  6 passed (6)`

Session-type: autonomous
Duration: 5
Task-selected: Align task-claim SOP with scheduler API
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-24 (Local self-improvement measurement plan)

Added a repo-local self-improvement measurement protocol with concrete, mechanically recomputable metrics and explicit on-repo data sources (primarily `.scheduler/metrics/sessions.jsonl`, with fallbacks when metrics aren’t yet available). The plan is recorded in `projects/akari/plans/2026-03-24-self-improvement-measurement-local.md`.

Noted a coordination mismatch: the SOP recommends claiming tasks via `POST /api/tasks/claim`, but a local claim attempt returned `{"error":"not found"}`. Added a follow-up task to either implement task-claiming in the scheduler control API or update the SOP to match the repo’s actual coordination mechanism.

Session-type: autonomous
Duration: 15
Task-selected: Adapt the self-improvement measurement plan to your own repo
Task-completed: yes
Approvals-created: 0
Files-changed: 2
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-24 (Codex model alias normalization)

Fixed a post-migration scheduler bug where the default `auto -> codex` path still emitted Claude model aliases (`opus`, `sonnet`, `haiku`) into Codex/OpenAI CLI invocations. Added `resolveModelForBackend()` in `infra/scheduler/src/backend.ts` so Codex-backed sessions normalize those aliases to `gpt-5.2` at emission time while leaving Claude and Cursor behavior unchanged.

Also added regression coverage in `infra/scheduler/src/backend-all.test.ts` to lock the backend-specific model mapping behavior: Codex/OpenAI normalize Claude aliases, explicit GPT model IDs pass through unchanged, and Claude/Cursor continue to receive the original aliases.

Verification: `cd infra/scheduler && npx vitest run src/backend-all.test.ts src/agent.test.ts`
Output:
- `Test Files  2 passed (2)`
- `Tests  83 passed (83)`

Verification: `cd infra/scheduler && npx tsc --noEmit`
Output: typecheck still fails in pre-existing unrelated scheduler files including `src/api/server.ts`, `src/cli.ts`, `src/executor.ts`, and `src/api/server.ts`. This fix did not add new typecheck failures.

### 2026-03-24 (Codex-first migration implementation)

Implemented the first full Codex-first scheduler pass. Added `codex` and `openai` backend names, changed `auto` to capability-aware routing with `codex` as the default path, moved Claude preset injection out of the shared spawn layer, and replaced direct Claude-name supervision checks in deep-work/chat with capability checks.

Also rewrote the primary setup docs so `AGENTS.md` and Codex-backed scheduler examples are now the primary path in `README.md`, `docs/getting-started.md`, and `infra/scheduler/README.md`. Updated the earlier feasibility note with a post-implementation supervision classification, and marked the backend-migration tasks complete in `projects/akari/TASKS.md`.

Verification: `cd infra/scheduler && npx vitest run src/backend-all.test.ts src/backend-preference.test.ts reference-implementations/slack/slack.test.ts`
Output:
- `Test Files  2 passed (2)`
- `Tests  72 passed (72)`

Verification: `cd infra/scheduler && npx vitest run src/event-agents.test.ts src/drain-all.test.ts`
Output: `src/drain-all.test.ts` passed; two `src/event-agents.test.ts` failures were environment-related (`ModuleNotFoundError: No module named 'yaml'`) rather than backend-routing regressions.

Verification: `cd infra/scheduler && npx tsc --noEmit`
Output: typecheck still fails in pre-existing scheduler files including `src/api/server.ts`, `src/cli.ts`, and `src/executor.ts`. This session did not clear the broader type debt.

### 2026-03-24 (Codex/OpenAI migration assessment)

Assessed whether openakari can redirect its execution interface toward local Codex first, with OpenAI API calls only when needed. The core finding is that this is feasible, but not as a config-only change: Codex already exists as a human-invoked runtime via `AGENTS.md` and `.agents/skills/`, while the scheduler and supervision layers remain partly Claude-shaped.

Recorded the code-level assessment in `projects/akari/analysis/openai-interface-feasibility-2026-03-24.md` and a proposed migration sequence in `projects/akari/plans/2026-03-24-codex-openai-migration.md`. Added follow-up tasks covering a first-class Codex backend, de-Claude-ifying `spawnAgent()`, auditing deep-work/chat supervision, and rewriting docs to make the Codex/OpenAI path primary.

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

- Can local Codex be invoked with stable session interruption and message-injection semantics, or do deep-work/chat flows need an explicit OpenAI API fallback path?
- Should `auto` remain backward-compatible (`claude -> cursor -> opencode`) while Codex is added as an explicit backend, or should Codex become the new default ordering once parity is proven?
- Which self-improvement metrics are robust enough to compare across different forks or deployments of openakari?
- What is the smallest useful amount of operational logging needed to support real self-study without overwhelming orient cost?
- Which kinds of capability improvements transfer across projects, and which depend on the specific repo's history and conventions?
