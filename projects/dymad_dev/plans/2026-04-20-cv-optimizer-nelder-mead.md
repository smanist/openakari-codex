# Single-Split CV Optimizer Plan

Date: 2026-04-20

## Knowledge output

This work answers a bounded DyMAD training-design question: can the existing single-split CV workflow be extended with a Nelder-Mead-like optimizer that searches hyperparameters automatically, without expanding the workflow to k-fold CV and without breaking the current best-by-lowest-metric selection semantics?

## Current findings

- `DriverBase.train(...)` currently treats `cv.param_grid is None` as a single default combo and otherwise materializes the full Cartesian product from `iter_param_grid(...)`.
- `iter_param_grid(...)` currently supports list values and tuple shorthands for `("linspace", ...)` and `("logspace", ...)`, so the runtime today assumes an exhaustive discrete search space rather than an adaptive optimizer.
- `SingleSplitDriver` yields exactly one fold and defaults `data.split_seed` when missing, so the active CV runtime is single-split even when it scans many parameter combinations.
- `KFoldDriver` exists in `modules/dymad_dev/src/dymad/training/driver.py` but raises `NotImplementedError`, so the current codebase already distinguishes the unimplemented k-fold path from the active single-split path.
- The agent/compiler registry currently exposes CV as `"single_split_param_sweep"` with allowed keys `param_grid` and `metric`, and the published notes explicitly say this is not true k-fold cross-validation.
- The current runtime selects the best CV result by the lowest aggregated metric value, writes `<run>_cv.npz`, renders `cv_results.png`, and copies the best checkpoint and summary to stable output paths.

## Recommended v1 scope

- Keep the workflow single-split in v1; do not implement `KFoldDriver` as part of this feature.
- Preserve the current "lower metric is better" selection rule and reuse the existing best-checkpoint export path.
- Keep grid search available for backward compatibility.
- Add one optimizer-driven CV mode that searches a continuous or mixed continuous/discrete parameter space with a Nelder-Mead-like simplex strategy.
- Bound the v1 problem to optimizer-controlled hyperparameter search and result bookkeeping; do not broaden the slice into generalized black-box optimizers or acquisition-function frameworks.

## Proposed design questions

1. What config surface should distinguish optimizer-driven CV from exhaustive `param_grid` search while keeping existing callers valid?
2. How should search-space bounds, simplex initialization, and optional log-domain transforms be encoded for positive-only parameters?
3. Should the optimizer emit results in the same aggregate artifact format as grid search, or should it add optimization-history artifacts while preserving the current summary outputs?
4. How should invalid proposals be handled: reject eagerly at config-validation time, clip/project into bounds, or penalize at objective-evaluation time?

## Proposed workstream

1. Define the optimizer-facing CV config shape and decide whether it is user-visible immediately or introduced as an internal runtime contract first.
2. Add runtime helpers for parameter encoding/decoding, simplex initialization, objective evaluation on the existing single validation split, and optimizer-history aggregation.
3. Integrate the new optimizer path into the CV training driver without regressing the existing `param_grid` path.
4. Extend tests to cover deterministic optimizer behavior on a small case, artifact creation, best-checkpoint export, and backward compatibility for existing `param_grid` requests.
5. Update schema/docs/examples only if the optimizer-facing config is part of the supported user contract in v1.

## Verification targets

- The single-split runtime accepts the new optimizer-based CV configuration and evaluates candidate points against the existing validation metric.
- The best result is still chosen by the lowest aggregated metric value and exported to the stable best-model paths.
- Existing `cv.param_grid` workflows continue to compile and run unchanged.
- Tests cover at least one deterministic optimizer-driven search case, including saved CV artifacts.
- Public docs and registry metadata either describe the new optimizer mode accurately or explicitly document that the public CV surface remains grid-only for now.

## Implementation notes

- The natural implementation layer is `modules/dymad_dev/src/dymad/training/driver.py` plus supporting helpers near `modules/dymad_dev/src/dymad/training/helper.py`.
- If the user-facing contract changes, mirror that expansion in `modules/dymad_dev/src/dymad/agent/compiler/training.py`, `modules/dymad_dev/src/dymad/agent/registry/training_schema.py`, and the associated tests.
- Keep the CV workflow description explicit about remaining single-split semantics so the optimizer feature is not misrepresented as k-fold CV.
- Preserve result provenance: any new artifact should make it clear which candidate parameters were evaluated, in what order, and with which metric values.
