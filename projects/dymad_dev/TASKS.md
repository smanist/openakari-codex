# DyMAD Development — Tasks

- [ ] Add config-driven noise sampling alongside existing trajectory samplers [skill: execute] [requires-frontier]
  Why: The sampling stack already accepts structured configs for `control`, `x0`, and `p`; adding a parallel `noise` config is the cleanest way to produce reproducible noisy datasets for both training and evaluation.
  Done when: `TrajectorySampler` accepts a `noise` config dictionary, applies the configured noise deterministically under a fixed RNG seed, and regression tests cover at least one regular-trajectory workflow with and without control inputs.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`
  Notes: Per `modules/dymad_dev/docs/feature-placement.md`, this should stay in the runtime implementation layer rather than `src/dymad/agent/*`.

- [ ] Add a denoising data phase that passes transformed datasets to later phases [skill: execute] [requires-frontier]
  Why: The phase system already exposes `type: data`, but it cannot yet rewrite the dataset or metadata that later optimizer and analysis phases consume.
  Done when: a `type: data` phase with `operation: denoise` can apply a configurable filter to regular trajectory batches, rebuild the phase context consistently, and unit tests show later phases consume the transformed dataset rather than the original one.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`
  Notes: Start with `tests/test_training_phase_runtime.py` and the closest workflow tests, which the updated DyMAD docs now call out as the boundary truth for training-phase changes.

- [ ] Decide whether denoising should be exposed in agent-facing training workflows [skill: multi] [requires-frontier]
  Why: The updated DyMAD architecture docs distinguish runtime implementation from user-facing registry/compiler surfaces, so the project needs one explicit decision about whether `operation: denoise` is runtime-only or should also be supported through compiled MCP training requests.
  Done when: the project records one explicit boundary decision and either (a) keeps denoising runtime-only with project docs updated accordingly, or (b) updates the relevant `src/dymad/agent/registry/*` / compiler tests so user-mode exposure is accurate.
  Priority: high
  Evidence: `modules/dymad_dev/docs/architecture.md`, `modules/dymad_dev/docs/feature-placement.md`

- [ ] Quantify denoising effectiveness against a clean-reference benchmark [skill: multi] [requires-frontier]
  Why: The new denoising phase only earns its complexity if it demonstrably improves direct signal quality or downstream training robustness under injected noise.
  Done when: `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md` reports clean-vs-noisy-vs-denoised metrics with exact commands, including a direct observation error metric and a downstream training metric.
  Priority: high
  Evidence: `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md`
