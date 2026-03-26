# akari - Next actions

## Meta-project setup

- [x] Adapt the self-improvement measurement plan to your own repo [requires-frontier] [skill: design] [zero-resource]
  Why: The public examples show the pattern, but each deployment needs its own metrics, denominators, and failure modes.
  Done when: A repo-specific measurement plan exists with 3-5 concrete metrics and explicit data sources. (Implemented in `projects/akari/plans/2026-03-24-self-improvement-measurement-local.md`.)
  Priority: high

- [x] Align task-claim SOP with scheduler API [requires-frontier] [skill: execute] [zero-resource]
  Why: The SOP recommends claiming tasks via `/api/tasks/claim`, but the local scheduler API may not expose this endpoint yet (claim attempts can return `{\"error\":\"not found\"}`).
  Evidence: 2026-03-24 `curl -s -X POST http://localhost:8420/api/tasks/claim ...` returned `{\"error\":\"not found\"}`.
  Done when: Scheduler control API supports task claiming with conflict detection (implemented).
  Priority: medium

- [x] Measure human intervention rate in your deployment [fleet-eligible] [skill: analyze] [zero-resource]
  Why: A decreasing intervention rate is one of the clearest signals that the system is becoming more autonomous.
  Done when: A short analysis computes intervention events per session over at least 2 time windows and records the result.
  Priority: medium
  Evidence: `projects/akari/analysis/human-intervention-rate-2026-03-25.md`

- [x] Reconcile missing doc references in SOP/skills [requires-frontier] [skill: govern] [zero-resource]
  Why: `/orient` and `docs/sops/autonomous-work-cycle.md` reference `docs/status.md` and `docs/conventions/*`, but this repo checkout does not contain those paths (attempts to read them fail with "No such file or directory"). This causes repeated orient friction and can hide real missing-context issues.
  Done when: Either (a) the referenced docs exist with correct content, or (b) the SOP/skill/AGENTS references are updated to only point at existing docs (or to explicitly treat them as optional with fallback behavior).
  Priority: medium
  Evidence: Added `docs/status.md`, `docs/conventions/*`, and `docs/schemas/*`.

- [x] Write one self-observation diagnosis from operational evidence [requires-frontier] [skill: diagnose] [zero-resource]
  Why: The meta-project only becomes real when the system diagnoses its own failure modes from its own logs and artifacts.
  Done when: One diagnosis file identifies a concrete self-observation failure, cites evidence, and proposes a fix or follow-up task.
  Priority: medium
  Evidence: Implemented in `projects/akari/diagnosis/diagnosis-2026-03-25-codex-work-cycle-empty-output.md`.

- [x] Fix Codex work-cycle turn/output instrumentation [requires-frontier] [skill: execute] [zero-resource]
  Why: Some Codex `work-cycle` runs record `Turns: 0` and empty output, which makes self-observation and metrics analysis unreliable.
  Done when: A regression test fixture for Codex `--json` output passes, and `work-cycle` logs show `Turns > 0` and non-empty output for a non-idle session.
  Priority: medium
  Evidence: Diagnosis at `projects/akari/diagnosis/diagnosis-2026-03-25-codex-work-cycle-empty-output.md`.
  Evidence: Added Codex CLI stream-json parsing + tests; smoke log at `.scheduler/logs/work-cycle-2026-03-25T01-47-37-609Z.log`; fixture at `infra/scheduler/src/__fixtures__/codex-cli-json-stream.sample.jsonl`.

