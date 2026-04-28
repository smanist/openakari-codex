---
id: lorenz63-denoising-sweep-v1
type: experiment
status: planned
date: 2026-04-27
project: smoothing
consumes_resources: true
module: smoothing
artifacts_dir: modules/smoothing/artifacts/lorenz63-denoising-sweep-v1
tags: [lorenz63, denoising, savgol, kernel-smoothing, hyperparameter-sweep]
---

# Lorenz63 Denoising Sweep v1

## Specification

Compare Savitzky-Golay filtering against kernel smoothing for noisy Lorenz63 trajectories following the adopted protocol in `projects/smoothing/evaluation_protocol.md`. Clean trajectories should be generated on-attractor, then corrupted with i.i.d. Gaussian noise whose per-coordinate standard deviation is proportional to the coordinate's average absolute clean-signal magnitude.

Protocol defaults for v1:

- integration: fixed-step RK4 with `dt = 0.01`
- burn-in: `5000` steps
- recorded length: `2048` steps
- noise levels: `alpha in {0.02, 0.05, 0.10, 0.20}`
- realizations: `5` trajectory seeds times `2` replicate IDs, with `noise_seed = 1000 + 2 * trajectory_seed + replicate_id`, for `10` noisy rows per noise level arranged as `5` trajectory-seed clusters; variance and error bars must use the `5` cluster means rather than treating all `10` rows as independent outer samples

Required algorithm families:

- Savitzky-Golay filter
- Savitzky-Golay edge handling fixed to `scipy.signal.savgol_filter(..., mode="interp")` semantics
- Kernel smoothing with Gaussian kernels
- Kernel smoothing with compact polynomial kernels `k(x,x') = (1 - (x - x')^2 / h^2)^p` on `|x - x'| <= h`

Kernel smoothing estimator for v1:

- operate on sample index `t in {0, ..., N - 1}`, not physical time
- anchor centers: `tau_m = m * (N - 1) / (M - 1)` for `m in {0, ..., M - 1}`
- basis matrix: `B_{t,m} = K((t - tau_m) / h)` with `h = c_h * (N - 1) / (M - 1)`
- Gaussian kernel: `K(u) = exp(-u^2 / 2)`
- compact polynomial kernel: `K(u) = (1 - u^2)^p` for `|u| <= 1`, else `0`
- fit each coordinate independently by ordinary least squares over the full recorded window:
  `beta_j in argmin_b sum_t (y_j(t) - sum_m b_m B_{t,m})^2`
- if the minimizer is not unique, use the minimum-norm Moore-Penrose pseudoinverse solution
- report `x_hat_j(t) = sum_m beta_{j,m} B_{t,m}` with no intercept, row normalization, coordinate coupling, or extra regularization

Required sweep dimensions:

- relative noise level
- trajectory/noise realization (`trajectory_seed`, `replicate_id`, `noise_seed`)
- Savitzky-Golay window length and polynomial order
- kernel anchor count `M`
- kernel bandwidth `h`
- kernel type
- compact polynomial exponent `p`

Required metrics:

- RMSE against the clean trajectory
- relative RMSE
- denoising gain
- per-coordinate RMSE diagnostics

Required standard outputs:

- `metrics_raw.csv`
- `summary_by_setting.csv`
- `best_by_noise.csv`
- `robust_settings.csv`
- plots `rmse_vs_noise.png`, `relative_rmse_vs_noise.png`, `denoising_gain_vs_noise.png`

For each noise level and method/hyperparameter setting, report metric mean, cluster-adjusted sample variance across the `5` trajectory-seed means, `n_realizations = 10`, and `n_clusters = 5`.

## Resource Plan

CPU-only. The first sweep should complete within 20 minutes. If expected runtime exceeds 2 minutes, launch through:

```text
python infra/experiment-runner/run.py --detach --artifacts-dir modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 --project-dir projects/smoothing --max-retries <N> --watch-csv <output-csv> --total <N> <experiment-dir> -- <command...>
```

Then register the experiment with the scheduler API.

## Changes

Planned. Implementation should live under `modules/smoothing/`; runtime logs, result tables, and plots should live under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/`.

## Verification

Planned. Record exact commands and key outputs after implementation and execution.

## Findings

Planned. Numerical claims must cite the producing script and result file, or include inline arithmetic from referenced data.
