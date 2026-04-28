---
id: lorenz63-denoising-sweep-v1
type: experiment
status: completed
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

- Added `modules/smoothing/run_denoising_sweep.py`, which executes the full v1 grid, streams `metrics_raw.csv` incrementally for experiment-runner progress tracking, writes the dataset snapshot under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/dataset/`, aggregates cluster-aware summary tables, and renders the three required plots.
- Added `modules/smoothing/test_run_denoising_sweep.py` to verify cluster-variance aggregation and a smoke-sized end-to-end sweep output contract.
- Completed the v1 sweep under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/`, including `metrics_raw.csv`, `summary_by_setting.csv`, `best_by_noise.csv`, `robust_settings.csv`, `run_manifest.json`, and `plots/`.
- The first detached launch failed because the experiment runner executes commands from the experiment directory, so a standalone script that imported `modules.smoothing...` by repo-root package name needed an explicit repo-root bootstrap. After adding that bootstrap and relaunching with an absolute `--watch-csv` path, the run completed successfully.

## Verification

- `pytest -q modules/smoothing/test_denoise_baselines.py modules/smoothing/test_generate_lorenz63_dataset.py modules/smoothing/test_run_denoising_sweep.py`
  Output: `8 passed in 0.74s`
- `python modules/smoothing/run_denoising_sweep.py --out-dir /tmp/lorenz63-sweep-smoke --trajectory-seeds 0 1 --replicate-ids 0 --noise-levels 0.05 0.10 --burn-in-steps 32 --record-steps 64 --window-lengths 7 --polyorders 2 --kernel-anchors 8 --bandwidth-multipliers 1 --kernel-types gaussian compact_polynomial --kernel-degrees 2 --overwrite`
  Output included `n_rows_written = 12`, `n_summary_rows = 6`, `n_best_rows = 4`, `n_robust_rows = 4`, plus the three plot paths under `/tmp/lorenz63-sweep-smoke/plots/`.
- `/usr/bin/time -p python modules/smoothing/run_denoising_sweep.py --out-dir /tmp/lorenz63-sweep-smoke-timed --trajectory-seeds 0 1 --replicate-ids 0 --noise-levels 0.05 0.10 --burn-in-steps 32 --record-steps 64 --window-lengths 7 --polyorders 2 --kernel-anchors 8 --bandwidth-multipliers 1 --kernel-types gaussian compact_polynomial --kernel-degrees 2 --overwrite >/tmp/lorenz63-sweep-smoke-timed.stdout`
  Output: `real 0.79`, `user 0.68`, `sys 0.07`
- `python infra/experiment-runner/run.py --detach --artifacts-dir /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 --project-dir /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/projects/smoothing --max-retries 1 --watch-csv /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/metrics_raw.csv --total 1920 /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/projects/smoothing/experiments/lorenz63-denoising-sweep-v1 -- python /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/run_denoising_sweep.py --out-dir /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 --overwrite`
  Output: `Budget check: No budget.yaml found, skipping budget check` and `{"launched": true, "pid": 43167}`
- `sed -n '1,260p' projects/smoothing/experiments/lorenz63-denoising-sweep-v1/progress.json`
  Output included `status: "completed"`, `current: 1920`, `pct: 100.0`, `exit_code: 0`, and `duration_s: 5`.
- `python - <<'PY' ... PY` counting rows in `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/{metrics_raw.csv,summary_by_setting.csv,best_by_noise.csv,robust_settings.csv}` and reading `run_manifest.json`
  Output: `metrics_raw.csv 1920`, `summary_by_setting.csv 192`, `best_by_noise.csv 8`, `robust_settings.csv 4`, and `manifest_counts {'n_best_rows': 8, 'n_robust_rows': 4, 'n_rows_expected': 1920, 'n_rows_written': 1920, 'n_samples': 40, 'n_settings': 48, 'n_summary_rows': 192}`

## Findings

1. The first v1 sweep completed and produced the full required artifact set: `1920` raw metric rows, `192` grouped summary rows, `8` per-noise best-setting rows, and `4` robust-setting rows. Provenance: `modules/smoothing/run_denoising_sweep.py`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/run_manifest.json`.
2. The default v1 grid contains `48` evaluated settings over `40` noisy trajectories, so the expected raw-output size is `48 * 40 = 1920` rows. Provenance: `modules/smoothing/run_denoising_sweep.py`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/metrics_raw.csv`.
