# akari: Meta-Project for Self-Improvement

Status: active
Mission: Study and improve the autonomous research system itself.
Done when: The system demonstrates self-directed capability improvement by identifying gaps from operational data, implementing changes, and measuring whether autonomy and knowledge output improve over time.

## Context

Akari's core idea is that the research system should study itself.

This project is the meta-project for openakari. Its subject is not an external benchmark or domain problem. Its subject is the behavior of the autonomous system itself: how sessions coordinate, where they fail, how human intervention changes over time, and which infrastructure or convention changes actually improve performance.

The artifacts here are adapted from the original private akari repo's operational history. They are included as examples of what it looks like when an AI-native software system treats its own operations as a research object.

## Log

### 2026-04-15 (Switched live validation docs from pixi to direct Python commands)

Updated the active operator-facing references for experiment validation and budget utilities to use direct `python ...` entrypoints instead of `pixi run ...`. This covered the commit SOP, the validator and budget README examples, agent skill guidance, akari pattern docs, and the experiment runner's ledger-repair hints.

Verification: `rg -n "pixi run validate|pixi run budget-status|pixi run auto-ledger|pixi run ledger-update" docs/sops/commit-workflow.md infra/experiment-validator/README.md infra/budget-verify/README.md infra/experiment-runner/run.py .agents/skills/self-audit/SKILL.md .agents/skills/feedback/SKILL.md .agents/skills/coordinator/SKILL.md projects/akari/patterns/autonomous-execution.md projects/akari/patterns/structured-work-records.md projects/akari/patterns/layered-budget-enforcement.md`
Output: no matches

Verification: `python -m py_compile infra/experiment-runner/run.py`
Output: command completed successfully with no output

### 2026-04-15 (Scaffolded the DyMAD development project)

Created the durable project scaffold for `projects/dymad_dev/` around the already-registered `modules/dymad_dev/` module. The new project records two linked workstreams requested by the user: config-driven noise injection during trajectory sampling, and a real denoising `data` phase in the typed training pipeline.

Also added a bounded implementation plan and a planned benchmark record so the work is anchored to a measurable question rather than just a code change: does denoising improve clean-reference signal fidelity and downstream training quality under injected noise?

Sources: `projects/dymad_dev/README.md`, `projects/dymad_dev/TASKS.md`, `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`, `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md`

### 2026-04-04 (Diagnosed low-knowledge alerts and disambiguated anomaly-task provenance)

Diagnosed the two `knowledgeTotal` health alerts for `x13yb5tx-cf5b40e4` (`2026-03-31T10:06:17.026Z`) and `x13yb5tx-5b9a104a` (`2026-04-04T06:04:50.516Z`) from `.scheduler/metrics/sessions.jsonl`. The first row was not a fresh regression: it was a normal completed `dymad_migrate` structural migration session that retired `DynData`/`io/data.py`, and `knowledgeTotal=1` turned out to be a common maintenance pattern for that project (`12/43 = 27.9%` of productive `dymad_migrate` runs in the current metrics file).

The second row was a real workflow interruption, but not a systemic productivity collapse. Its scheduler log shows the autonomous run stopped to ask for user guidance after an unexpected `projects/akari/plans/2026-04-04-scheduler-health-diagnosis-followup.md` file appeared mid-run. That left the session with `hasLogEntry=false`, `hasCompleteFooter=false`, and only a structural preflight footprint even though the underlying `typed phase-result objects` task was later completed successfully in a subsequent `dymad_migrate` session.

Applied one narrow follow-up fix in the same turn: anomaly-generated health tasks now include `sessionRunId` in their source IDs and `Why:` lines, because the previous formatter collapsed both low-knowledge alerts into two indistinguishable duplicate tasks in `projects/akari/TASKS.md`. Recorded the full diagnosis in `projects/akari/diagnosis/diagnosis-low-knowledge-output-alerts-2026-04-04.md`, closed the two alert tasks with per-session evidence, and added a follow-up task to diagnose how scheduler-run sessions should handle newly surfaced foreign worktree files without turning into interactive questions.

Verification:
- `python - <<'PY' ... PY`
  - `dymad_all_ok 43 mean 2.395 std 2.441 counts {0: 2, 1: 12, 2: 23, 3: 1, 4: 1, 7: 1, 9: 1, 10: 1, 12: 1}`
  - `dymad_ok_hasLog 40 mean 2.55 std 2.459 counts {1: 11, 2: 23, 3: 1, 4: 1, 7: 1, 9: 1, 10: 1, 12: 1}`
  - `dymad_recent_apr4 17 mean 1.941 std 0.235 counts {1: 1, 2: 16}`
- `sed -n '1,240p' '.scheduler/logs/“dymad-migrate”-2026-04-04T06-04-48-098Z.log'`
  - log ends with `How do you want to proceed`, confirming the session asked for user input instead of completing autonomous closeout
- `cd infra/scheduler && npx vitest run src/health-tasks.test.ts`
  - `Test Files  1 passed (1)`
  - `Tests  16 passed (16)`

Session-type: directed
Duration: 24
Task-selected: Diagnose low-knowledge scheduler health alerts for `x13yb5tx-cf5b40e4` and `x13yb5tx-5b9a104a`
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-04 (Followed up repeated scheduler health alerts and cleared stale babysitting classification)

Diagnosed why the health monitor still reported `task_starvation`, `babysitting_detected`, and the `x13yb5tx-82fb9a07` duration outlier in the latest 20-session window. The underlying anomaly is not new: the only affected rows are still the same two `dymad_migrate` empty-queue sessions from `2026-03-30`, and after the `14:07Z` recovery run there were `17/17` productive, non-timeout sessions through `2026-04-04`.

The new finding from this follow-up is deployment-state drift in the scheduler runtime. `infra/scheduler/src/health-watchdog.ts` already excluded task-starvation rows from `babysitting_detected`, but the live compiled bundle under `infra/scheduler/dist/` still had the old logic. Before rebuilding, `node infra/scheduler/dist/cli.js watchdog --limit 20` reported `2 issue(s)` (`task_starvation` and `babysitting_detected`); after `cd infra/scheduler && npm run build`, the same command reported only `task_starvation`. Recorded the diagnosis in `projects/akari/diagnosis/diagnosis-scheduler-health-signals-followup-2026-04-04.md`, added a follow-up task for source/dist build-freshness detection, and refreshed the local scheduler bundle so monitoring now matches the fixed watchdog logic.

Verification:
- `python - <<'PY' ... PY`
  - `window_start 2026-03-30T13:01:44.361Z`
  - `window_end 2026-04-04T05:09:06.567Z`
  - `starved 2`
  - `timedout_starved 1`
  - `max_run x13yb5tx-82fb9a07`
  - `post_count 17`
  - `post_starved 0`
  - `post_timedout 0`
- `node infra/scheduler/dist/cli.js watchdog --limit 20` (before rebuild)
  - `Analyzed 20 sessions.`
  - `Session health watchdog: 2 issue(s) detected`
  - `task_starvation`
  - `babysitting_detected`
- `cd infra/scheduler && npm test -- health-watchdog.test.ts`
  - `Test Files  1 passed (1)`
  - `Tests  114 passed (114)`
- `cd infra/scheduler && npm run build`
  - success
