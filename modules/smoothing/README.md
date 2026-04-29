# Smoothing Module

Execution module for `projects/smoothing/`.

This module should hold reproducible code for Lorenz63 denoising benchmarks. Heavy runtime artifacts belong under `modules/smoothing/artifacts/`, with durable experiment records kept under `projects/smoothing/experiments/`.

## Entry points

- `generate_lorenz63_dataset.py` builds reproducible clean/noisy Lorenz63 trajectory datasets and writes:
  - `clean_trajectories.npz`
  - `noisy_observations.npz`
  - `metadata.json`
- `denoise_baselines.py` exposes reusable baseline denoisers for the v1 benchmark:
  - `savitzky_golay_denoise(signal, window_length, polyorder)` with SciPy `mode="interp"` semantics
  - `gaussian_kernel_denoise(signal, n_anchors, bandwidth)` using the protocol anchor-basis least-squares estimator
  - `compact_polynomial_kernel_denoise(signal, n_anchors, bandwidth, degree)` using the compact-support polynomial kernel basis
- `denoise_families_v2.py` exposes the broader classical smoother families adopted for the v2 benchmark:
  - `normalized_kernel_regression_denoise(signal, kernel, span)` for row-normalized Gaussian/tricube local averaging
  - `local_linear_regression_denoise(signal, kernel, span)` for weighted first-order local fits evaluated at the target sample
  - `cubic_smoothing_spline_denoise(signal, alpha, lambda_rel)` plus `spline_smoothing_factors(...)` for the observable-scale spline contract
- `run_denoising_sweep.py` executes the v1 hyperparameter sweep, streams `metrics_raw.csv` for experiment-runner progress tracking, and writes the required summary tables, plots, and dataset snapshot under `modules/smoothing/artifacts/`.
  - `python modules/smoothing/run_denoising_sweep.py --out-dir <artifact-dir> --restore-portable-artifacts` rebuilds the standard plot PNGs and rewrites `run_manifest.json` plus `output.log` so an existing committed sweep bundle no longer depends on the original execution worktree paths.
- `run_compact_polynomial_retuning.py` executes the fixed-`alpha` compact-polynomial retuning study, evaluating only compact-polynomial kernel grids plus the required Savitzky-Golay reference settings.
  - It writes `metrics_raw.csv`, `summary_by_setting.csv`, `best_compact_setting.csv`, `sg_reference_summary.csv`, `run_manifest.json`, `output.log`, and `plots/typical_denoised_trajectory.png` under the requested artifact directory.
- `run_denoising_sweep_v2.py` executes the staged v2 benchmark in an isolated path, writes the expanded raw/summary schema including `family`, `span`, `lambda_rel`, and `derivative_rmse`, and emits pilot `family_screen.csv` artifacts without mutating the v1 runner.
  - `python modules/smoothing/run_denoising_sweep_v2.py --out-dir <artifact-dir> --stage pilot ...` runs the pilot-stage grid.
  - `python modules/smoothing/run_denoising_sweep_v2.py --out-dir <artifact-dir> --stage confirmatory --confirmatory-settings-json <settings.json> ...` reruns finalist settings alongside the fixed references in a later confirmatory session.
