# Smoothing

Status: active
Mission: Identify denoising algorithms and hyperparameters that best recover clean on-attractor Lorenz63 trajectories from coordinate-scaled i.i.d. Gaussian observation noise.
Done when: A reproducible benchmark report compares Savitzky-Golay filtering and kernel smoothing across a range of noise levels, reports mean and variance of RMSE and supporting metrics across multiple trajectory/noise realizations, and recommends hyperparameter regimes for each method.

## Context

This project studies signal denoising on synthetic Lorenz63 trajectories sampled on the attractor. Clean trajectories should be generated first, then corrupted by independent Gaussian noise whose per-coordinate standard deviation is proportional to that coordinate's average absolute clean-signal magnitude. The initial algorithm set includes the standard Savitzky-Golay filter and a kernel smoother that fits the full signal using kernels centered at `M < N` equidistant time steps.

The kernel smoother should sweep `M`, bandwidth `h`, and kernel type. Kernel types in scope are Gaussian kernels and compact polynomial kernels of the form `k(x,x') = (1 - (x - x')^2 / h^2)^p` supported on `|x - x'| <= h`, where `p` is an additional hyperparameter. The first benchmark should be CPU-only and complete within 20 minutes, so the initial grid should be deliberately small and expanded only after a pilot confirms runtime.

## Log

### 2026-04-28 — Project created

Project initiated via `/project scaffold` for a human-requested study of denoising algorithms on noisy Lorenz63 trajectories. The project is scoped to produce benchmark knowledge: which method and hyperparameter regimes recover clean trajectories best as noise level varies.

Sources: none (project creation)

## Open questions

- Which Lorenz63 integration time step, burn-in length, trajectory length, and number of realizations should define the default benchmark?
- Which supporting metrics beyond RMSE should be included in the first report?
- Should hyperparameters be selected per noise level, or should the report also recommend one robust hyperparameter setting across noise levels?
