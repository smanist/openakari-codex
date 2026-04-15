# DyMAD Development — Tasks

- [ ] Add config-driven noise sampling alongside existing trajectory samplers [skill: execute] [requires-frontier]
  Why: The sampling stack already accepts structured configs for `control`, `x0`, and `p`; adding a parallel `noise` config is the cleanest way to produce reproducible noisy datasets for both training and evaluation.
  Done when: `TrajectorySampler` accepts a `noise` config dictionary, applies the configured noise deterministically under a fixed RNG seed, and regression tests cover at least one regular-trajectory workflow with and without control inputs.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`

- [ ] Add a denoising data phase that passes transformed datasets to later phases [skill: execute] [requires-frontier]
  Why: The phase system already exposes `type: data`, but it cannot yet rewrite the dataset or metadata that later optimizer and analysis phases consume.
  Done when: a `type: data` phase with `operation: denoise` can apply a configurable filter to regular trajectory batches, rebuild the phase context consistently, and unit tests show later phases consume the transformed dataset rather than the original one.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`

- [ ] Quantify denoising effectiveness against a clean-reference benchmark [skill: multi] [requires-frontier]
  Why: The new denoising phase only earns its complexity if it demonstrably improves direct signal quality or downstream training robustness under injected noise.
  Done when: `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md` reports clean-vs-noisy-vs-denoised metrics with exact commands, including a direct observation error metric and a downstream training metric.
  Priority: high
  Evidence: `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md`