- [x] Re-verify Codex scheduler sessions record non-empty output and `Turns > 0` [requires-frontier] [skill: diagnose]
  Why: Despite the instrumentation fix + smoke log, subsequent scheduled runs still produced empty `.scheduler/logs/*` output with `Turns: 0`, which blocks metrics analysis and makes “fixed” claims unverifiable.
  Evidence: Empty output logs: `.scheduler/logs/work-cycle-2026-03-25T03-11-33-249Z.log`, `.scheduler/logs/pca-v-ttd-2026-03-25T02-23-32-461Z.log`.
  Evidence (2026-03-25): Codex CLI emits explicit `turn.*` events; a turn can contain only tool items and no `agent_message`. Implemented turn counting from `turn.completed` and a fallback to command execution `aggregated_output` when assistant text is empty (`infra/scheduler/src/backend.ts`), with regression coverage in `infra/scheduler/src/backend-all.test.ts`.
  Evidence (2026-03-25): `node infra/scheduler/dist/cli.js run <job-id>` did not append a `.scheduler/metrics/sessions.jsonl` row because `cmdRun()` updated job state but did not record structured metrics; fixed by recording metrics for manual runs in `infra/scheduler/src/cli.ts`.
  Verification (unit): `cd infra/scheduler && npx vitest run src/backend-all.test.ts` → `71 passed`
  Done when: A scheduled `work-cycle` run (not a smoke run) produces a log file with non-empty `## output` and `Turns > 0`, and the corresponding `.scheduler/metrics/sessions.jsonl` row reports `numTurns > 0`.
  Priority: high
  Evidence (E2E manual run): `.scheduler/logs/work-cycle-2026-03-25T15-23-15-092Z.log` shows `Turns: 1` and non-empty `## output` (`PING`).
  Evidence (metrics): `.scheduler/metrics/sessions.jsonl` row at `timestamp:"2026-03-25T15:23:17.280Z"` reports `jobName:"work-cycle"` and `numTurns:1` (triggerSource: `manual`).

- [x] Add one local example of a successful self-improvement loop [fleet-eligible] [skill: record] [zero-resource]
  Why: The strongest evidence for the meta-project is a full loop: detect a gap, change the system, then measure improvement.
  Done when: README log entry or analysis file records a before/after operational improvement with provenance.
  Priority: medium
  Evidence: `projects/akari/analysis/self-improvement-loop-example-2026-03-25.md`

## Model-only migration

- [x] Add a first-class Codex scheduler backend [requires-frontier] [skill: execute]
  Why: Codex is a supported interactive runtime via `AGENTS.md` and `.agents/skills/`, but the scheduler still only exposes `claude`, `cursor`, `opencode`, and `auto`.
  Done when: Scheduler jobs run with `--model ...` as the only user-facing selector (no `--backend`), tests cover runtime routing, and work-session execution no longer depends on pretending Codex is `opencode`.
  Priority: high

- [x] Split backend-agnostic spawn logic from Claude-specific presets [requires-frontier] [skill: execute]
  Why: `spawnAgent()` currently injects `claude_code` system prompt and tool presets for every backend, which blocks a clean Codex/OpenAI execution path.
  Done when: Runtime adapters own prompt/tool shaping, and regression coverage shows opencode, codex, and openai routes each using appropriate configuration.
  Priority: high

- [x] Audit deep-work and chat supervision for Codex/OpenAI compatibility [requires-frontier] [skill: diagnose] [zero-resource]
  Why: Plan auto-approval and live human message forwarding currently rely on Claude-only `streamInput` behavior.
  Done when: A written note classifies each supervision feature as preserved, degraded, or API-fallback-only for Codex/OpenAI with file-level evidence.
  Priority: medium

- [x] Rewrite setup docs to present Codex/OpenAI as the primary path [fleet-eligible] [skill: record] [zero-resource]
  Why: The repo now has Codex-facing artifacts, but the docs still teach a Claude-first mental model.
  Done when: `README.md`, `docs/getting-started.md`, and `infra/scheduler/README.md` present `AGENTS.md` and Codex/OpenAI-first examples without removing legacy backend compatibility notes.
  Priority: medium

- [x] Investigate session duration anomaly [detected: 2026-03-25] [skill: diagnose] [zero-resource]
  Why: anomaly-detection:durationMs — Duration 1213s exceeds P95 threshold 1193s
  Done when: Duration outlier explained and anomaly logic updated to avoid borderline P95 alerts.
  Priority: high
  Evidence: `projects/akari/diagnosis/diagnosis-scheduler-health-signals-2026-03-25.md`
  Evidence: `infra/scheduler/src/anomaly-detection.ts`

- [x] Re-run scheduler health checks after fixes [fleet-eligible] [skill: analyze] [zero-resource]
  Why: Confirm health monitoring no longer produces false positives for manual smoke runs and zero-cost budget-project sessions.
  Done when: A short note in `projects/akari/README.md` records the output of health + warning escalation over the most recent ≥20 sessions, with no `task_starvation` due to `triggerSource:\"manual\"` and no `ledger_inconsistent` recurrence when `costUsd: 0`.
  Priority: medium
  Evidence: `projects/akari/README.md` (2026-03-25 log entry “Self-improvement loop example + re-run health watchdog”)

