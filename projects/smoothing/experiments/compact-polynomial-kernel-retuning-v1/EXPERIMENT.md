---
id: compact-polynomial-kernel-retuning-v1
type: experiment
status: planned
date: 2026-04-28
project: smoothing
consumes_resources: true
module: smoothing
artifacts_dir: modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1
tags: [lorenz63, denoising, compact-polynomial-kernel, hyperparameter-retuning, visual-check]
---

# Compact-Polynomial Kernel Retuning v1

## Specification

This experiment tests whether the compactly supported polynomial anchor-basis kernel can beat Savitzky-Golay after a denser search over its underexplored hyperparameters.

Default fixed noise level: `alpha = 0.20`.

Primary Savitzky-Golay reference:

- `savgol|w=41|p=5`, the v1 best SG setting at `alpha = 0.20`

Secondary Savitzky-Golay reference:

- `savgol|w=21|p=3`, the v1 robust cross-noise SG setting

Required compact-polynomial search dimensions:

- anchor count `M`
- bandwidth or bandwidth multiplier
- compact-polynomial degree `p` in `k(x,x') = (1 - (x - x')^2 / h^2)^p` for `|x - x'| <= h`, and `0` otherwise

Recommended starting grid:

- `M in {128, 192, 256, 384, 512}`
- bandwidth multiplier `c_h in {0.25, 0.5, 0.75, 1, 1.5, 2, 3}`
- degree `p in {1, 2, 3, 4, 6, 8}`

The implementation may use a staged grid if the full sweep is too slow, but must record the searched grid and any pruning rule.

Required metrics:

- RMSE
- relative RMSE
- denoising gain
- per-coordinate RMSE

For each setting, report metric mean and variance across trajectory/noise realizations. Use the same clean/noisy realization contract as v1 unless this record is updated with a deliberate deviation.

## Visual Checks

For final candidate algorithms, produce typical denoised-trajectory plots at `alpha = 0.20`. At minimum include:

- the best retuned compact-polynomial kernel
- `savgol|w=41|p=5`
- `savgol|w=21|p=3`
- clean trajectory
- noisy observations

Plot all three Lorenz63 coordinates for one representative realization. The realization must be selected mechanically from the run metrics rather than by input order. Default rule: choose the realization whose RMSE for the best compact-polynomial setting is closest to that setting's median RMSE across realizations, break ties by closest `relative_RMSE`, then lowest `sample_index`. Record the chosen sample metadata and selection deltas in `run_manifest.json`. The figure should be saved under `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/plots/`.

## Success Criteria

Confirmed:

- a retuned compact-polynomial setting beats `savgol|w=41|p=5` on mean RMSE at `alpha = 0.20`, and the typical denoised plot does not show obvious qualitative failure

Partially confirmed:

- a retuned compact-polynomial setting beats `savgol|w=21|p=3` but not `savgol|w=41|p=5`

Refuted:

- no searched compact-polynomial setting beats either SG reference, or the only metric win has visible qualitative failure in the typical denoised plot

## Resource Plan

CPU-only. If the sweep is expected to exceed 2 minutes, launch through:

```text
python infra/experiment-runner/run.py --detach --artifacts-dir modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1 --project-dir projects/smoothing --max-retries <N> --watch-csv <output-csv> --total <N> projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1 -- <command...>
```

Then register the experiment with the scheduler API.

## Changes

2026-04-28 implementation added `modules/smoothing/run_compact_polynomial_retuning.py` plus `modules/smoothing/test_run_compact_polynomial_retuning.py`.

The retuning runner:

- fixes the study to one selected `alpha`
- evaluates the exact SG reference settings alongside a compact-polynomial-only dense grid over anchor count, bandwidth multiplier, and degree
- selects the qualitative-check realization mechanically from the best compact-setting metric rows and records that selection provenance in `run_manifest.json`
- writes `metrics_raw.csv`, `summary_by_setting.csv`, `best_compact_setting.csv`, `sg_reference_summary.csv`, `run_manifest.json`, `output.log`, and `plots/typical_denoised_trajectory.png`

The original v1 sweep implementation in `modules/smoothing/run_denoising_sweep.py` remains unchanged as the frozen reference path.

## Verification

- `pytest -q modules/smoothing/test_run_compact_polynomial_retuning.py`
  Output: `2 passed in 0.98s`
- `pytest -q modules/smoothing/test_run_compact_polynomial_retuning.py`
  Output: `2 passed in 0.79s` after adding representative-sample median-selection coverage.
- `pytest -q modules/smoothing/test_*.py`
  Output: `11 passed in 1.11s`
- `pytest -q modules/smoothing/test_*.py`
  Output: `11 passed in 1.04s` after the representative-sample provenance fix.
- `python modules/smoothing/run_compact_polynomial_retuning.py --out-dir <tmpdir> --trajectory-seeds 0 1 --replicate-ids 0 --alpha 0.2 --dt 0.01 --burn-in-steps 32 --record-steps 64 --sigma 10.0 --rho 28.0 --beta 2.6666666666666665 --reference-savgol-settings 7:2 11:3 --kernel-anchors 8 --bandwidth-multipliers 1 --kernel-degrees 2 --overwrite`
  Output: smoke run wrote `n_settings = 3`, `n_rows_written = 6`, `best_compact_setting.csv`, and `plots/typical_denoised_trajectory.png` in the temporary artifact directory.
- `python modules/smoothing/run_compact_polynomial_retuning.py --out-dir <tmpdir> --trajectory-seeds 0 1 --replicate-ids 0 --alpha 0.2 --dt 0.01 --burn-in-steps 32 --record-steps 64 --sigma 10.0 --rho 28.0 --beta 2.6666666666666665 --reference-savgol-settings 7:2 11:3 --kernel-anchors 8 --bandwidth-multipliers 1 --kernel-degrees 2 --overwrite`
  Output: the smoke-run `run_manifest.json` recorded `representative_sample.selection_setting_id = kernel|type=compact_polynomial|M=8|ch=1|degree=2`, `sample_index = 0`, `trajectory_seed = 0`, `noise_seed = 1000`, `median_rmse = 1.7442567009511603`, and `rmse = 1.6524280383596202`, establishing provenance for the plotted realization.

## Findings

Planned. Numerical claims must cite the producing script and result file, or include inline arithmetic from referenced data.
