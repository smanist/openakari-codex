# DyMAD Development

Status: active
Mission: Extend DyMAD's data pipeline so trajectories can include config-driven synthetic noise, training can optionally denoise datasets before optimization, and the resulting filter can be evaluated against a clean reference.
Done when: `modules/dymad_dev` supports a config-driven noise sampler and a denoising data phase that passes transformed datasets to later training phases, and `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md` is completed with direct and downstream effectiveness metrics.

## Context

`modules/dymad_dev/` is already a registered execution module in `modules/registry.yaml`, but `projects/dymad_dev/` had no durable project record yet.

The immediate scope is two linked workstreams. First, extend trajectory generation so noise can be configured in parallel with the existing `control`, `x0`, and `p` samplers. Second, turn the existing training `data` phase hook into a real dataset-transform phase that can denoise trajectories, with Savitzky-Golay filtering as the initial target.

This project is framed as both implementation and measurement work. The code changes matter because they enable controlled noise injection and denoising; the knowledge output is whether denoising measurably improves signal fidelity and downstream training quality on regular trajectory datasets.

## Log

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
- Is regular-dataset support sufficient for the first benchmark, or is graph / ragged-series support also required in scope?