## Mission gap tasks

- [x] Create akari strategic alignment snapshot from current artifacts [fleet-eligible] [skill: analyze] [zero-resource]
  Why: Mission gap — `Done when` requires measurable self-directed improvement over time, but `docs/roadmap.md` is missing so orient has no canonical strategic-question source.
  Done when: A dated analysis in `projects/akari/analysis/` enumerates 3-5 active self-improvement questions, links each to evidence/tasks, and updates `projects/akari/README.md` open questions.
  Priority: high
  Evidence: `projects/akari/analysis/strategic-alignment-snapshot-2026-03-26.md`

- [x] Design an intervention to increase non-zero-findings session rate [requires-frontier] [skill: design] [zero-resource]
  Why: Mission gap — the latest 10 session metrics show only 2/10 sessions with non-zero findings (`newExperimentFindings + logEntryFindings`), and there is no open task directly targeting this KPI.
  Done when: A plan in `projects/akari/plans/` defines one measurable intervention, a before/after window, and a concrete success threshold.
  Priority: high
  Evidence: `projects/akari/plans/2026-03-25-findings-rate-intervention.md`

- [x] Implement the findings-first orient gate intervention [requires-frontier] [skill: execute] [zero-resource]
  Why: The intervention is now designed but not applied; without implementation, the non-zero-findings KPI cannot improve or be measured post-change.
  Done when: `/orient` task selection behavior enforces the findings-first gate when rolling non-zero-findings rate is below 30%, and a follow-up analysis task is added to evaluate the next 10 scheduler sessions.
  Priority: high
  Evidence: Design spec in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`.
  Evidence: Gate rules added in `.agents/skills/orient/SKILL.md` (fast + full orient sections).
  Evidence: Follow-up task `Evaluate findings-first gate impact after 10 scheduler sessions` added below.

- [x] Define a primary efficiency KPI for zero-cost sessions [requires-frontier] [skill: analyze] [zero-resource]
  Why: Compound follow-up from `projects/akari/analysis/strategic-alignment-snapshot-2026-03-26.md` — `findings/$` is undefined when `costUsd` is zero across the evaluation window.
  Done when: A short analysis defines the primary KPI and fallback KPI for zero-cost sessions, with exact formulas and a recommendation for orient reporting.
  Priority: high
  Evidence: `projects/akari/analysis/zero-cost-efficiency-kpi-2026-03-26.md`

- [ ] Evaluate findings-first gate impact after 10 scheduler sessions [requires-frontier] [skill: analyze] [zero-resource] [blocked-by: external: wait for 10 post-intervention scheduler sessions (2026-03-26)]
  Why: Intervention follow-up — once the findings-first gate is active, we need a fixed-window post analysis to test whether non-zero-findings rate improves without increasing failures.
  Done when: A dated analysis computes post-intervention non-zero-findings rate and failed-session rate over the next 10 scheduler sessions, compares against baseline in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`, and records pass/refute/ambiguous outcome.
  Priority: high

- [x] Diagnose scheduler work-cycle cadence gap blocking 10-session findings evaluation [requires-frontier] [skill: diagnose] [zero-resource]
  Why: Mission gap — the intervention impact task is blocked at `9/10` post-intervention scheduler sessions because no scheduler `work-cycle` sessions were recorded after `2026-03-26T11:06:37Z`, so the project cannot complete the fixed-window measurement loop.
  Done when: A dated diagnosis in `projects/akari/diagnosis/` quantifies expected vs observed scheduler `work-cycle` cadence for the post-intervention window, identifies at least one evidence-backed cause for the gap, and adds at least one concrete follow-up task or unblock condition to `projects/akari/TASKS.md`.
  Priority: high
  Evidence: `projects/akari/diagnosis/diagnosis-scheduler-work-cycle-cadence-gap-2026-03-26.md`
  Evidence: `projects/akari/diagnosis/scheduler-work-cycle-cadence-gap-window-2026-03-26.json`
  Verification: `./akari status` -> `Daemon: stopped`, `Jobs: 1/2 enabled`, `“work-cycle” [disabled]`.

