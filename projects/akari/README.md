# akari: Meta-Project for Self-Improvement

Status: active
Mission: Study and improve the autonomous research system itself.
Done when: The system demonstrates self-directed capability improvement by identifying gaps from operational data, implementing changes, and measuring whether autonomy and knowledge output improve over time.

## Context

Akari's core idea is that the research system should study itself.

This project is the meta-project for openakari. Its subject is not an external benchmark or domain problem. Its subject is the behavior of the autonomous system itself: how sessions coordinate, where they fail, how human intervention changes over time, and which infrastructure or convention changes actually improve performance.

The artifacts here are adapted from the original private akari repo's operational history. They are included as examples of what it looks like when an AI-native software system treats its own operations as a research object.

## Log

### 2026-03-25 (Scheduler health monitoring: task starvation, duration, ledger)

Diagnosed three health-monitoring signals from `.scheduler/metrics/sessions.jsonl` and applied fixes to reduce false positives:
- `task_starvation`: excluded `triggerSource:"manual"` smoke runs from starvation classification.
- `ledger_inconsistent`: fixed post-session verification to only require same-day ledger entries when resources were actually consumed (API cost or `consumes_resources: true` experiments), and to check the relevant project’s `ledger.yaml` rather than any ledger in the repo.
- `durationMs` anomaly noise: added a 60s “excess above P95” guard for duration percentile anomalies to avoid borderline alerts while baselines stabilize.

Recorded evidence + hypotheses in `projects/akari/diagnosis/diagnosis-scheduler-health-signals-2026-03-25.md` and updated `projects/akari/TASKS.md` with a follow-up to re-run health checks after ≥20 post-fix sessions.

Verification:
- `cd infra/scheduler && npx vitest run src/anomaly-detection.test.ts src/health-watchdog.test.ts src/warning-escalation.test.ts src/verify-compliance.test.ts`
  - `Test Files  4 passed (4)`
  - `Tests  339 passed (339)`

Session-type: autonomous
Duration: 15
Task-selected: Diagnose scheduler health monitoring signals
Task-completed: yes
Approvals-created: 0
Files-changed: 10
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-25 (Scheduler: runtime-route observability + skill tier metadata)

Updated the scheduler's live observability and conventions to remove `backend` wording in favor of internal `runtime` routes (`codex_cli`, `openai_fallback`, `opencode_local`), while keeping `model` as the only user-facing execution selector. Also migrated skill metadata tiers to forward-compatible `complexity` and `model-minimum` levels.

Verification:
- `cd infra/scheduler && npm test`
  - `Test Files  65 passed (65)`
  - `Tests  1663 passed (1663)`

### 2026-03-25 (Remove Claude/Cursor surfaces; expose model-only scheduler interface)

Completed the scheduler/runtime cleanup that removes Claude- and Cursor-specific live surfaces and keeps only model selection as the public execution interface.

Implemented:
- Removed Claude/Cursor runtime code from `infra/scheduler/src/backend.ts`, deleted `team-session.ts`, deleted the legacy backend-preference module, and replaced the Anthropic SDK wrapper with transport-neutral scheduler-local types in `infra/scheduler/src/sdk.ts`.
- Dropped public `backend` selection from live job payloads and runtime control paths, added legacy payload normalization in `infra/scheduler/src/store.ts`, and added `.scheduler/backend-preference.json` → `.scheduler/model-preference.json` migration in `infra/scheduler/src/model-preference.ts`.
- Updated Slack and CLI surfaces to use `/akari model ...` and model preference/state instead of backend preference/state.
- Collapsed skill discovery to `.agents/skills/` only and changed event-agent plan discovery to repo-native `plans/` roots instead of `.claude/plans/`.
- Removed deprecated repo clutter: `CLAUDE.md`, `.claude/`, `.cursor/`, plus the Anthropic dependency from `infra/scheduler/package.json`.
- Updated live docs (`docs/status.md`, `docs/getting-started.md`, `docs/repo-as-interface.md`, `docs/sops/autonomous-work-cycle.md`, `docs/skill-classifications.md`, `docs/design.md`, `infra/scheduler/README.md`, `infra/experiment-validator/README.md`) to present `AGENTS.md` and model-only routing as current behavior.

Discovery recorded inline:
- `src/event-agents.ts` had a parse-breaking JSDoc line containing the literal text `projects/*/plans/`; the embedded `*/` prematurely terminated the comment and cascaded into false syntax errors. Fixed by rewriting the comment to avoid `*/` inside it.
- Local Python validation could fail with `ModuleNotFoundError: No module named 'yaml'`; added a scheduler-side fallback validator so `validateExperimentDir()` remains usable for experiment-only checks and tests without ambient `PyYAML`.

