# Lorenz63 Denoising Benchmark Plan

Date: 2026-04-28
Status: draft

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

1. Implement deterministic data generation with explicit seeds for initial condition/noise.
2. Implement a smoke-sized benchmark grid that covers all requested method families.
3. Run a local dry run on two noise levels and two realizations.
4. If runtime is below the 20-minute cap, submit the first full sweep through the experiment runner.
5. Analyze metric means and variances by noise level, method, and hyperparameter setting.

## Candidate Pilot Grid

The first implementation task may revise this grid after measuring runtime, but should start small:

- noise levels `alpha`: `0.02, 0.05, 0.10, 0.20`
- realizations per noise level: `5`
- Savitzky-Golay window lengths: `7, 11, 21, 41`
- Savitzky-Golay polynomial orders: `2, 3`
- kernel anchors `M`: `32, 64, 128`
- bandwidths `h`: values spanning roughly `1x, 2x, 4x` the anchor spacing
- kernel types: Gaussian, compact polynomial
- compact polynomial exponents `p`: `2, 3, 4`

## Resource Constraint

The first sweep must be CPU-only and target a maximum runtime of 20 minutes. If a single in-session command is expected to run longer than 2 minutes, use the experiment runner and register the run with the scheduler instead of supervising it in-process.

## Verification

The benchmark is ready for analysis when:

- every run records method, hyperparameters, noise level, trajectory seed, noise seed, and metric values
- the result table contains enough rows to compute mean and variance for each method/noise/hyperparameter group
- the experiment record names the exact command and output artifact paths