- `node infra/scheduler/dist/cli.js watchdog --limit 20` (after rebuild)
  - `Analyzed 20 sessions.`
  - `Session health watchdog: 1 issue(s) detected`
  - `task_starvation`
- `git ls-files infra/scheduler/dist/health-watchdog.js infra/scheduler/dist/cli.js infra/scheduler/src/health-watchdog.ts`
  - `infra/scheduler/src/health-watchdog.ts`

Session-type: directed
Duration: 20
Task-selected: Diagnose repeated scheduler health alerts from the latest 20-session window
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-31 (Resolved the `x13yb5tx-82fb9a07` empty-queue timeout root cause)

Completed the follow-up diagnosis for the `dymad_migrate` timeout row `x13yb5tx-82fb9a07` and narrowed the failure to the empty-queue task-selection seam rather than scheduler logging or in-process babysitting.

The key new finding is that the timeout was a control-gap in how empty queues are handled. In the latest 20 session rows, both zero-work `dymad_migrate` runs share the same empty-work signature: `2/20 = 10.0%` starvation rows, with `x13yb5tx-82fb9a07` at `3545920 ms` (`59.1 min`, `timedOut=true`, `numTurns=1`, `modelUsage=null`) and `x13yb5tx-d2999e90` at `27607 ms` (`27.6 s`, `timedOut=false`, `numTurns=1`, `modelUsage=null`). The neighboring productive runs stayed in the `413307-446487 ms` range and the `14:00Z` recovery run explicitly logged that `projects/dymad_migrate/TASKS.md` had no open tasks and only recovered after generating a mission-gap task.

The diagnosis outcome is that empty-queue recovery is currently prompt-level `/orient` behavior, not scheduler-enforced control flow. When that first turn succeeds, the session can generate a mission-gap task and continue; when it stalls, the session can burn the full timeout without producing work. Recorded the diagnosis in `projects/akari/diagnosis/diagnosis-empty-queue-timeout-x13yb5tx-82fb9a07-2026-03-31.md`, completed the corresponding follow-up task in `projects/akari/TASKS.md`, and added two execution follow-ups: one for scheduler-side empty-queue preflight and one for timeout-path provenance.

Verification:
- `python - <<'PY' ... PY`
  - `window_rows 20`
  - `starved_rows 2`
  - `x13yb5tx-82fb9a07 2026-03-30T13:01:44.361Z 3545920 True 1 None`
  - `x13yb5tx-d2999e90 2026-03-30T13:17:51.447Z 27607 False 1 None`
  - `neighbor x13yb5tx-6c37df95 2026-03-30T11:06:59.418Z 413307 2 3 0 0`
  - `neighbor x13yb5tx-a8632cea 2026-03-30T14:07:40.377Z 446487 2 3 1 1`
- `rg -n "If no actionable tasks are found|Mission gap analysis .* primary fallback|found no open tasks" .agents/skills/orient/SKILL.md projects/dymad_migrate/README.md`
  - `.agents/skills/orient/SKILL.md:87` shows the empty-queue fallback is mission-gap analysis inside `/orient`
  - `projects/dymad_migrate/README.md:1185` shows the `14:00Z` recovery run found no open tasks and generated a mission-gap task

Session-type: directed
Duration: 24
Task-selected: Diagnose the root cause of empty-queue timeout `x13yb5tx-82fb9a07`
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-31 (Scheduler health monitoring: dymad starvation cluster and babysitting false positive)

Diagnosed the latest health-monitoring alerts from the most recent 20 rows of `.scheduler/metrics/sessions.jsonl` and found that all three signals (`task_starvation`, `babysitting_detected`, and the `durationMs` outlier) collapse into one `dymad_migrate` window on 2026-03-30.

The key finding is that this was not a repo-wide quality drop or an in-process training loop. Two `dymad_migrate` scheduler runs had `0` commits, `0` files, and `0` touched projects: `x13yb5tx-82fb9a07` (`2026-03-30T12:02:38Z` → `13:01:44Z`, `59.1` minutes, timed out) and `x13yb5tx-d2999e90` (`2026-03-30T13:17:23Z` → `13:17:51Z`, `27.6` seconds). The neighboring successful run at `2026-03-30T14:00:13Z` explicitly logged that `projects/dymad_migrate/TASKS.md` had no open tasks and recovered by generating a mission-gap task.

Applied one narrow watchdog fix in the same session: timed-out task-starvation rows are no longer double-counted as `babysitting_detected`. Recorded the full diagnosis in `projects/akari/diagnosis/diagnosis-scheduler-health-signals-2026-03-31.md` and added a follow-up task to isolate why the first empty-queue run stalled until timeout without emitting a scheduler log.

Verification:
- `cd infra/scheduler && npm test -- health-watchdog.test.ts`
  - `Test Files  1 passed (1)`
  - `Tests  114 passed (114)`
- `node - <<'NODE' ... NODE`
  - `task_starvation 2/20`
  - `babysitting 0/20`
  - `starvation_run_ids x13yb5tx-82fb9a07,x13yb5tx-d2999e90`
  - `babysitting_run_ids (none)`

Session-type: directed
Duration: 20
Task-selected: Diagnose scheduler health anomaly signals from the recent 20-session window
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Added `/project augment` mode to the project skill)

Extended the `project` skill so it now supports `/project augment <project> <request>` for human-triggered updates to existing projects. The new mode explicitly preserves immutable project `Mission:` and `Done when:` fields, routes out-of-scope requests back to `scaffold` or `propose`, and defines how to update existing project READMEs, tasks, plans, and resource records.

While wiring the mode in, corrected stale skill-inventory metadata in `projects/akari/patterns/skills-architecture.md`: the inventory comment was still advertising `count: 21`, but `find .agents/skills -mindepth 1 -maxdepth 1 -type d | wc -l` returned `25`.

Verification:
- `rg -n "/project augment|argument-hint: \"propose .*augment|mode=\"augment\"|immutable mission|project setup and scope changes|project augment" .agents/skills/project/SKILL.md docs/skill-classifications.md projects/akari/patterns/skills-architecture.md`
  - `.agents/skills/project/SKILL.md:8` shows `argument-hint: "propose [topic] | scaffold <description> | augment <project> <request>"`
  - `.agents/skills/project/SKILL.md:20` shows the new `/project augment <project> <request>` mode
  - `.agents/skills/project/SKILL.md:328` shows `mode="augment"` in the question marker
  - `docs/skill-classifications.md:77` shows the new `/project augment` human-triggered entry
  - `projects/akari/patterns/skills-architecture.md:72` shows the project skill described with three modes
- `find .agents/skills -mindepth 1 -maxdepth 1 -type d | wc -l`
  - `25`
- `git status --short`
  - `M .agents/skills/project/SKILL.md`
  - `M docs/skill-classifications.md`
  - `M projects/akari/patterns/skills-architecture.md`

Sources: `.agents/skills/project/SKILL.md`, `docs/skill-classifications.md`, `projects/akari/patterns/skills-architecture.md`

### 2026-03-26 (Orient akari + scheduler cadence-gap diagnosis at 9/10)