Verification:
- `cd infra/scheduler && npx tsc --noEmit` → passed
- `cd infra/scheduler && npm test -- src/event-agents.test.ts src/autofix-experiment.test.ts` → `Test Files  2 passed (2)`, `Tests  47 passed (47)`
- Full `cd infra/scheduler && npm test` rerun executed after the model-only/type cleanup to re-verify the scheduler suite end to end.

### 2026-03-25 (Re-verify Codex work-cycle metrics/logging — include manual runs)

Claimed and completed the high-priority task “Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`” by (a) fixing a gap in the `akari run <job-id>` path (manual runs didn’t write `.scheduler/metrics/sessions.jsonl`), and (b) re-running the `work-cycle` job end-to-end to confirm both log output and turn-count metrics are non-empty.

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"4a3f74e72bd235f9","taskId":"68d77e543be2","taskText":"Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`","project":"akari","agentId":"work-session-mn66gnu2",...}}`

Fix (verifiable):
- `infra/scheduler/src/cli.ts`: `cmdRun()` now records structured session metrics (same fields as daemon runs), enabling E2E verification without waiting for the next cron tick.

Verification:
- `cd infra/scheduler && npm test` → `68 passed` (1756 tests)
- E2E run: `cd infra/scheduler && node dist/cli.js run ufbtd1yr --profile chat --max-duration-ms 120000 --message "Reply with exactly: PING"` → `1 turns` and wrote:
  - Log: `.scheduler/logs/work-cycle-2026-03-25T15-23-15-092Z.log` (non-empty `## output`, `Turns: 1`)
  - Metrics row: `.scheduler/metrics/sessions.jsonl` at `timestamp:"2026-03-25T15:23:17.280Z"` with `numTurns:1`

Compound (fast): no actions.

Session-type: autonomous
Duration: 30
Task-selected: Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 3
Compound-actions: none
Resources-consumed: codex-cli (2 manual `akari run` invocations; cost untracked)
Budget-remaining: n/a

### 2026-03-25 (New project: multi-fidelity GP correction)

Created `projects/multi_fidelity_gp/` via `/project scaffold` for a human-initiated research project on one-dimensional multi-fidelity regression. Mission: measure how much a Gaussian-process residual correction can improve a fixed low-fidelity approximation when only limited high-fidelity data are available, using a synthetic benchmark with holdout high-fidelity evaluation.

Verification:
- `git diff --check -- projects/multi_fidelity_gp projects/akari/README.md` -> no output

Sources: `projects/multi_fidelity_gp/README.md`, `projects/multi_fidelity_gp/plans/2026-03-25-initial-benchmark.md`

### 2026-03-25 (Re-verify Codex scheduler turn/output instrumentation — end-to-end)

Selected the high-priority task “Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`” because the last 10 scheduler sessions in `.scheduler/metrics/sessions.jsonl` still report `numTurns: 0` (which makes efficiency metrics like “findings/$” undefined due to `costUsd: 0` and breaks downstream self-observation).

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → failed (exit code 7; could not connect to `localhost:8420`)

Next: inspect recent `.scheduler/logs/work-cycle-*.log` output, identify why scheduled Codex runs still emit empty `## output` and `Turns: 0`, then fix + re-run a minimal job to confirm `numTurns > 0`.

Scope classification: STRUCTURAL (verifiable) — infra instrumentation bugfix. Resource signal: avoid LLM calls during dev; rely on existing `.scheduler/logs/*` + fixtures + unit tests; only run a real scheduled job if required for final verification.

### 2026-03-25 (Re-verify end-to-end Codex job logging after rebuild)

