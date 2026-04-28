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
