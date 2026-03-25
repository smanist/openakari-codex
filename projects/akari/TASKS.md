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

- [ ] Measure human intervention rate in your deployment [fleet-eligible] [skill: analyze] [zero-resource]
  Why: A decreasing intervention rate is one of the clearest signals that the system is becoming more autonomous.
  Done when: A short analysis computes intervention events per session over at least 2 time windows and records the result.
  Priority: medium

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

- [ ] Add one local example of a successful self-improvement loop [fleet-eligible] [skill: record] [zero-resource]
  Why: The strongest evidence for the meta-project is a full loop: detect a gap, change the system, then measure improvement.
  Done when: README log entry or analysis file records a before/after operational improvement with provenance.
  Priority: medium

## Backend migration

- [x] Add a first-class Codex scheduler backend [requires-opus] [skill: execute]
  Why: Codex is a supported interactive runtime via `AGENTS.md` and `.agents/skills/`, but the scheduler still only exposes `claude`, `cursor`, `opencode`, and `auto`.
  Done when: Scheduler jobs can run with `--backend codex`, tests cover backend resolution and CLI validation, and work-session execution no longer depends on pretending Codex is `opencode`.
  Priority: high

- [x] Split backend-agnostic spawn logic from Claude-specific presets [requires-opus] [skill: execute]
  Why: `spawnAgent()` currently injects `claude_code` system prompt and tool presets for every backend, which blocks a clean Codex/OpenAI execution path.
  Done when: Backend adapters own prompt/tool shaping, and regression coverage shows Claude, Cursor/opencode, and Codex paths each using appropriate configuration.
  Priority: high

- [x] Audit deep-work and chat supervision for Codex/OpenAI compatibility [requires-opus] [skill: diagnose] [zero-resource]
  Why: Plan auto-approval and live human message forwarding currently rely on Claude-only `streamInput` behavior.
  Done when: A written note classifies each supervision feature as preserved, degraded, or API-fallback-only for Codex/OpenAI with file-level evidence.
  Priority: medium

- [x] Rewrite setup docs to present Codex/OpenAI as the primary path [fleet-eligible] [skill: record] [zero-resource]
  Why: The repo now has Codex-facing artifacts, but the docs still teach a Claude-first mental model.
  Done when: `README.md`, `docs/getting-started.md`, and `infra/scheduler/README.md` present `AGENTS.md` and Codex/OpenAI-first examples without removing legacy backend compatibility notes.
  Priority: medium
