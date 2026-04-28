# Lorenz63 Denoising Benchmark Plan

Date: 2026-04-27
Status: adopted

## Knowledge Goal

This work should produce evidence about which denoising algorithms and hyperparameters recover clean Lorenz63 attractor trajectories best as observation noise increases. The core knowledge output is not just an implementation, but a method-ranking table with metric means and variances, plus recommendations about stable hyperparameter regimes.

## Scope

In scope:

- On-attractor Lorenz63 trajectory generation
- Coordinate-scaled i.i.d. Gaussian observation noise
- Savitzky-Golay filtering
- Kernel smoothing with Gaussian and compact polynomial kernels
- RMSE and at least one scale-normalized supporting metric
- Mean and variance across multiple trajectory/noise realizations

Out of scope for the first sweep:

- Learned neural denoisers
- Dynamics-aware smoothers or Kalman-style filters
- GPU execution
- Long sweeps exceeding 20 minutes

## Initial Experiment Shape

1. Implement deterministic data generation with explicit trajectory seeds `0..4`, replicate IDs `0..1`, and derived noise seeds `1000 + 2 * trajectory_seed + replicate_id`.
2. Match the adopted protocol defaults in `projects/smoothing/evaluation_protocol.md`: RK4, `dt = 0.01`, burn-in `5000`, recorded length `2048`, and noise levels `0.02, 0.05, 0.10, 0.20`.
3. Run a smoke-sized dry run on `2` trajectory seeds, `1` replicate per trajectory, and the two middle noise levels `0.05, 0.10` to verify shapes and aggregation.
4. If runtime is below the 20-minute cap, submit the first full sweep through the experiment runner.
5. Analyze metric means and cluster-adjusted variances by noise level, method, and hyperparameter setting, then derive both per-noise and robust-setting recommendations.

## Candidate Pilot Grid

The implementation should start from the adopted v1 protocol grid:

- noise levels `alpha`: `0.02, 0.05, 0.10, 0.20`
- trajectory seeds: `0, 1, 2, 3, 4`
- replicate IDs per trajectory: `0, 1` with derived noise seeds `1000 + 2 * trajectory_seed + replicate_id`
- realizations per noise level: `10` raw rows summarized as `5` trajectory-seed clusters for uncertainty reporting
- Savitzky-Golay window lengths: `7, 11, 21, 41`
- Savitzky-Golay polynomial orders: `2, 3, 5`
- Savitzky-Golay edge handling: `scipy.signal.savgol_filter(..., mode="interp")`
- kernel anchors `M`: `32, 64, 128`
- bandwidths `h`: `1x, 2x, 4x` the anchor spacing `(N - 1) / (M - 1)`
- kernel types: Gaussian, compact polynomial
- compact polynomial exponents `p`: `2, 3, 4`
- kernel estimator: coordinate-wise anchor-basis least-squares fit on sample index with anchor centers `tau_m = m * (N - 1) / (M - 1)` and `x_hat_j(t) = sum_m beta_{j,m} K((t - tau_m) / h)`

Required outputs:

- raw metrics table `metrics_raw.csv`
- grouped table `summary_by_setting.csv`
- recommendation tables `best_by_noise.csv`, `robust_settings.csv`
- plots `rmse_vs_noise.png`, `relative_rmse_vs_noise.png`, `denoising_gain_vs_noise.png`

## Resource Constraint

The first sweep must be CPU-only and target a maximum runtime of 20 minutes. If a single in-session command is expected to run longer than 2 minutes, use the experiment runner and register the run with the scheduler instead of supervising it in-process.

## Verification

The benchmark is ready for analysis when:

- every run records method, hyperparameters, noise level, trajectory seed, noise seed, and metric values
- the result table contains enough rows to compute mean and cluster-adjusted sample variance for each method/noise/hyperparameter group with `n_realizations = 10` and `n_clusters = 5`
- the experiment record names the exact command and output artifact paths
