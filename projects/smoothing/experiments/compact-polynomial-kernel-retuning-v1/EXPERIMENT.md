---
id: compact-polynomial-kernel-retuning-v1
type: experiment
status: completed
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
- completed the default `alpha = 0.20` sweep under `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/`, producing `2120` raw rows across `212` evaluated settings and the required representative trajectory plot.
- unignored `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/plots/*.png` in `.gitignore` so the representative plot is versioned as part of the portable artifact bundle rather than left as a local-only file.

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
- `/usr/bin/time -p python modules/smoothing/run_compact_polynomial_retuning.py --out-dir /tmp/compact-retuning-benchmark-$$ --overwrite >/tmp/compact-retuning-benchmark-$$.stdout`
  Output: `real 7.23`, `user 6.89`, `sys 0.86`, establishing that the full default sweep stays below the repo's `2` minute detached-run threshold.
- `/usr/bin/time -p python /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-alpha-0-20-compact-polynomial-kernel-ret-task-run-moj660rg/modules/smoothing/run_compact_polynomial_retuning.py --out-dir /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-alpha-0-20-compact-polynomial-kernel-ret-task-run-moj660rg/modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1 --overwrite >/tmp/compact-retuning-run-33202.stdout`
  Output: `real 7.01`, `user 6.81`, `sys 0.70`
- `python - <<'PY' ... PY` counting rows in `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/{metrics_raw.csv,summary_by_setting.csv,best_compact_setting.csv,sg_reference_summary.csv}` and reading `run_manifest.json`
  Output: `metrics_raw.csv 2120`, `summary_by_setting.csv 212`, `best_compact_setting.csv 1`, `sg_reference_summary.csv 2`, and `manifest_counts {'n_compact_settings': 210, 'n_reference_settings': 2, 'n_rows_expected': 2120, 'n_rows_written': 2120, 'n_samples': 10, 'n_settings': 212, 'n_summary_rows': 212}`. The same manifest recorded `plots/typical_denoised_trajectory.png` plus representative-sample provenance for `selection_setting_id = kernel|type=compact_polynomial|M=192|ch=3|degree=6`, `sample_index = 3`, `trajectory_seed = 1`, and `noise_seed = 1003`.

## Findings

Result: partially confirmed on mean metrics only. The dense compact-polynomial retuning recovered a narrow regime that beats `savgol|w=21|p=3` on mean RMSE, mean relative RMSE, and mean denoising gain, but it does not beat either SG reference on the full mean-plus-variance bundle and still loses the primary SG target `savgol|w=41|p=5` on both means and variances.

