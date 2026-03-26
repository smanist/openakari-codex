# akari - Next actions

## Meta-project setup

- [x] Adapt the self-improvement measurement plan to your own repo [requires-opus] [skill: design] [zero-resource]
  Why: The public examples show the pattern, but each deployment needs its own metrics, denominators, and failure modes.
  Done when: A repo-specific measurement plan exists with 3-5 concrete metrics and explicit data sources. (Implemented in `projects/akari/plans/2026-03-24-self-improvement-measurement-local.md`.)
  Priority: high

- [x] Align task-claim SOP with scheduler API [requires-opus] [skill: execute] [zero-resource]
  Why: The SOP recommends claiming tasks via `/api/tasks/claim`, but the local scheduler API may not expose this endpoint yet (claim attempts can return `{\"error\":\"not found\"}`).
  Evidence: 2026-03-24 `curl -s -X POST http://localhost:8420/api/tasks/claim ...` returned `{\"error\":\"not found\"}`.
  Done when: Scheduler control API supports task claiming with conflict detection (implemented).
  Priority: medium

- [x] Measure human intervention rate in your deployment [fleet-eligible] [skill: analyze] [zero-resource]
  Why: A decreasing intervention rate is one of the clearest signals that the system is becoming more autonomous.
  Done when: A short analysis computes intervention events per session over at least 2 time windows and records the result.
  Priority: medium
  Evidence: `projects/akari/analysis/human-intervention-rate-2026-03-25.md`

- [x] Reconcile missing doc references in SOP/skills [requires-opus] [skill: govern] [zero-resource]
  Why: `/orient` and `docs/sops/autonomous-work-cycle.md` reference `docs/status.md` and `docs/conventions/*`, but this repo checkout does not contain those paths (attempts to read them fail with "No such file or directory"). This causes repeated orient friction and can hide real missing-context issues.
  Done when: Either (a) the referenced docs exist with correct content, or (b) the SOP/skill/AGENTS references are updated to only point at existing docs (or to explicitly treat them as optional with fallback behavior).
  Priority: medium
  Evidence: Added `docs/status.md`, `docs/conventions/*`, and `docs/schemas/*`.

- [x] Write one self-observation diagnosis from operational evidence [requires-opus] [skill: diagnose] [zero-resource]
  Why: The meta-project only becomes real when the system diagnoses its own failure modes from its own logs and artifacts.
  Done when: One diagnosis file identifies a concrete self-observation failure, cites evidence, and proposes a fix or follow-up task.
  Priority: medium
  Evidence: Implemented in `projects/akari/diagnosis/diagnosis-2026-03-25-codex-work-cycle-empty-output.md`.

- [x] Fix Codex work-cycle turn/output instrumentation [requires-opus] [skill: execute] [zero-resource]
  Why: Some Codex `work-cycle` runs record `Turns: 0` and empty output, which makes self-observation and metrics analysis unreliable.
  Done when: A regression test fixture for Codex `--json` output passes, and `work-cycle` logs show `Turns > 0` and non-empty output for a non-idle session.
  Priority: medium
  Evidence: Diagnosis at `projects/akari/diagnosis/diagnosis-2026-03-25-codex-work-cycle-empty-output.md`.
  Evidence: Added Codex CLI stream-json parsing + tests; smoke log at `.scheduler/logs/work-cycle-2026-03-25T01-47-37-609Z.log`; fixture at `infra/scheduler/src/__fixtures__/codex-cli-json-stream.sample.jsonl`.

- [x] Re-verify Codex scheduler sessions record non-empty output and `Turns > 0` [requires-opus] [skill: diagnose]
  Why: Despite the instrumentation fix + smoke log, subsequent scheduled runs still produced empty `.scheduler/logs/*` output with `Turns: 0`, which blocks metrics analysis and makes “fixed” claims unverifiable.
  Evidence: Empty output logs: `.scheduler/logs/work-cycle-2026-03-25T03-11-33-249Z.log`, `.scheduler/logs/pca-v-ttd-2026-03-25T02-23-32-461Z.log`.
  Evidence (2026-03-25): Codex CLI emits explicit `turn.*` events; a turn can contain only tool items and no `agent_message`. Implemented turn counting from `turn.completed` and a fallback to command execution `aggregated_output` when assistant text is empty (`infra/scheduler/src/backend.ts`), with regression coverage in `infra/scheduler/src/backend-all.test.ts`.
  Evidence (2026-03-25): `node infra/scheduler/dist/cli.js run <job-id>` did not append a `.scheduler/metrics/sessions.jsonl` row because `cmdRun()` updated job state but did not record structured metrics; fixed by recording metrics for manual runs in `infra/scheduler/src/cli.ts`.
  Verification (unit): `cd infra/scheduler && npx vitest run src/backend-all.test.ts` → `71 passed`
  Done when: A scheduled `work-cycle` run (not a smoke run) produces a log file with non-empty `## output` and `Turns > 0`, and the corresponding `.scheduler/metrics/sessions.jsonl` row reports `numTurns > 0`.
  Priority: high
  Evidence (E2E manual run): `.scheduler/logs/work-cycle-2026-03-25T15-23-15-092Z.log` shows `Turns: 1` and non-empty `## output` (`PING`).
  Evidence (metrics): `.scheduler/metrics/sessions.jsonl` row at `timestamp:"2026-03-25T15:23:17.280Z"` reports `jobName:"work-cycle"` and `numTurns:1` (triggerSource: `manual`).

- [ ] Add one local example of a successful self-improvement loop [fleet-eligible] [skill: record] [zero-resource]
  Why: The strongest evidence for the meta-project is a full loop: detect a gap, change the system, then measure improvement.
  Done when: README log entry or analysis file records a before/after operational improvement with provenance.
  Priority: medium

## Model-only migration

- [x] Add a first-class Codex scheduler backend [requires-opus] [skill: execute]
  Why: Codex is a supported interactive runtime via `AGENTS.md` and `.agents/skills/`, but the scheduler still only exposes `claude`, `cursor`, `opencode`, and `auto`.
  Done when: Scheduler jobs run with `--model ...` as the only user-facing selector (no `--backend`), tests cover runtime routing, and work-session execution no longer depends on pretending Codex is `opencode`.
  Priority: high

- [x] Split backend-agnostic spawn logic from Claude-specific presets [requires-opus] [skill: execute]
  Why: `spawnAgent()` currently injects `claude_code` system prompt and tool presets for every backend, which blocks a clean Codex/OpenAI execution path.
  Done when: Runtime adapters own prompt/tool shaping, and regression coverage shows opencode, codex, and openai routes each using appropriate configuration.
  Priority: high

- [x] Audit deep-work and chat supervision for Codex/OpenAI compatibility [requires-opus] [skill: diagnose] [zero-resource]
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

- [ ] Re-run scheduler health checks after fixes [fleet-eligible] [skill: analyze] [zero-resource]
  Why: Confirm health monitoring no longer produces false positives for manual smoke runs and zero-cost budget-project sessions.
  Done when: A short note in `projects/akari/README.md` records the output of health + warning escalation over the most recent ≥20 sessions, with no `task_starvation` due to `triggerSource:\"manual\"` and no `ledger_inconsistent` recurrence when `costUsd: 0`.
  Priority: medium