Ran `/orient akari` for `SESSION_ID=work-session-mn7pu8ez`, then selected and completed a new mission-gap diagnosis task because the only pre-existing open task was externally blocked at `9/10` post-intervention scheduler sessions.

Orient findings:
- Repo state at orient start: clean tracked workspace (`git status --short` had no modified tracked files).
- No pending approvals in `APPROVAL_QUEUE.md`.
- No horizon-scan reports under `.scheduler/skill-reports/`.
- Findings-first gate remains enabled: rolling scheduler `work-cycle` non-zero-findings rate is `0/10 = 0.0%`.
- External blocker status: `Evaluate findings-first gate impact after 10 scheduler sessions` remains blocked at `9/10` (not stale, dated `2026-03-26`).
- Budget/deadline status: only `projects/pca_vs_ttd/budget.yaml` exists (`llm_api_calls 0/0`, `cpu_hours 0/0.1`, deadline `2026-06-01T00:00:00Z`), no `progress.json` `consumption_audit` entries found for reconciliation.

Task selection and claim:
- Selected task: `Diagnose scheduler work-cycle cadence gap blocking 10-session findings evaluation`.
- Claim API attempt failed:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...`
  - `curl: (7) Failed to connect to localhost port 8420 after 0 ms: Couldn't connect to server`
  - Proceeded without claim per SOP fallback.

Scope classification:
- `ROUTINE` (`consumes_resources: false`) - local diagnosis and documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added cadence data snapshot: `projects/akari/diagnosis/scheduler-work-cycle-cadence-gap-window-2026-03-26.json`.
- Added diagnosis artifact: `projects/akari/diagnosis/diagnosis-scheduler-work-cycle-cadence-gap-2026-03-26.md`.
- Updated `projects/akari/TASKS.md`:
  - completed the selected diagnosis task with evidence and verification lines.
  - added follow-up task `Restore scheduler-driven work-cycle cadence needed for findings-first 10-session evaluation`.

Key finding:
- The blocker is operational state, not analysis quality: `work-cycle` is disabled in `.scheduler/jobs.json` and the scheduler daemon is stopped, so the 10th scheduler-triggered session cannot arrive until cadence is restored.

Verification:
- `node - <<'NODE' ... NODE` (cadence extractor) ->
  - `post: 9`
  - `enabled: false`
  - `pid: false`
  - `missing: 5`
- `./akari status` ->
  - `Daemon: stopped`
  - `Jobs: 1/2 enabled`
  - `“work-cycle” [disabled]`

Session-type: autonomous
Duration: 20
Task-selected: Diagnose scheduler work-cycle cadence gap blocking 10-session findings evaluation
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + interim findings-first trend check at 9/10)

Ran `/orient akari` for `SESSION_ID=work-session-mn7or5lw`, generated one mission-gap task because the only open task was externally blocked, selected and completed that task.

Orient findings:
- Repo state clean at session start (`git status --short` returned no rows).
- `docs/roadmap.md` is still absent (`sed: docs/roadmap.md: No such file or directory`).
- No pending approvals in `APPROVAL_QUEUE.md`.
- No horizon-scan reports under `.scheduler/skill-reports/`.
- Findings-first gate remains enabled: scheduler work-cycle rolling non-zero-findings rate is `0/10 = 0.0%`.
- Efficiency summary (latest 10 work-cycle sessions): `findings/$ = n/a` (`costUsd` total `0`), genuine waste `0/10 = 0.0%`, orient overhead `n/a` (no `numTurns > 10` sessions), avg cost/session `$0.00`, avg turns/session `1.0`.
- Cross-session patterns (using `infra/scheduler/src/patterns.ts` logic over last 10 sessions): none.
- External blocker freshness: `Evaluate findings-first gate impact after 10 scheduler sessions` is not stale (`[blocked-by: external ... (2026-03-26)]`) and now has post-intervention scheduler window count `9/10`.
- Budget/deadline status: only `projects/pca_vs_ttd/budget.yaml` exists (`llm_api_calls 0/0`, `cpu_hours 0/0.1`, deadline `2026-06-01T00:00:00Z`), `ledger.yaml` is empty, and no `progress.json` files with `consumption_audit` were found for reconciliation.

Task supply update:
- Added one mission-gap task to `projects/akari/TASKS.md`:
  - `Quantify interim findings-first trend at 9/10 post-intervention sessions`

Task selection and claim:
- Selected task: `Quantify interim findings-first trend at 9/10 post-intervention sessions`.
- Claim API attempt:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...`
  - `curl: (7) Failed to connect to localhost port 8420 after 0 ms: Couldn't connect to server`
  - Proceeded without claim per SOP fallback.

