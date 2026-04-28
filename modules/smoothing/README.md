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
- `run_denoising_sweep.py` executes the v1 hyperparameter sweep, streams `metrics_raw.csv` for experiment-runner progress tracking, and writes the required summary tables, plots, and dataset snapshot under `modules/smoothing/artifacts/`.
  - `python modules/smoothing/run_denoising_sweep.py --out-dir <artifact-dir> --restore-portable-artifacts` rebuilds the standard plot PNGs and rewrites `run_manifest.json` plus `output.log` so an existing committed sweep bundle no longer depends on the original execution worktree paths.
