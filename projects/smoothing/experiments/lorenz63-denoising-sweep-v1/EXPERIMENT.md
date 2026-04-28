---
id: lorenz63-denoising-sweep-v1
type: experiment
status: planned
date: 2026-04-28
project: smoothing
consumes_resources: true
module: smoothing
artifacts_dir: modules/smoothing/artifacts/lorenz63-denoising-sweep-v1
tags: [lorenz63, denoising, savgol, kernel-smoothing, hyperparameter-sweep]
---

# Lorenz63 Denoising Sweep v1

## Specification

Compare Savitzky-Golay filtering against kernel smoothing for noisy Lorenz63 trajectories. Clean trajectories should be generated on-attractor, then corrupted with i.i.d. Gaussian noise whose per-coordinate standard deviation is proportional to the coordinate's average absolute clean-signal magnitude.

Required algorithm families:

- Savitzky-Golay filter
- Kernel smoothing with Gaussian kernels
- Kernel smoothing with compact polynomial kernels `k(x,x') = (1 - (x - x')^2 / h^2)^p` on `|x - x'| <= h`

Required sweep dimensions:

- relative noise level
- trajectory/noise realization
- Savitzky-Golay window length and polynomial order
- kernel anchor count `M`
- kernel bandwidth `h`
- kernel type
- compact polynomial exponent `p`

Required metrics:

- RMSE against the clean trajectory
- at least one scale-normalized supporting metric

For each noise level and method/hyperparameter setting, report metric mean and variance across realizations.

## Resource Plan

CPU-only. The first sweep should complete within 20 minutes. If expected runtime exceeds 2 minutes, launch through:

```text
python infra/experiment-runner/run.py --detach --artifacts-dir modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 --project-dir projects/smoothing --max-retries <N> --watch-csv <output-csv> --total <N> <experiment-dir> -- <command...>
```

Then register the experiment with the scheduler API.

## Changes

Planned. Implementation should live under `modules/smoothing/`; runtime logs and result tables should live under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/`.

## Verification

Planned. Record exact commands and key outputs after implementation and execution.

## Findings

Planned. Numerical claims must cite the producing script and result file, or include inline arithmetic from referenced data.
