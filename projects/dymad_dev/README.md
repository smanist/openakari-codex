# DyMAD Development

Status: active
Mission: Extend DyMAD's data pipeline so trajectories can include config-driven synthetic noise, training can optionally denoise datasets before optimization, and the resulting filter can be evaluated against a clean reference.
Done when: `modules/dymad_dev` supports a config-driven noise sampler, a denoising data phase that passes transformed datasets to later training phases, and user-facing training workflows can request that denoising phase; `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md` is then completed with direct and downstream effectiveness metrics.

## Context

`modules/dymad_dev/` is already a registered execution module in `modules/registry.yaml`, but `projects/dymad_dev/` had no durable project record yet.

The immediate scope is two linked workstreams. First, extend trajectory generation so noise can be configured in parallel with the existing `control`, `x0`, and `p` samplers. Second, turn the existing training `data` phase hook into a real dataset-transform phase that can denoise trajectories, with Savitzky-Golay filtering as the initial target.

This project is framed as both implementation and measurement work. The code changes matter because they enable controlled noise injection and denoising; the knowledge output is whether denoising measurably improves signal fidelity and downstream training quality on regular trajectory datasets.

## Log

### 2026-04-15 (Committed to user-facing denoising phase exposure)

Resolved the remaining boundary question for this project: denoising should be a user-requestable training phase rather than an internal runtime-only hook. That means the project now explicitly includes the user-facing contract work needed to let denoising be requested in staged training flows alongside linear-solve and optimizer phases.

Updated the project task inventory and plan accordingly. The old "decide whether to expose denoising" task was replaced with an execution task to wire denoising through the appropriate registry/compiler/user-facing path, while keeping the runtime implementation in `src/dymad/training/*` aligned with the supported boundary.

Sources: `projects/dymad_dev/TASKS.md`, `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`

### 2026-04-15 (Reviewed updated DyMAD agent-facing docs)

Reviewed the updated DyMAD development docs in `modules/dymad_dev/AGENTS.md`, `modules/dymad_dev/docs/architecture.md`, `modules/dymad_dev/docs/feature-placement.md`, and `modules/dymad_dev/skills/dymad-train-eval-workflow/SKILL.md` against this project's task list. The main new constraint is architectural rather than algorithmic: the docs now make an explicit boundary between runtime changes in `src/dymad/training/*` / related implementation packages and user-facing exposure in `src/dymad/agent/*`.

The existing runtime tasks still fit, but the project had been missing one explicit decision task: whether the new denoising phase should remain runtime-only or also be surfaced through the user-mode registry/compiler path. Updated `projects/dymad_dev/TASKS.md` and the project plan to capture that boundary decision, plus notes pointing future implementation work at the documented test surfaces for training-phase and user-facing changes.

Verification:
- `sed -n '1,260p' modules/dymad_dev/AGENTS.md`
  - confirms the new "read architecture + feature-placement first" rule and the `make lint` / `make typecheck` closeout requirement for Python edits
- `sed -n '1,260p' modules/dymad_dev/docs/architecture.md`
  - documents the package map and the split between runtime packages and `src/dymad/agent/*`
- `sed -n '1,260p' modules/dymad_dev/docs/feature-placement.md`
  - explicitly routes training phase kinds to `src/dymad/training/*`, with compiler/registry updates only when the user-facing boundary changes

Sources: `modules/dymad_dev/AGENTS.md`, `modules/dymad_dev/docs/architecture.md`, `modules/dymad_dev/docs/feature-placement.md`, `modules/dymad_dev/skills/dymad-train-eval-workflow/SKILL.md`

### 2026-04-15 (Scaffolded noise and denoising workstream)

Created the durable project scaffold around the existing `modules/dymad_dev/` module and recorded the initial implementation seams for the requested work. `modules/dymad_dev/src/dymad/utils/sampling.py` already supports config-driven `control`, `x0`, and `p` sampling, so a parallel `noise` config can follow an established pattern. `modules/dymad_dev/src/dymad/training/phases.py` already normalizes explicit `type: data` phases, but its current `ContextDataPhase` only reports dataset sizes and does not transform data before later phases consume it.

Added a focused task list, a concrete implementation plan, and a planned benchmark record for comparing clean, noisy, and denoised trajectories. The initial project assumption is to target regular, non-graph datasets first, because that path already exercises both trajectory sampling and downstream optimizer phases without graph-specific batching complexity.

Verification:
- `sed -n '1,220p' modules/registry.yaml`
  - shows `project: dymad_dev`, `module: dymad_dev`, `path: modules/dymad_dev`
- `test -d projects/dymad_dev && echo exists || echo missing`
  - `exists`
- `rg -n "TrajectorySampler|ContextDataPhase|AUTO_APPENDED_PHASES" modules/dymad_dev/src/dymad/utils/sampling.py modules/dymad_dev/src/dymad/training/phases.py modules/dymad_dev/src/dymad/agent/registry/training_schema.py`
  - confirms the existing sampler entry point, current no-op data phase implementation, and auto-appended terminal phases

Sources: `modules/registry.yaml`, `modules/dymad_dev/src/dymad/utils/sampling.py`, `modules/dymad_dev/src/dymad/training/phases.py`, `modules/dymad_dev/src/dymad/agent/registry/training_schema.py`

## Open questions

- Should v1 noise injection target observations only, or should the config support independent noise on state, control, and observation channels?
- Should the denoising phase run before or after existing normalization / transform steps in the regular trajectory pipeline?
- Should user-facing denoising reuse the existing `type: data` phase shape directly, or does it need additional registry/compiler metadata beyond the current phase schema examples?
- Is regular-dataset support sufficient for the first benchmark, or is graph / ragged-series support also required in scope?