- [ ] Restore scheduler-driven `work-cycle` cadence needed for findings-first 10-session evaluation [requires-frontier] [skill: execute] [zero-resource]
  Why: Follow-up from `projects/akari/diagnosis/diagnosis-scheduler-work-cycle-cadence-gap-2026-03-26.md` — the evaluation task is blocked at `9/10` because the `work-cycle` scheduler path is disabled/stopped.
  Done when: `./akari status` reports `Daemon: running` and `“work-cycle” [enabled]`, and `.scheduler/metrics/sessions.jsonl` contains at least one new `triggerSource:\"scheduler\"` `work-cycle` row after `2026-03-26T11:06:37.442Z`.
  Priority: high

- [x] Quantify interim findings-first trend at 9/10 post-intervention sessions [requires-frontier] [skill: analyze] [zero-resource]
  Why: Mission gap — the final impact task remains externally blocked until 10 sessions, but the project Done-when requires continuous measurement of whether interventions improve knowledge output over time.
  Done when: A dated analysis in `projects/akari/analysis/` computes current post-intervention non-zero-findings and failed-session rates at the 9-session checkpoint (using `.scheduler/metrics/sessions.jsonl`), compares against the baseline in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`, and states trend classification (`improving`, `flat`, or `worse`) with explicit arithmetic and data provenance.
  Priority: high
  Evidence: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-9of10.md`
  Evidence: `projects/akari/analysis/findings-first-interim-window-2026-03-26-9of10.json`
  Verification: `node - <<'NODE' ... d.derived ... NODE` -> `post_window_scheduler_work_cycles 9`, `post_non_zero_findings_sessions 0`, `post_failed_sessions 0`.

- [x] Quantify interim findings-first trend at 8/10 post-intervention sessions [requires-frontier] [skill: analyze] [zero-resource]
  Why: Mission gap — the final impact task remains externally blocked until 10 sessions, but the project Done-when requires continuous measurement of whether interventions improve knowledge output over time.
  Done when: A dated analysis in `projects/akari/analysis/` computes current post-intervention non-zero-findings and failed-session rates at the 8-session checkpoint (using `.scheduler/metrics/sessions.jsonl`), compares against the baseline in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`, and states trend classification (`improving`, `flat`, or `worse`) with explicit arithmetic and data provenance.
  Priority: high
  Evidence: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-8of10.md`
  Evidence: `projects/akari/analysis/findings-first-interim-window-2026-03-26-8of10.json`
  Verification: `node - <<'NODE' ... d.derived ... NODE` -> `post_window_scheduler_work_cycles 8`, `post_non_zero_findings_sessions 0`, `post_failed_sessions 0`.

- [x] Quantify interim findings-first trend at 7/10 post-intervention sessions [requires-frontier] [skill: analyze] [zero-resource]
  Why: Mission gap — the final impact task is externally blocked until 10 sessions, but the project Done-when still requires ongoing measurement of whether interventions improve knowledge output over time.
  Done when: A dated analysis in `projects/akari/analysis/` computes current post-intervention non-zero-findings and failed-session rates at the 7-session checkpoint (using `.scheduler/metrics/sessions.jsonl`), compares against the baseline in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`, and states trend classification (`improving`, `flat`, or `worse`) with explicit arithmetic and data provenance.
  Priority: high
  Evidence: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-7of10.md`
  Evidence: `projects/akari/analysis/findings-first-interim-window-2026-03-26-7of10.json`
  Verification: `node - <<'NODE' ... d.derived ... NODE` -> `post_window_scheduler_work_cycles 7`, `post_non_zero_findings_sessions 0`, `post_failed_sessions 0`.

- [x] Quantify interim findings-first trend at 6/10 post-intervention sessions [requires-frontier] [skill: analyze] [zero-resource]
  Why: Mission gap — the final impact task remains externally blocked until 10 sessions, but the project Done-when requires continued measurement of whether interventions improve knowledge output over time.
  Done when: A dated analysis in `projects/akari/analysis/` computes current post-intervention non-zero-findings and failed-session rates at the 6-session checkpoint (using `.scheduler/metrics/sessions.jsonl`), compares against the baseline in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`, and states trend classification (`improving`, `flat`, or `worse`) with explicit arithmetic and data provenance.
  Priority: high
  Evidence: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-6of10.md`
  Evidence: `projects/akari/analysis/findings-first-interim-window-2026-03-26-6of10.json`
  Verification: `node - <<'NODE' ... derived.post_window_scheduler_work_cycles ... NODE` -> `post_window_scheduler_work_cycles 6`, `post_non_zero_findings_sessions 0`, `post_failed_sessions 0`.