- Best compact setting: `kernel|type=compact_polynomial|M=192|ch=3|degree=6` with `mean_rmse = 0.9094494905623589`, `variance_cluster_rmse = 0.0006366521153256111`, `mean_relative_rmse = 0.056643570076884496`, `variance_cluster_relative_rmse = 3.278080320878152e-06`, `mean_denoising_gain = 0.6892240334413245`, and `variance_cluster_denoising_gain = 0.00013886155131058296`. Provenance: `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/best_compact_setting.csv`.
- Against the primary SG target `savgol|w=41|p=5`, the best compact setting remains worse on every reported mean and variance metric: `0.9094494905623589 - 0.8823825590479313 = 0.027066931514427628` higher mean RMSE, `0.0006366521153256111 - 0.0005377398426275626 = 9.891227269804843e-05` higher RMSE variance, `0.056643570076884496 - 0.054959189386660647 = 0.0016843806902238495` higher mean relative RMSE, `3.278080320878152e-06 - 3.047341726063045e-06 = 2.307385948151068e-07` higher relative-RMSE variance, `0.6892240334413245 - 0.698451116614997 = -0.00922708317367249` lower mean denoising gain, and `0.00013886155131058296 - 0.00013582664156754757 = 3.0349097430353922e-06` higher denoising-gain variance. No compact setting beat this SG target on the full mean-plus-variance bundle: `0/210` compact settings simultaneously had lower mean RMSE, lower RMSE variance, lower mean relative RMSE, lower relative-RMSE variance, higher mean denoising gain, and lower denoising-gain variance than `savgol|w=41|p=5`. Provenance: `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/{best_compact_setting.csv,sg_reference_summary.csv,summary_by_setting.csv}`.
- Against the secondary SG target `savgol|w=21|p=3`, the best compact setting wins on the means but loses on stability: `0.9547454147140947 - 0.9094494905623589 = 0.04529592415173578` lower mean RMSE, `0.059461610732191604 - 0.056643570076884496 = 0.002818040655307108` lower mean relative RMSE, and `0.6892240334413245 - 0.6737660788685533 = 0.015457954572771215` higher mean denoising gain, but `0.0006366521153256111 - 0.0004892621329602286 = 0.00014738998236538245` higher RMSE variance, `3.278080320878152e-06 - 2.3219506293415143e-06 = 9.561296915366376e-07` higher relative-RMSE variance, and `0.00013886155131058296 - 0.00010658041474358302 = 3.2281136566999935e-05` higher denoising-gain variance. Exactly `6/210` compact settings beat `savgol|w=21|p=3` on mean RMSE, mean relative RMSE, and mean denoising gain; the winning settings were `kernel|type=compact_polynomial|M=192|ch=3|degree=6`, `kernel|type=compact_polynomial|M=192|ch=3|degree=8`, `kernel|type=compact_polynomial|M=192|ch=2|degree=3`, `kernel|type=compact_polynomial|M=192|ch=2|degree=4`, `kernel|type=compact_polynomial|M=192|ch=2|degree=6`, and `kernel|type=compact_polynomial|M=192|ch=1.5|degree=2`, but `0/210` compact settings beat `savgol|w=21|p=3` on the full mean-plus-variance bundle. Provenance: `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/{best_compact_setting.csv,sg_reference_summary.csv,summary_by_setting.csv}`.
- The successful compact region is narrow. The top `10` compact settings by mean RMSE all use `M=192`, and their bandwidth multipliers are restricted to `1.5`, `2`, or `3`; the top `5` are exactly `M=192` with `c_h in {2, 3}` and degrees `{3, 4, 6, 8}`. Provenance: sort `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/summary_by_setting.csv` by `mean_rmse`.
- The raw realization comparison is consistent with the aggregate ranking. For the best compact setting versus `savgol|w=41|p=5`, the samplewise RMSE deltas were positive on all `10/10` realizations, so the compact kernel lost every sample. Versus `savgol|w=21|p=3`, the deltas were negative on all `10/10` realizations, so the compact kernel won every sample. Provenance: compare matching `sample_index` rows in `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/metrics_raw.csv`.
- The representative visual check did not reveal an obvious qualitative failure. The plotted sample is `sample_index = 3`, `trajectory_seed = 1`, `replicate_id = 1`, and `noise_seed = 1003`, selected mechanically because its best-compact RMSE `0.9048040957284902` is within `0.004650683825640156` of the compact-setting median RMSE `0.9094547795541303`. In [plots/typical_denoised_trajectory.png](../../../../modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/plots/typical_denoised_trajectory.png), the green compact trace stays close to the clean and SG curves on all three coordinates, so the compact kernel's failure against `savgol|w=41|p=5` is quantitative rather than a visible instability. Provenance: `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/run_manifest.json` and the linked plot.
- Dense retuning substantially improved the compact family relative to the original v1 sweep, but not enough to overturn the best SG result. In the original `alpha = 0.20` sweep, the best compact-polynomial row was `kernel|type=compact_polynomial|M=128|ch=2|degree=3` with `mean_rmse = 1.2011148900386548`; the retuned best compact row therefore improved by `1.2011148900386548 - 0.9094494905623589 = 0.2916653994762959`, and `0.2916653994762959 / 1.2011148900386548 = 0.24282889330171353`, while it still trails the primary SG target by `0.027066931514427628`, where `0.027066931514427628 / 0.8823825590479313 = 0.030674826056888715`. Provenance: `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/summary_by_setting.csv`, `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/best_compact_setting.csv`, and `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/sg_reference_summary.csv`.