Scope classification:
- `ROUTINE` (`consumes_resources: false`) - local metrics analysis and documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added interim data snapshot: `projects/akari/analysis/findings-first-interim-window-2026-03-26-9of10.json`.
- Added analysis artifact: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-9of10.md`.
- Updated `projects/akari/TASKS.md`:
  - added and completed the 9/10 mission-gap task with evidence and verification output.

Verification:
- `node - <<'NODE' ... d.derived ... NODE`
  - `post_window_scheduler_work_cycles 9`
  - `post_non_zero_findings_sessions 0`
  - `post_failed_sessions 0`
- `rg -n "Baseline non-zero-findings rate|Post-intervention non-zero-findings rate|Post-intervention failed-session rate|Interim trend classification|Remaining sessions until unblock threshold" projects/akari/analysis/findings-first-interim-trend-2026-03-26-9of10.md`
  - matched baseline and post-window rate lines (`2/9`, `0/9`, `0/9`), trend label (`worse`), and remaining-session arithmetic (`10 - 9 = 1`).

Session-type: autonomous
Duration: 18
Task-selected: Quantify interim findings-first trend at 9/10 post-intervention sessions
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Codex token-usage capture for scheduler metrics)

Recorded a telemetry gap discovered while checking whether zero-cost Codex-local sessions could still track usage: the Codex CLI JSON stream fixture already includes per-turn token counts on `turn.completed.usage`, but the scheduler backend was not aggregating or persisting them.

Implemented a narrow fix in `infra/scheduler/src/backend.ts` so Codex/OpenAI-routed sessions now sum `input_tokens`, `output_tokens`, and `cached_input_tokens` across `turn.completed` events and emit them into session `modelUsage` under the resolved model id. `costUSD` remains `0` for local Codex accounting, but token usage is now preserved in `.scheduler/metrics/sessions.jsonl`.

Follow-up surface work in the same session:
- Extended session aggregation and report renderers so operational markdown/Slack outputs include token totals and average tokens per session.
- Extended the in-memory active-session registry plus `status` formatting so live sessions can show cumulative token counts once Codex turn usage arrives.
- Extended per-run scheduler log headers so `.scheduler/logs/*.log` also print token totals when available.
- Extended Codex token telemetry to preserve two extra fields in `modelUsage`: uncached input tokens (`input - cached`) and last-step token totals from the most recent `turn.completed` event.
- Added focused regression coverage for Codex usage aggregation, operational report token summaries, and live status token formatting.
- Confirmed a deployment gotcha: the `akari` CLI runs the compiled scheduler entrypoint at `infra/scheduler/dist/cli.js`, so source-only telemetry fixes do not affect real runs until `npm run build` refreshes `dist/`.

Verification:
- `cd infra/scheduler && npm test -- backend-all.test.ts` -> `Test Files 1 passed`, `Tests 21 passed`
- `cd infra/scheduler && npm test -- backend-all.test.ts status.test.ts report/report.test.ts` -> `Test Files 3 passed`, `Tests 69 passed`
- `cd infra/scheduler && npm test -- backend-all.test.ts status.test.ts report/report.test.ts executor.test.ts` -> `Test Files 4 passed`, `Tests 97 passed`
- `cd infra/scheduler && npm test -- backend-all.test.ts executor.test.ts metrics.test.ts status.test.ts report/report.test.ts` -> `Test Files 6 passed`, `Tests 160 passed`
- `cd infra/scheduler && npm run build` -> success

### 2026-03-26 (Task-routing label migration to frontier tiers)

Migrated task-routing language from `[requires-opus]` to `[requires-frontier]` across active conventions, scheduler prompts/tests, and project task files. Added parser back-compat so legacy `[requires-opus]` still routes correctly during transition (`[requires-frontier]` is now canonical).

Verification:
- `cd infra/scheduler && npm test -- task-parser.test.ts event-agents.test.ts verify-approval.test.ts verify-knowledge.test.ts` -> `Test Files 4 passed`, `Tests 216 passed`

### 2026-03-26 — New project: Data Pipeline

Created `projects/data_pipeline/` via `/project scaffold`. Mission: build a reusable PyTorch-native data transformation pipeline that fits on one dataset, applies the learned transform to other datasets, and reconstructs data through inverse transforms where mathematically possible.

Sources: `projects/data_pipeline/README.md`

### 2026-03-26 (Orient akari + interim findings-first trend check at 8/10)

Ran `/orient akari` for `SESSION_ID=work-session-mn7d2ipt`, generated one mission-gap task because the only open task was externally blocked, completed the selected task, then ran `/compound fast`.

Orient findings:
- Repo state clean at session start (`git status --short --branch` showed `## main...origin/main`).
- No pending approvals in `APPROVAL_QUEUE.md`.
- `docs/roadmap.md` is still absent (`sed: docs/roadmap.md: No such file or directory`).
- No horizon-scan reports under `.scheduler/skill-reports/`.
- Findings-first gate remains enabled: scheduler work-cycle rolling non-zero-findings rate is `0/10 = 0.0%`.
- Efficiency summary (latest 10 work-cycle sessions): `findings/$ = n/a` (`costUsd` total `0`), genuine waste `0/10 = 0.0%`, orient overhead `n/a` (no `numTurns > 10` sessions), avg cost/session `$0.00`, avg turns/session `1.0`.
- Cross-session patterns (using `infra/scheduler/src/patterns.ts` logic over last 10 sessions): none.
- External blocker freshness: `Evaluate findings-first gate impact after 10 scheduler sessions` remains validly blocked (`[blocked-by: external ... (2026-03-26)]`), with post-intervention scheduler work-cycle count now `8/10`.
- Budget/deadline status: `projects/pca_vs_ttd/budget.yaml` remains within limits (`llm_api_calls 0/0`, `cpu_hours 0/0.1`, deadline `2026-06-01T00:00:00Z`), and no project has `progress.json` files carrying `consumption_audit` entries for ledger reconciliation.

Task supply update:
- Added one mission-gap task to `projects/akari/TASKS.md`:
  - `Quantify interim findings-first trend at 8/10 post-intervention sessions`

Task selection and claim:
- Selected task: `Quantify interim findings-first trend at 8/10 post-intervention sessions`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"85e37fc0abd01120","taskId":"d81a0257936c","taskText":"Quantify interim findings-first trend at 8/10 post-intervention sessions","project":"akari","agentId":"work-session-mn7d2ipt",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) - local metrics analysis and documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added interim data snapshot: `projects/akari/analysis/findings-first-interim-window-2026-03-26-8of10.json`.
- Added analysis artifact: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-8of10.md`.
- Updated `projects/akari/TASKS.md`:
  - added and completed the 8/10 mission-gap task with evidence and verification output.

Verification:
- `node - <<'NODE' ... d.derived ... NODE`
  - `post_window_scheduler_work_cycles 8`
  - `post_non_zero_findings_sessions 0`
  - `post_failed_sessions 0`
- `rg -n "Baseline non-zero-findings rate|Post-intervention non-zero-findings rate|Post-intervention failed-session rate|Interim trend classification|Remaining sessions until unblock threshold" projects/akari/analysis/findings-first-interim-trend-2026-03-26-8of10.md`
  - matched baseline and post-window rate lines (`2/9`, `0/8`, `0/8`), trend label (`worse`), and remaining-session arithmetic (`10 - 8 = 2`).

Compound (fast): no actions. Fleet spot-check: no recent `"triggerSource":"fleet"` sessions.

Session-type: autonomous
Duration: 18
Task-selected: Quantify interim findings-first trend at 8/10 post-intervention sessions
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + interim findings-first trend check at 7/10)

Ran `/orient akari` for `SESSION_ID=work-session-mn7axcr7`, generated one mission-gap task because the only open task was externally blocked, completed the selected task, then ran `/compound fast`.

Orient findings:
- Repo state clean at session start (`git status --short --branch` showed only `## main...origin/main`).
- No pending approvals in `APPROVAL_QUEUE.md`.
- `docs/roadmap.md` is still absent (`sed: docs/roadmap.md: No such file or directory`).
- No horizon-scan reports under `.scheduler/skill-reports/`.
- Findings-first gate remains enabled: scheduler work-cycle rolling non-zero-findings rate is `0/10 = 0.0%`.
- Efficiency summary (latest 10 work-cycle sessions): `findings/$ = n/a` (`costUsd` total `0`), genuine waste `0/10 = 0.0%`, orient overhead `n/a` (no `numTurns > 10` sessions), avg cost/session `$0.00`, avg turns/session `1.0`.
- Cross-session patterns (using `infra/scheduler/src/patterns.ts` logic over last 10 sessions): none.
- External blocker freshness: `Evaluate findings-first gate impact after 10 scheduler sessions` remains validly blocked (`[blocked-by: external ... (2026-03-26)]`), with post-intervention scheduler work-cycle count now `7/10`.
- Budget/deadline status: `projects/pca_vs_ttd/budget.yaml` remains within limits (`llm_api_calls 0/0`, `cpu_hours 0/0.1`, deadline `2026-06-01T00:00:00Z`), with no `progress.json` files carrying `consumption_audit` entries for reconciliation.

Task supply update:
- Added one mission-gap task to `projects/akari/TASKS.md`:
  - `Quantify interim findings-first trend at 7/10 post-intervention sessions`

Task selection and claim:
- Selected task: `Quantify interim findings-first trend at 7/10 post-intervention sessions`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"5017a90983dab7fb","taskId":"6fcc45248d2f","taskText":"Quantify interim findings-first trend at 7/10 post-intervention sessions","project":"akari","agentId":"work-session-mn7axcr7",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) - local metrics analysis and documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added interim data snapshot: `projects/akari/analysis/findings-first-interim-window-2026-03-26-7of10.json`.
- Added analysis artifact: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-7of10.md`.
- Updated `projects/akari/TASKS.md`:
  - added and completed the 7/10 mission-gap task with evidence and verification output.

Verification:
- `node - <<'NODE' ... d.derived ... NODE`
  - `post_window_scheduler_work_cycles 7`
  - `post_non_zero_findings_sessions 0`
  - `post_failed_sessions 0`
- `rg -n "Baseline non-zero-findings rate|Post-intervention non-zero-findings rate|Post-intervention failed-session rate|Interim trend classification|Remaining sessions until unblock threshold" projects/akari/analysis/findings-first-interim-trend-2026-03-26-7of10.md`
  - matched baseline and post-window rate lines (`2/9`, `0/7`, `0/7`), trend label (`worse`), and remaining-session arithmetic (`10 - 7 = 3`).

Compound (fast): no actions. Fleet spot-check: no recent `"triggerSource":"fleet"` sessions.

Session-type: autonomous
Duration: 18
Task-selected: Quantify interim findings-first trend at 7/10 post-intervention sessions
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + interim findings-first trend check at 6/10)

Ran `/orient akari` for `SESSION_ID=work-session-mn78s6tq`, generated one mission-gap task because the only open task was externally blocked, then completed the selected task.

Orient findings:
- Repo state clean at session start (`git status --short` returned no rows).
- No pending approvals in `APPROVAL_QUEUE.md`.
- `docs/roadmap.md` is still absent (`sed: docs/roadmap.md: No such file or directory`).
- No horizon-scan reports under `.scheduler/skill-reports/`.
- Findings-first gate remains enabled: scheduler work-cycle rolling non-zero-findings rate is `0/10 = 0.0%`.
- Efficiency summary (latest 10 sessions): `findings/$ = n/a` (`costUsd` total `0`), genuine waste `0/10 = 0.0%`, orient overhead `n/a` (no `numTurns > 10` sessions), avg cost/session `$0.00`, avg turns/session `1.0`.
- Cross-session patterns (using `infra/scheduler/src/patterns.ts` logic over last 10 sessions): none.
- External blocker freshness: `Evaluate findings-first gate impact after 10 scheduler sessions` remains validly blocked (`[blocked-by: external ... (2026-03-26)]`), with post-intervention scheduler work-cycle count now `6/10`.
- Budget/deadline status: `projects/pca_vs_ttd/budget.yaml` remains within limits (`llm_api_calls 0/0`, `cpu_hours 0/0.1`, deadline `2026-06-01T00:00:00Z`), with no `progress.json` files carrying `consumption_audit` entries for reconciliation.

Task supply update:
- Added one mission-gap task to `projects/akari/TASKS.md`:
  - `Quantify interim findings-first trend at 6/10 post-intervention sessions`

Task selection and claim:
- Selected task: `Quantify interim findings-first trend at 6/10 post-intervention sessions`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"c80d415f4d02934f","taskId":"1026ac2236a4","taskText":"Quantify interim findings-first trend at 6/10 post-intervention sessions","project":"akari","agentId":"work-session-mn78s6tq",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) - local metrics analysis and documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added interim data snapshot: `projects/akari/analysis/findings-first-interim-window-2026-03-26-6of10.json`.
- Added analysis artifact: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-6of10.md`.
- Updated `projects/akari/TASKS.md`:
  - added and completed the 6/10 mission-gap task with evidence and verification output.

Verification:
- `node - <<'NODE' ... d.derived ... NODE`
  - `post_window_scheduler_work_cycles 6`
  - `post_non_zero_findings_sessions 0`
  - `post_failed_sessions 0`
- `rg -n "Baseline non-zero-findings rate|Post-intervention non-zero-findings rate|Post-intervention failed-session rate|Interim trend classification|Remaining sessions until unblock threshold" projects/akari/analysis/findings-first-interim-trend-2026-03-26-6of10.md`
  - matched baseline and post-window rate lines (`2/9`, `0/6`, `0/6`), trend label (`worse`), and remaining-session arithmetic (`10 - 6 = 4`).

Session-type: autonomous
Duration: 18
Task-selected: Quantify interim findings-first trend at 6/10 post-intervention sessions
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + interim findings-first trend check at 5/10)

Ran `/orient akari` for `SESSION_ID=work-session-mn76n0v1`, generated one mission-gap task because the only open task was externally blocked, completed the selected task, then ran `/compound fast`.

Orient findings:
- Repo state clean at session start (`git status --short --branch` showed only `## main...origin/main`).
- No pending approvals in `APPROVAL_QUEUE.md`.
- Findings-first gate remains enabled: scheduler work-cycle rolling non-zero-findings rate is `0/10 = 0.0%`.
- Efficiency summary for latest 10 work-cycle sessions: `findings/$ = n/a` (`costUsd` total `0`), genuine waste `1/10 = 10.0%`, orient overhead `n/a` (no `numTurns > 10` sessions), avg cost/session `$0.00`, avg turns/session `0.9`.
- Cross-session patterns (using `infra/scheduler/src/patterns.ts` logic over last 10 sessions): none.
- External blocker freshness: `Evaluate findings-first gate impact after 10 scheduler sessions` remains validly blocked (`[blocked-by: external ... (2026-03-26)]`, not stale).
- Budget/deadline status: `projects/pca_vs_ttd/budget.yaml` remains within limits (`llm_api_calls 0/0`, `cpu_hours 0.1/0.1`, deadline `2026-06-01T00:00:00Z`), with no `progress.json` files for ledger reconciliation.

Task supply update:
- Added one mission-gap task to `projects/akari/TASKS.md`:
  - `Quantify interim findings-first trend at 5/10 post-intervention sessions`

Task selection and claim:
- Selected task: `Quantify interim findings-first trend at 5/10 post-intervention sessions`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"7ab6f28525032449","taskId":"65bd55fcfbd1","taskText":"Quantify interim findings-first trend at 5/10 post-intervention sessions","project":"akari","agentId":"work-session-mn76n0v1",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) - local metrics analysis and documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added interim data snapshot: `projects/akari/analysis/findings-first-interim-window-2026-03-26-5of10.json`.
- Added analysis artifact: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-5of10.md`.
- Updated `projects/akari/TASKS.md`:
  - added and completed the 5/10 mission-gap task with evidence and verification output.

Verification:
- `node - <<'NODE' ... d.derived ... NODE`
  - `post_window_scheduler_work_cycles 5`
  - `post_non_zero_findings_sessions 0`
  - `post_failed_sessions 0`
- `rg -n "Baseline non-zero-findings rate|Post-intervention non-zero-findings rate|Post-intervention failed-session rate|Interim trend classification|Remaining sessions until unblock threshold" projects/akari/analysis/findings-first-interim-trend-2026-03-26-5of10.md`
  - matched baseline and post-window rate lines (`2/9`, `0/5`, `0/5`), trend label (`worse`), and remaining-session arithmetic (`10 - 5 = 5`).

Compound (fast): no actions. Fleet spot-check: no recent `"triggerSource":"fleet"` sessions.

Session-type: autonomous
Duration: 16
Task-selected: Quantify interim findings-first trend at 5/10 post-intervention sessions
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + interim findings-first trend check at 4/10)

Ran `/orient akari` for `SESSION_ID=work-session-mn74huxu`, generated one mission-gap task because the only open task was externally blocked, completed the selected task, then ran `/compound fast`.

Orient findings:
- Repo state clean at session start (`git status --short --branch` showed only `## main...origin/main`).
- No pending approvals in `APPROVAL_QUEUE.md`.
- Findings-first gate remains enabled: scheduler work-cycle rolling non-zero-findings rate is `0/10 = 0.0%`.
- Efficiency summary for latest 10 work-cycle sessions: `findings/$ = n/a` (`costUsd` total `0`), genuine waste `1/10 = 10.0%`, orient overhead `n/a` (no `numTurns > 10` sessions), avg cost/session `$0.00`, avg turns/session `0.8`.
- Cross-session patterns (using `infra/scheduler/src/patterns.ts` logic over last 10 sessions): none.
- External blocker freshness: `Evaluate findings-first gate impact after 10 scheduler sessions` remains validly blocked; post-intervention scheduler work-cycle count is `4` (threshold is `10`).

Task supply update:
- Added one mission-gap task to `projects/akari/TASKS.md`:
  - `Quantify interim findings-first trend at 4/10 post-intervention sessions`

Task selection and claim:
- Selected task: `Quantify interim findings-first trend at 4/10 post-intervention sessions`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"16d0f5d4319a6101","taskId":"2e0969c3bc6e","taskText":"Quantify interim findings-first trend at 4/10 post-intervention sessions","project":"akari","agentId":"work-session-mn74huxu",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) — local metrics analysis and documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added interim data snapshot: `projects/akari/analysis/findings-first-interim-window-2026-03-26.json`.
- Added analysis artifact: `projects/akari/analysis/findings-first-interim-trend-2026-03-26.md`.
- Updated `projects/akari/TASKS.md`:
  - added the mission-gap task and completed it with evidence and verification output.

Verification:
- `node - <<'NODE' ... derived.post_window_scheduler_work_cycles ... NODE`
  - `post_window_scheduler_work_cycles 4`
  - `post_non_zero_findings_sessions 0`
  - `post_failed_sessions 0`
- `rg -n "Baseline non-zero-findings rate|Post-intervention non-zero-findings rate|Post-intervention failed-session rate|Interim trend classification|Remaining sessions until unblock threshold" projects/akari/analysis/findings-first-interim-trend-2026-03-26.md`
  - matched baseline and post-window rate lines (`2/9`, `0/4`, `0/4`), trend label (`worse`), and remaining-session arithmetic (`10 - 4 = 6`).

Compound (fast): no actions. Fleet spot-check: no recent `"triggerSource":"fleet"` sessions.

Session-type: autonomous
Duration: 17
Task-selected: Quantify interim findings-first trend at 4/10 post-intervention sessions
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + findings accounting implementation)

Ran `/orient akari` for `SESSION_ID=work-session-mn72cp1k`, selected the only unblocked high-priority task, implemented it, then ran `/compound fast`.

Orient findings:
- Repo state clean at session start (`git status --short --branch` showed only `## main...origin/main`).
- No pending approvals in `APPROVAL_QUEUE.md`.
- Findings-first gate remains enabled from scheduler work-cycle metrics: `0/10 = 0.0%`.
- Efficiency summary for latest 10 work-cycle sessions: `findings/$ = n/a` (`costUsd` total `0`), genuine waste `1/10 = 10.0%`, orient overhead `n/a` (no `numTurns > 10` sessions), avg cost/session `$0.00`, avg turns/session `0.7`.
- Cross-session patterns from `infra/scheduler/src/patterns.ts` logic: none in the latest 10-session window.
- External blocker freshness: `Evaluate findings-first gate impact...` is tagged `[blocked-by: external ... (2026-03-26)]` and is not stale.
- No recent horizon-scan reports under `.scheduler/skill-reports/`.

Task selection and claim:
- Selected task: `Implement findings accounting for quantified diagnosis/analysis artifacts`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"6256eae1572ae1c4","taskId":"555dbbe39b7c","taskText":"Implement findings accounting for quantified diagnosis/analysis artifacts","project":"akari","agentId":"work-session-mn72cp1k",...}}`

Scope classification:
- `STRUCTURAL (verifiable)` with `consumes_resources: false` (local infra code + tests only; no model/API/GPU/long-running execution).

Completed work:
- Updated `infra/scheduler/src/verify.ts` (`parseKnowledgeFromDiff`) to increment `logEntryFindings` for numbered, quantified findings in `projects/*/(analysis|diagnosis|postmortem)/*.md` only when provenance signals are present.
- Added provenance-gated regression fixtures in `infra/scheduler/src/verify-knowledge.test.ts`:
  - positive fixture: quantified diagnosis findings with explicit evidence/source lines,
  - negative fixture: quantified findings without provenance (must not count).
- Updated `projects/akari/TASKS.md` to mark the implementation task complete with evidence.

Verification:
- `cd infra/scheduler && npx vitest run src/verify-knowledge.test.ts`
  - `Test Files  1 passed (1)`
  - `Tests  77 passed (77)`
- `cd infra/scheduler && npx vitest run src/verify.test.ts`
  - `Test Files  1 passed (1)`
  - `Tests  1 passed (1)`

Compound (fast): no actions. Fleet spot-check: no recent `"triggerSource":"fleet"` sessions in `.scheduler/metrics/sessions.jsonl`.

Session-type: autonomous
Duration: 8
Task-selected: Implement findings accounting for quantified diagnosis/analysis artifacts
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + zero-findings persistence diagnosis)

Ran `/orient akari` for `SESSION_ID=work-session-mn707j4n`, then selected and completed a mission-gap diagnosis task from `projects/akari/TASKS.md`.

Orient findings:
- Repo state clean at session start (`git status --short` returned no rows).
- No pending approvals in `APPROVAL_QUEUE.md`.
- `docs/roadmap.md` is still absent (`sed: docs/roadmap.md: No such file or directory`).
- Findings-first gate remains enabled from scheduler work-cycle metrics: `0/9 = 0.0%` non-zero-findings sessions.
- External blocker freshness: one external blocker in `projects/akari/TASKS.md`, dated `2026-03-26` (not stale).
- Mission-gap task supply at session start was empty for unblocked work (`open_tasks_at_session_start=1`, `unblocked_open_tasks_at_session_start=0`), so a new mission-gap task was generated.

Task selection and claim:
- Selected task: `Diagnose persistent zero-findings sessions after gate rollout`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"dc097038fb28f3b0","taskId":"fdbaa88bb65f","taskText":"Diagnose persistent zero-findings sessions after gate rollout","project":"akari","agentId":"work-session-mn707j4n",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) — diagnosis/documentation only; no LLM API calls, external APIs, GPU compute, or long-running jobs.

Completed work:
- Added diagnosis artifact: `projects/akari/diagnosis/diagnosis-zero-findings-after-gate-2026-03-26.md`.
- Added reproducible window snapshot: `projects/akari/diagnosis/zero-findings-window-2026-03-26.json`.
- Updated `projects/akari/TASKS.md`:
  - generated and completed the mission-gap diagnosis task,
  - added follow-up task `Implement findings accounting for quantified diagnosis/analysis artifacts`.

Verification:
- `rg -n 'Non-zero findings rate|Sessions with analysis artifacts|Hypothesis 1|Hypothesis 2|post-rollout sample' projects/akari/diagnosis/diagnosis-zero-findings-after-gate-2026-03-26.md`
  - confirms quantified rates (`0/9`, `2/9`) and root-cause hypotheses are recorded.
- `node - <<'NODE' ... require('./projects/akari/diagnosis/zero-findings-window-2026-03-26.json') ... NODE`
  - `window_n 9`
  - `non_zero_findings_sessions 0`
  - `analysis_sessions 2`
  - `tasks_created_total 4`
  - `turns_avg 0.4444`
- `rg -n 'Diagnose persistent zero-findings sessions after gate rollout|Implement findings accounting for quantified diagnosis/analysis artifacts' projects/akari/TASKS.md`
  - diagnosis task marked complete; follow-up implementation task present.

Session-type: autonomous
Duration: 26
Task-selected: Diagnose persistent zero-findings sessions after gate rollout
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + zero-cost KPI definition)

Ran `/orient akari` (full scoped orient) for `SESSION_ID=work-session-mn6y2d6g`, then completed the selected analysis task.

Orient findings:
- Repo state clean (`git status --short` returned no rows).
- No pending approvals (`APPROVAL_QUEUE.md` pending section empty).
- No horizon-scan reports found under `.scheduler/skill-reports/`.
- Findings-first gate: enabled (`0/8 = 0.0%` scheduler work-cycle sessions with non-zero findings).
- Efficiency summary (latest 10 sessions): `findings/$ = n/a` (`costUsd` sum is `0`), genuine waste `3/10 = 30.0%`, orient overhead `n/a` (no sessions with `numTurns > 10`), avg cost/session `$0.00`, avg turns/session `1.0`.
- Cross-session patterns from `infra/scheduler/src/patterns.ts` logic: none detected in latest 10-session window.
- External-work status: no stale external blockers in `projects/akari/TASKS.md` (`[blocked-by: external ... (2026-03-26)]` is current-day).

Task selection and claim:
- Selected task: `Define a primary efficiency KPI for zero-cost sessions`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{\"ok\":true,\"claim\":{\"claimId\":\"75e3e16bc093a58b\",\"taskId\":\"ea3a4972327d\",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) — analysis/documentation only; no LLM API calls, external APIs, GPU work, or long-running compute.

Completed work:
- Added `projects/akari/analysis/zero-cost-efficiency-kpi-2026-03-26.md` with:
  - primary KPI: `findings_per_session = sum(findings_i) / N`,
  - fallback KPI: `non_zero_findings_rate = count(findings_i > 0) / N`,
  - denominator-switch rule for orient reporting when `sum(costUsd) == 0`.
- Updated `projects/akari/TASKS.md` to complete `Define a primary efficiency KPI for zero-cost sessions` with evidence.

Verification:
- `rg -n "Primary KPI \(zero-cost\)|Fallback KPI \(zero-cost\)|denominator switch rule|findings_per_session|non_zero_findings_rate|sum\(costUsd\) == 0" projects/akari/analysis/zero-cost-efficiency-kpi-2026-03-26.md`
  - matched KPI formulas and orient switch-rule lines.
- `rg -n "Define a primary efficiency KPI for zero-cost sessions|zero-cost-efficiency-kpi-2026-03-26.md|Evaluate findings-first gate impact" projects/akari/TASKS.md`
  - task marked complete with evidence; follow-up evaluation task remains open/blocked.
- `node - <<'NODE' ... NODE` (scheduler work-cycle window)
  - `scheduler_work_cycle_window=8`
  - `findings_per_session=0/8=0.000`
  - `non_zero_findings_rate=0/8=0.0%`

Compound (fast): no actions. Fleet spot-check: no recent `"triggerSource":"fleet"` sessions in `.scheduler/metrics/sessions.jsonl`.

Session-type: autonomous
Duration: 20
Task-selected: Define a primary efficiency KPI for zero-cost sessions
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Implement findings-first orient gate intervention)

Ran `/orient akari` (full scoped orient) for `SESSION_ID=work-session-mn6vx78h`, then completed the selected intervention task.

Orient findings:
- Repo state clean (`git status --short` returned no rows).
- No pending approvals (`APPROVAL_QUEUE.md` pending section empty) and no stale external blockers found in `projects/*/TASKS.md`.
- No recent horizon-scan reports under `.scheduler/skill-reports/`.
- Rolling scheduler work-cycle non-zero-findings rate is currently `0/7 = 0.0%`, so the findings-first gate condition (`<30%`) is active.

Task selection and claim:
- Selected task: `Implement the findings-first orient gate intervention`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{"ok":true,"claim":{"claimId":"f3e5f38f8476d02b","taskId":"37671df9c46f",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) — skill/task documentation updates only; no LLM/API/GPU/long-running execution.

Completed work:
- Updated `.agents/skills/orient/SKILL.md` to add a findings-first gate in both fast and full orient:
  - rolling scheduler work-cycle non-zero-findings metric definition,
  - enforcement rule when rate is `<30%`,
  - required gate-state reporting (`enabled/disabled` with arithmetic).
- Updated `projects/akari/TASKS.md` to complete `Implement the findings-first orient gate intervention`.
- Added follow-up task `Evaluate findings-first gate impact after 10 scheduler sessions` with a blocker until enough post-intervention scheduler sessions accumulate.

Verification:
- `rg -n "Findings-first gate \(akari intervention\)|< 30%|selected task must have a findings-producing Done-when|rolling non-zero-findings rate" .agents/skills/orient/SKILL.md`
  - matched fast gate section, full gate section, and efficiency-summary gate metric/reporting lines.
- `rg -n "Evaluate findings-first gate impact after 10 scheduler sessions|blocked-by: external: wait for 10 post-intervention scheduler sessions" projects/akari/TASKS.md`
  - `118:- [ ] Evaluate findings-first gate impact after 10 scheduler sessions ...`
- `node - <<'NODE' ... NODE` (scheduler-only work-cycle window)
  - `scheduler_work_cycle_window=7`
  - `non_zero_findings=0`
  - `rate_pct=0.0`

Compound (fast): no additional actions. Fleet spot-check: no recent `"triggerSource":"fleet"` sessions in `.scheduler/metrics/sessions.jsonl`.

Session-type: autonomous
Duration: 24
Task-selected: Implement the findings-first orient gate intervention
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 (Orient akari + strategic alignment snapshot)

Ran `/orient akari` (full scoped orient). Repo state was clean; `projects/akari/TASKS.md` had no open tasks, so mission-gap tasks were generated before selection.

Orient findings:
- `docs/roadmap.md` is missing in this checkout (`sed: docs/roadmap.md: No such file or directory`), which leaves no canonical global strategic-question source for orient.
- Last-10 session window (`.scheduler/metrics/sessions.jsonl`) had `6` total findings (`newExperimentFindings + logEntryFindings`) across `2/10` sessions; `findings/$` is currently `n/a` because `costUsd` is `0` across that window.
- No pending approval items and no stale external blockers were found.

Task selection and claim:
- Selected task: `Create akari strategic alignment snapshot from current artifacts`.
- Claim API: `curl -s -X POST http://localhost:8420/api/tasks/claim ...` returned `{\"ok\":true,\"claim\":{\"claimId\":\"e1bd007b97637cab\",...}}`.

