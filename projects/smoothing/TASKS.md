# Smoothing — Tasks

## Phase 1: Benchmark design

- [ ] Define the Lorenz63 denoising evaluation protocol [requires-frontier] [skill: design] [zero-resource]
  Why: The project needs a fixed data-generation, noise, metric, and reporting protocol before algorithm results are comparable.
  Done when: `projects/smoothing/evaluation_protocol.md` specifies trajectory generation, coordinate-scaled Gaussian noise levels, realization counts, metrics, aggregation rules, and standard tables/plots.
  Priority: high

- [ ] Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]
  Why: All denoising methods need shared clean/noisy trajectories with known provenance.
  Done when: `modules/smoothing/` contains a script or package entrypoint that generates clean and noisy Lorenz63 trajectory datasets for at least two noise levels and two seeds, with metadata recording integration settings and per-coordinate noise scales.
  Priority: high
  Notes: CPU-only. Keep pilot generation small enough for a full benchmark dry run to stay under 20 minutes.

- [ ] Implement Savitzky-Golay and kernel smoothing baselines [skill: execute]
  Why: The benchmark requires comparable implementations for the two requested algorithm families.
  Done when: `modules/smoothing/` exposes denoising functions or scripts for Savitzky-Golay, Gaussian-kernel smoothing, and compact-polynomial-kernel smoothing, and a smoke test verifies each returns a denoised signal with the same shape as the input.
  Priority: high

## Phase 2: Benchmark execution

- [ ] Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]
  Why: The project needs empirical mean/variance estimates across noise levels and realizations.
  Done when: `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md` is updated from planned to running/completed, the sweep is submitted through the experiment runner if expected to exceed 2 minutes, and artifacts are written under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/`.
  Priority: high
  Notes: CPU-only. Maximum intended runtime for the first sweep is 20 minutes.

- [ ] Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]
  Why: Raw sweep outputs need interpretation into method rankings and hyperparameter recommendations.
  Done when: The experiment Findings section reports mean and variance of RMSE and supporting metrics by noise level and method, with provenance to result files or inline arithmetic, and identifies best-performing hyperparameter regimes.
  Priority: high
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`

## Phase 3: Report

- [ ] Write the Lorenz63 denoising benchmark report [requires-frontier] [skill: record] [zero-resource]
  Why: The project Done-when requires a durable report that consolidates protocol, algorithms, results, and recommendations.
  Done when: `projects/smoothing/benchmark_report.md` exists and summarizes the benchmark design, sweep grid, metric means/variances, method comparison, and recommended hyperparameters.
  Priority: medium
