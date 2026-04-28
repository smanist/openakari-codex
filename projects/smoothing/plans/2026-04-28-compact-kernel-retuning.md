# Compact-Polynomial Kernel Retuning Plan

Date: 2026-04-28
Status: draft

## Knowledge Goal

Determine whether the compactly supported polynomial anchor-basis kernel can beat a Savitzky-Golay reference after a denser search over anchor count, bandwidth, and polynomial degree, or whether the v1 underperformance reflects a more fundamental limitation of this kernel family on noisy Lorenz63 trajectories.

## Starting Evidence

The v1 benchmark report concludes that Savitzky-Golay dominates the tested kernel family across the coarse grid. At `alpha = 0.20`, the best v1 kernel row was `kernel|type=gaussian|M=128|ch=1` with mean RMSE `1.1935029095800203`, while the best Savitzky-Golay row was `savgol|w=41|p=5` with mean RMSE `0.8823825590479313`.

The best v1 compact-polynomial settings were not selected as the per-noise winners, and the compact-polynomial grid only tested `M in {32, 64, 128}`, bandwidth multipliers `{1, 2, 4}`, and degrees `{2, 3, 4}`. The human follow-up asks whether this was too sparse to judge the compact-polynomial family.

Provenance: `projects/smoothing/benchmark_report.md`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/best_by_noise.csv`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/summary_by_setting.csv`.

## Default Comparison

Use `alpha = 0.20` as the fixed noise level unless implementation discovers a reason to choose another level. Compare retuned compact-polynomial kernels against two Savitzky-Golay references:

- primary per-noise target: `savgol|w=41|p=5`, the v1 best SG row at `alpha = 0.20`
- robust-default target: `savgol|w=21|p=3`, the v1 cross-noise default

The primary success target is beating `savgol|w=41|p=5` on mean RMSE at `alpha = 0.20`. The robust-default comparison is included to show whether a compact-polynomial setting beats the more deployment-friendly SG default even if it cannot beat the per-noise optimum.

## Proposed Retuning Grid

Start with a grid that explores beyond v1 but remains CPU-feasible:

- anchor count `M`: include values above and between v1 settings, such as `128, 192, 256, 384, 512`
- bandwidth multiplier `c_h`: include values below and around v1's best compact-polynomial region, such as `0.25, 0.5, 0.75, 1, 1.5, 2, 3`
- compact-polynomial degree `p`: include lower and higher degrees, such as `1, 2, 3, 4, 6, 8`

If the full grid is too slow, use a staged search:

1. coarse scan all three dimensions on fewer trajectory/noise realizations
2. refine around the best `M`, `c_h`, and `p`
3. rerun finalists on the same realization count used by the SG reference

## Visual Check Requirement

For the final chosen algorithms, plot typical denoised results against clean and noisy observations. At minimum, include:

- the best compact-polynomial retuned setting
- `savgol|w=41|p=5`
- `savgol|w=21|p=3`

Use one representative trajectory/noise realization at `alpha = 0.20`, and plot all three coordinates. The plot should make over-smoothing, phase lag, boundary artifacts, and coordinate-specific failure modes visible.

## Execution Notes

The run is CPU-only. If the sweep is expected to exceed 2 minutes, submit it through the experiment runner with explicit `--artifacts-dir`, `--project-dir`, `--max-retries`, `--watch-csv`, and `--total` flags.

Heavy outputs belong under `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/`. The durable experiment record belongs under `projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1/EXPERIMENT.md`.

## Closeout Criteria

The workstream is complete when the experiment record states one of:

- confirmed: a compact-polynomial setting beats the primary SG reference on mean RMSE at `alpha = 0.20`, with metric variance and typical plots recorded
- partially confirmed: a compact-polynomial setting beats the robust SG default but not the per-noise SG optimum
- refuted: no searched compact-polynomial setting beats either SG reference, with the best gap and likely failure mode documented