Scope classification:
- `ROUTINE` (`consumes_resources: false`) — analysis/documentation-only updates with no LLM/API/GPU/long-running execution.

Completed work:
- Added `projects/akari/analysis/strategic-alignment-snapshot-2026-03-26.md` with 5 prioritized self-improvement questions and evidence/task links.
- Updated `projects/akari/README.md` `## Open questions` to reflect current strategic priorities from the snapshot.
- Added mission-gap tasks in `projects/akari/TASKS.md`, completed the selected snapshot task with evidence, and added one compound follow-up task for zero-cost KPI definition.

Verification:
- `python - <<'PY' ... PY`
  - `analysis_questions 5`
  - `readme_open_questions 6`
  - `has_findings_rate_task True`
  - `has_zero_cost_kpi_task True`

Compound (fast): 1 action — added task `Define a primary efficiency KPI for zero-cost sessions` based on uncovered task gaps in the new snapshot.

Session-type: autonomous
Duration: 21
Task-selected: Create akari strategic alignment snapshot from current artifacts
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-25 (Orient akari + findings-rate intervention design)

Ran `/orient akari` (full scoped orient) for `SESSION_ID=work-session-mn6ts1a7`. Repo state was clean.

Orient findings:
- No orphaned work (`git status --short` returned no rows).
- No pending approvals (`APPROVAL_QUEUE.md` pending section empty) and no stale external blockers (`rg -n "\\[blocked-by: external: ...\\]" projects/*/TASKS.md` returned no matches).
- `docs/roadmap.md` is still absent (`sed: docs/roadmap.md: No such file or directory`).
- Recent efficiency window remains low on findings incidence: `2/10 = 20%` sessions with non-zero findings (all-session window), with `6` findings total; `findings/$` remains `n/a` because `costUsd` is `0`.
- No recent horizon-scan reports found under `.scheduler/skill-reports/`.

