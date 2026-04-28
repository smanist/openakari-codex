---
id: compact-polynomial-kernel-retuning-v1
type: experiment
status: planned
date: 2026-04-28
project: smoothing
consumes_resources: true
module: smoothing
artifacts_dir: modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1
tags: [lorenz63, denoising, compact-polynomial-kernel, hyperparameter-retuning, visual-check]
---

# Compact-Polynomial Kernel Retuning v1

## Specification

This experiment tests whether the compactly supported polynomial anchor-basis kernel can beat Savitzky-Golay after a denser search over its underexplored hyperparameters.

Default fixed noise level: `alpha = 0.20`.

Primary Savitzky-Golay reference:

- `savgol|w=41|p=5`, the v1 best SG setting at `alpha = 0.20`

Secondary Savitzky-Golay reference:

- `savgol|w=21|p=3`, the v1 robust cross-noise SG setting

Required compact-polynomial search dimensions:

- anchor count `M`
- bandwidth or bandwidth multiplier
- compact-polynomial degree `p` in `k(x,x') = (1 - (x - x')^2 / h^2)^p` for `|x - x'| <= h`, and `0` otherwise

Recommended starting grid:

- `M in {128, 192, 256, 384, 512}`
- bandwidth multiplier `c_h in {0.25, 0.5, 0.75, 1, 1.5, 2, 3}`
- degree `p in {1, 2, 3, 4, 6, 8}`

The implementation may use a staged grid if the full sweep is too slow, but must record the searched grid and any pruning rule.

Required metrics:

- RMSE
- relative RMSE
- denoising gain
- per-coordinate RMSE

For each setting, report metric mean and variance across trajectory/noise realizations. Use the same clean/noisy realization contract as v1 unless this record is updated with a deliberate deviation.

## Visual Checks

For final candidate algorithms, produce typical denoised-trajectory plots at `alpha = 0.20`. At minimum include:

- the best retuned compact-polynomial kernel
- `savgol|w=41|p=5`
- `savgol|w=21|p=3`
- clean trajectory
- noisy observations

Plot all three Lorenz63 coordinates for one representative realization. The figure should be saved under `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/plots/`.

## Success Criteria

Confirmed:

- a retuned compact-polynomial setting beats `savgol|w=41|p=5` on mean RMSE at `alpha = 0.20`, and the typical denoised plot does not show obvious qualitative failure

Partially confirmed:

- a retuned compact-polynomial setting beats `savgol|w=21|p=3` but not `savgol|w=41|p=5`

Refuted:

- no searched compact-polynomial setting beats either SG reference, or the only metric win has visible qualitative failure in the typical denoised plot

## Resource Plan

CPU-only. If the sweep is expected to exceed 2 minutes, launch through:

```text
python infra/experiment-runner/run.py --detach --artifacts-dir modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1 --project-dir projects/smoothing --max-retries <N> --watch-csv <output-csv> --total <N> projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1 -- <command...>
```

Then register the experiment with the scheduler API.

## Changes

Planned. Implementation should live under `modules/smoothing/`; runtime logs, result tables, and typical denoised plots should live under `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/`.

## Verification

Planned. Record exact commands and key outputs after implementation and execution.

## Findings

Planned. Numerical claims must cite the producing script and result file, or include inline arithmetic from referenced data.
