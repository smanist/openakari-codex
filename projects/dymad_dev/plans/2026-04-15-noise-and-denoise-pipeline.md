# Noise And Denoise Pipeline Plan

Date: 2026-04-15

## Knowledge output

This work is not only a feature addition. It is an experiment on DyMAD's training pipeline: does denoising a noisy trajectory dataset before optimization improve signal fidelity and downstream training quality enough to justify a first-class preprocessing phase?

## Current findings

- `modules/dymad_dev/src/dymad/utils/sampling.py` already implements structured sampler maps for `control` (`CTRL_MAP`) and initial-condition / parameter sampling (`X0_MAP` via `_sample_xp`).
- `modules/dymad_dev/src/dymad/training/phases.py` already supports explicit `type: data` phase entries via `DataPhaseSpec`, but `build_phase(...)` currently routes all of them to `ContextDataPhase`, which only records dataset sizes.
- `modules/dymad_dev/src/dymad/training/driver.py` constructs a `PhaseContext` with materialized datasets, dataloaders, and metadata. A real denoising phase therefore needs to update all three consistently, not just mutate one tensor in place.
- `modules/dymad_dev/src/dymad/training/phases.py` auto-appends analysis and export phases, so denoised datasets should flow through the same reporting path as unmodified datasets once the context is rebuilt correctly.

## Recommended v1 scope

- Regular, non-graph trajectories only.
- Additive observation noise first.
- Savitzky-Golay filtering first.
- No attempt to support graph datasets, ragged sequence collections, or learned denoisers in v1.

This keeps the first slice aligned with the existing regular trajectory and typed phase-runtime coverage already present in `modules/dymad_dev/tests/`.

## Workstream 1: Noise sampler

1. Add a noise configuration entry parallel to existing sampler configs in `TrajectorySampler`.
2. Introduce a dedicated noise sampler map with an initial Gaussian implementation that accepts the same style of `{kind, params}` config used elsewhere.
3. Apply noise at the trajectory output level, with explicit targeting of observations in v1.
4. Preserve deterministic behavior under fixed RNG seeds so clean/noisy comparisons stay reproducible.
5. Add tests that verify:
   - zero noise leaves outputs unchanged
   - nonzero noise changes outputs with the expected shape
   - repeated sampling with the same seed reproduces the same perturbation

## Workstream 2: Denoising data phase

1. Extend the `data` phase implementation beyond the current context-only behavior.
2. Add an explicit `operation: denoise` path and treat filter parameters as phase config payload.
3. Apply the denoiser trajectory-by-trajectory on regular observation channels, then rebuild the transformed dataset, dataloaders, and metadata in `PhaseContext`.
4. Record provenance in metadata so later phases can tell whether a dataset was denoised and with which parameters.
5. Add tests that verify:
   - a denoise phase modifies the dataset before later phases execute
   - downstream optimizer / analysis phases see the transformed context
   - unsupported dataset kinds fail clearly rather than silently skipping work

## Test case design

Use one existing regular trajectory workflow as the initial benchmark, preferably the LTI test/config path already exercised in `modules/dymad_dev/tests/`. Generate one clean dataset, one noisy dataset using the new sampler, and one denoised dataset produced from the same noisy trajectories by the new `data` phase.

Measure two things:

1. Direct signal restoration:
   - `NRMSE(y_noisy, y_clean)`
   - `NRMSE(y_denoised, y_clean)`
   - improvement ratio or delta between the two

2. Downstream training quality:
   - identical model/training config on noisy vs denoised datasets
   - compare `valid_total` or rollout RMSE against the clean-reference validation data

Interpret the filter as useful if it improves direct observation error at moderate noise and does not degrade downstream validation performance relative to training on raw noisy data.

## Proposed implementation order

1. Land the noise sampler and its unit tests.
2. Land the denoising phase and its phase-runtime tests.
3. Run the benchmark from `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/`.
4. Use the benchmark findings to decide whether the denoising phase should remain generic or stay scoped to SG filtering for regular trajectories.