- [x] Quantify interim findings-first trend at 5/10 post-intervention sessions [requires-frontier] [skill: analyze] [zero-resource]
  Why: Mission gap — the final impact task remains externally blocked until 10 sessions, but the project Done-when requires ongoing measurement of whether interventions improve knowledge output over time.
  Done when: A dated analysis in `projects/akari/analysis/` computes current post-intervention non-zero-findings and failed-session rates at the 5-session checkpoint (using `.scheduler/metrics/sessions.jsonl`), compares against the baseline in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`, and states trend classification (`improving`, `flat`, or `worse`) with explicit arithmetic and data provenance.
  Priority: high
  Evidence: `projects/akari/analysis/findings-first-interim-trend-2026-03-26-5of10.md`
  Evidence: `projects/akari/analysis/findings-first-interim-window-2026-03-26-5of10.json`
  Verification: `node - <<'NODE' ... derived.post_window_scheduler_work_cycles ... NODE` -> `post_window_scheduler_work_cycles 5`, `post_non_zero_findings_sessions 0`, `post_failed_sessions 0`.

- [x] Quantify interim findings-first trend at 4/10 post-intervention sessions [requires-frontier] [skill: analyze] [zero-resource]
  Why: Mission gap — the final impact task is still blocked pending 10 sessions, but the project's Done-when requires ongoing measurement of whether changes improve knowledge output over time.
  Done when: A dated analysis in `projects/akari/analysis/` computes current post-intervention non-zero-findings and failed-session rates (using `.scheduler/metrics/sessions.jsonl`), compares them to the baseline in `projects/akari/plans/2026-03-25-findings-rate-intervention.md`, and states interim trend classification (`improving`, `flat`, or `worse`) with explicit arithmetic and data provenance.
  Priority: high
  Evidence: `projects/akari/analysis/findings-first-interim-trend-2026-03-26.md`
  Evidence: `projects/akari/analysis/findings-first-interim-window-2026-03-26.json`
  Verification: `node - <<'NODE' ... derived.post_window_scheduler_work_cycles ... NODE` → `post_window_scheduler_work_cycles 4`, `post_non_zero_findings_sessions 0`, `post_failed_sessions 0`.

- [x] Diagnose persistent zero-findings sessions after gate rollout [requires-frontier] [skill: diagnose] [zero-resource]
  Why: Mission gap — the project still needs operational-gap identification from current data, and the rolling scheduler work-cycle non-zero-findings rate remains `0/9` after gate rollout.
  Done when: A dated diagnosis in `projects/akari/diagnosis/` quantifies knowledge-output patterns for the latest scheduler `work-cycle` window, identifies at least two evidence-backed causes for zero findings, and adds at least one concrete follow-up task to `projects/akari/TASKS.md`.
  Priority: high
  Evidence: `projects/akari/diagnosis/diagnosis-zero-findings-after-gate-2026-03-26.md`
  Evidence: `projects/akari/diagnosis/zero-findings-window-2026-03-26.json`

- [x] Implement findings accounting for quantified diagnosis/analysis artifacts [requires-frontier] [skill: execute] [zero-resource]
  Why: Follow-up from `projects/akari/diagnosis/diagnosis-zero-findings-after-gate-2026-03-26.md` — `2/9` scheduler work-cycle sessions produced new analysis files and `3/9` created tasks, but findings stayed `0/9`, indicating taxonomy undercount.
  Done when: Scheduler knowledge extraction increments a findings metric for diagnosis/analysis artifacts that include explicit quantified findings with provenance, and regression tests cover one positive and one negative fixture.
  Priority: high
  Evidence: `infra/scheduler/src/verify.ts`
  Evidence: `infra/scheduler/src/verify-knowledge.test.ts`
  Verification: `cd infra/scheduler && npx vitest run src/verify-knowledge.test.ts` → `Test Files 1 passed (1); Tests 77 passed (77)`.
  Verification: `cd infra/scheduler && npx vitest run src/verify.test.ts` → `Test Files 1 passed (1); Tests 1 passed (1)`.