Selected the high-priority follow-up task to re-verify that scheduled Codex-backend runs produce non-empty `.scheduler/logs/*` output and `numTurns > 0` in `.scheduler/metrics/sessions.jsonl`.

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"56f64c3d64a59ab1","taskId":"68d77e543be2","taskText":"Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`","project":"akari","agentId":"work-session-mn5jbd0b","claimedAt":1774412573862,"expiresAt":1774415273862}}`

Next: rebuild `infra/scheduler`, run a job via `node dist/cli.js run <job-id>`, and confirm the resulting `.scheduler/logs/*` and `.scheduler/metrics/sessions.jsonl` rows contain `Turns > 0` and non-empty output.

### 2026-03-25 (Re-verify Codex scheduler `numTurns` instrumentation)

Investigated why scheduled Codex-backend jobs still produced `.scheduler/logs/*` files with an empty `## output` section and `Turns: 0` (despite evidence of post-session activity).

Fix implemented (verifiable): treat Codex CLI `turn.*` events as the authoritative turn counter and fall back to command execution output (`item.completed` `command_execution.aggregated_output`) when assistant text is empty. This prevents tool-only turns from appearing as `Turns: 0` + empty output.

Changes:
- Codex stream accumulation: `infra/scheduler/src/backend.ts`
- Regression coverage: `infra/scheduler/src/backend-all.test.ts`
- Updated task evidence + diagnosis notes: `projects/akari/TASKS.md`, `projects/akari/diagnosis/diagnosis-2026-03-25-codex-work-cycle-empty-output.md`

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"a58b2b90f4a491a1","taskId":"68d77e543be2","taskText":"Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`","project":"akari","agentId":"work-session-mn5im4qz","claimedAt":1774411307495,"expiresAt":1774414007495}}`

Verification (unit):
- `cd infra/scheduler && npx vitest run src/backend-all.test.ts` → `71 passed`

Next verification (end-to-end):
- Build scheduler: `cd infra/scheduler && npm run build`
- Run a scheduled job and confirm (a) the `.scheduler/logs/<job>-*.log` has non-empty `## output` and `Turns > 0`, and (b) the `.scheduler/metrics/sessions.jsonl` row reports `numTurns > 0`.

Compound (fast): 1 action — clarified the diagnosis notes to reflect current `agent.ts` turn fallback behavior.

Session-type: autonomous
Duration: 20
Task-selected: Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`
Task-completed: partial
Approvals-created: 0
Files-changed: 5
Commits: 2
Compound-actions: 1
Resources-consumed: codex-cli (3 short invocations; cost untracked)
Budget-remaining: n/a

### 2026-03-25 (Human intervention rate snapshot)

Completed the task to measure a local human intervention rate using the scheduler’s session metrics JSONL.

Artifact:
- `projects/akari/analysis/human-intervention-rate-2026-03-25.md`

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"74fab7b48b90dd27","taskId":"ff554df73478","taskText":"Measure human intervention rate in your deployment","project":"akari","agentId":"work-session-mn5etsym","claimedAt":1774404981602,"expiresAt":1774407681602}}`

Verification (data + recomputation):
- `wc -l .scheduler/metrics/sessions.jsonl` → `5`
- `python - <<'PY' ... PY` →
  - `[all] scheduler=5, human=0, ratio=0.000`
  - `[last_2h] scheduler=4, human=0, ratio=0.000`

Compound (fast): no actions.

Session-type: autonomous
Duration: 6
Task-selected: Measure human intervention rate in your deployment
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-25 (Restore missing conventions/schemas/status docs)

Completed the governance task to reconcile missing doc references by creating the referenced paths:

- Added `docs/status.md`
- Added `docs/conventions/*.md` (14 convention docs, including a canonical `creative-intelligence.md`)
- Added `docs/schemas/*.md` (8 schema docs)

Also converted `docs/creative-intelligence.md` into a compatibility stub that points to the canonical `docs/conventions/creative-intelligence.md`.

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"7132ad3b9a45ac1a","taskId":"1bb2b70cf382","taskText":"Reconcile missing doc references in SOP/skills","project":"akari","agentId":"work-session-mn5ei8e8","claimedAt":1774404475960,"expiresAt":1774407175960}}`

Verification:
- `ls -1 docs/conventions | wc -l` → `14`
- `ls -1 docs/schemas | wc -l` → `8`

Session-type: autonomous
Duration: 15
Task-selected: Reconcile missing doc references in SOP/skills
Task-completed: yes
Approvals-created: 0
Files-changed: 26
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

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
- Output: `Test Files  2 passed (2)`, `Tests  97 passed (97)`
- Smoke run via executor produced a `work-cycle` log with non-empty output and `Turns: 1`: `.scheduler/logs/work-cycle-2026-03-25T01-47-37-609Z.log`.

Note: Task claiming could not be used because the scheduler control API was not reachable (`curl: (7) Failed to connect to localhost port 8420 ...`).

Session-type: autonomous
Duration: 25
Task-selected: Fix Codex work-cycle turn/output instrumentation
Task-completed: yes
Approvals-created: 0
Files-changed: 9
Commits: 3
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