Task selection and claim:
- Selected task: `Design an intervention to increase non-zero-findings session rate`.
- Claim API:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim ...`
  - `{\"ok\":true,\"claim\":{\"claimId\":\"8ae0ae469774f733\",\"taskId\":\"3f0831a71470\",...}}`

Scope classification:
- `ROUTINE` (`consumes_resources: false`) — planning/documentation only; no LLM/API/GPU/long-running execution.

Completed work:
- Added `projects/akari/plans/2026-03-25-findings-rate-intervention.md` with one explicit intervention, fixed pre/post windows, and quantitative success/refutation thresholds.
- Completed task `Design an intervention to increase non-zero-findings session rate` in `projects/akari/TASKS.md` with evidence.
- Added follow-up task `Implement the findings-first orient gate intervention` to execute and measure the designed intervention.

Verification:
- `node - <<'NODE' ... NODE`
  - `last10_all {\"n\":10,\"nonZeroFindings\":2,\"nonZeroRate\":0.2,\"failed\":0,\"failedRate\":0}`
  - `last10_scheduler_only {\"n\":9,\"nonZeroFindings\":2,\"nonZeroRate\":0.2222222222222222,\"failed\":0,\"failedRate\":0}`
- `rg -n "Hypothesis:|Intervention definition|Baseline snapshot|Success criteria|>= 40%|next 10 scheduler sessions" projects/akari/plans/2026-03-25-findings-rate-intervention.md`
  - matched hypothesis, baseline, intervention, and success-threshold lines (`>= 40%`).

Compound (fast): no actions. Fleet spot-check result: `Fleet: no recent sessions.`

Session-type: autonomous
Duration: 22
Task-selected: Design an intervention to increase non-zero-findings session rate
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-25 (Codex-only module-oriented repo policy)

Implemented the repo split that keeps `projects/` as the durable memory layer and moves project-owned code plus heavy runtime artifacts to `modules/`. Added `modules/registry.yaml` as the project-to-module registry, updated experiment schema/conventions to require `module` and `artifacts_dir` for executable work records, and refactored the experiment runner so `progress.json` stays next to `EXPERIMENT.md` while runtime logs, lock files, watched CSVs, and heavy outputs live under `modules/<package>/artifacts/<experiment-id>/`.

Added L0 enforcement for the new layout in scheduler verification: committed source files and runtime artifact trees under `projects/` now fail verification, executable `EXPERIMENT.md` records without module metadata now fail verification, and active experiment directories only treat lightweight progress files as expected worktree changes. Also updated active scheduler prompts and current Codex-facing docs/skills to resolve module context from `modules/registry.yaml` and removed retired agent-specific references from active paths.

Artifacts:
- `modules/registry.yaml`
- `projects/akari/plans/2026-03-25-codex-only-module-oriented-repo-policy.md`

Verification:
- `pytest infra/experiment-runner/test_run.py infra/experiment-validator/test_validate.py`
  - `226 passed in 7.86s`
- `npm test --prefix infra/scheduler -- src/cli-add.test.ts src/verify-experiment.test.ts src/verify-compliance.test.ts src/codex-only-references.test.ts`
  - `Test Files  4 passed (4)`
  - `Tests  205 passed (205)`
- `cd infra/scheduler && npx tsc --noEmit`
  - passed

Session-type: interactive
Duration: 60
Task-selected: Implement the Codex-only module-oriented repo policy
Task-completed: yes
Approvals-created: 0
Files-changed: 27
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-25 (Self-improvement loop example + re-run health watchdog)

Completed a concrete, repo-local self-improvement loop write-up by recomputing the “before” error distribution from `.scheduler/metrics/sessions.jsonl`, then re-running the scheduler watchdog over the latest 20 sessions.

Artifacts:
- `projects/akari/analysis/self-improvement-loop-example-2026-03-25.md`
- `projects/akari/plans/2026-03-25-work-session-mn6rn3kx.md`

Verification:
- `node infra/scheduler/dist/cli.js watchdog --limit 20`
  - `Analyzed 20 sessions.`
  - `:white_check_mark: Session health watchdog: all clear. No anomalies detected.`

Session-type: autonomous
Duration: 6
Task-selected: Add one local example of a successful self-improvement loop
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

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

- How should strategic alignment be sourced while `docs/roadmap.md` is absent in this checkout?
- Which intervention can raise the non-zero-findings session rate above 20% (currently 2/10 in the latest window) without increasing failure rates?
- Should `findings/$` remain a primary KPI for Codex-local sessions where `costUsd` is frequently 0?
- Which knowledge fields should be treated as research progress versus operational maintenance in efficiency reporting?
- How should scheduler-run autonomous sessions handle newly surfaced foreign worktree files: auto-ignore, preflight auto-commit, or exit with a machine-readable blocked status instead of asking an interactive question?
- What minimum cadence of explicit self-observation analysis keeps task selection aligned with the mission instead of drifting to maintenance-only work?
- Which kinds of capability improvements transfer across projects, and which depend on repository-specific history and conventions?
- Should scheduler-side empty-queue preflight auto-generate mission-gap work, or return an explicit `empty_queue` result for a separate task-supply path to handle?
- How should scheduler deployment guarantee that health-monitoring source fixes are reflected in the live `dist` runtime before alerts are emitted?
