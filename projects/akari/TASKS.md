# akari - Next actions

## Meta-project setup

- [ ] Adapt the self-improvement measurement plan to your own repo [requires-opus] [skill: design] [zero-resource]
  Why: The public examples show the pattern, but each deployment needs its own metrics, denominators, and failure modes.
  Done when: A repo-specific measurement plan exists with 3-5 concrete metrics and explicit data sources.
  Priority: high

- [ ] Measure human intervention rate in your deployment [fleet-eligible] [skill: analyze] [zero-resource]
  Why: A decreasing intervention rate is one of the clearest signals that the system is becoming more autonomous.
  Done when: A short analysis computes intervention events per session over at least 2 time windows and records the result.
  Priority: medium

- [ ] Write one self-observation diagnosis from operational evidence [requires-opus] [skill: diagnose] [zero-resource]
  Why: The meta-project only becomes real when the system diagnoses its own failure modes from its own logs and artifacts.
  Done when: One diagnosis file identifies a concrete self-observation failure, cites evidence, and proposes a fix or follow-up task.
  Priority: medium

- [ ] Add one local example of a successful self-improvement loop [fleet-eligible] [skill: record] [zero-resource]
  Why: The strongest evidence for the meta-project is a full loop: detect a gap, change the system, then measure improvement.
  Done when: README log entry or analysis file records a before/after operational improvement with provenance.
  Priority: medium

## Backend migration

- [ ] Add a first-class Codex scheduler backend [requires-opus] [skill: execute]
  Why: Codex is a supported interactive runtime via `AGENTS.md` and `.agents/skills/`, but the scheduler still only exposes `claude`, `cursor`, `opencode`, and `auto`.
  Done when: Scheduler jobs can run with `--backend codex`, tests cover backend resolution and CLI validation, and work-session execution no longer depends on pretending Codex is `opencode`.
  Priority: high

- [ ] Split backend-agnostic spawn logic from Claude-specific presets [requires-opus] [skill: execute]
  Why: `spawnAgent()` currently injects `claude_code` system prompt and tool presets for every backend, which blocks a clean Codex/OpenAI execution path.
  Done when: Backend adapters own prompt/tool shaping, and regression coverage shows Claude, Cursor/opencode, and Codex paths each using appropriate configuration.
  Priority: high

- [ ] Audit deep-work and chat supervision for Codex/OpenAI compatibility [requires-opus] [skill: diagnose] [zero-resource]
  Why: Plan auto-approval and live human message forwarding currently rely on Claude-only `streamInput` behavior.
  Done when: A written note classifies each supervision feature as preserved, degraded, or API-fallback-only for Codex/OpenAI with file-level evidence.
  Priority: medium

- [ ] Rewrite setup docs to present Codex/OpenAI as the primary path [fleet-eligible] [skill: record] [zero-resource]
  Why: The repo now has Codex-facing artifacts, but the docs still teach a Claude-first mental model.
  Done when: `README.md`, `docs/getting-started.md`, and `infra/scheduler/README.md` present `AGENTS.md` and Codex/OpenAI-first examples without removing legacy backend compatibility notes.
  Priority: medium
