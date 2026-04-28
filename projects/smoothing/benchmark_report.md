# Lorenz63 denoising benchmark report

Status: v1
Date: 2026-04-28

This report consolidates the current Lorenz63 denoising benchmark artifacts for `projects/smoothing/` and summarizes the first completed comparison between Savitzky-Golay filtering and the v1 kernel-smoothing family.

## Scope and status

- Dataset regime: on-attractor Lorenz63 trajectories generated with fixed-step RK4 at `dt = 0.01`, `5000` burn-in steps, and `2048` recorded steps.
- Observation model: coordinate-scaled i.i.d. Gaussian noise with `alpha in {0.02, 0.05, 0.10, 0.20}`.
- Methods compared: Savitzky-Golay filtering and anchor-basis kernel smoothing with Gaussian or compact-polynomial kernels.
- Current status: the v1 sweep is complete and the reportable conclusion is stable for the tested grid. Savitzky-Golay dominates the tested kernel family at every evaluated noise level.

## Inputs and provenance

Protocol:
- `projects/smoothing/evaluation_protocol.md`

Experiment record:
- `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`

Implementation:
- `modules/smoothing/generate_lorenz63_dataset.py`
- `modules/smoothing/denoise_baselines.py`
- `modules/smoothing/run_denoising_sweep.py`

Primary result artifacts:
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/run_manifest.json`
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/metrics_raw.csv`
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/summary_by_setting.csv`
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/best_by_noise.csv`
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/robust_settings.csv`

Plots:
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/rmse_vs_noise.png`
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/relative_rmse_vs_noise.png`
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/denoising_gain_vs_noise.png`

## Benchmark design summary

- Clean-trajectory replication: `5` trajectory seeds.
- Noise replication: `2` replicate IDs per clean trajectory, for `10` noisy rows per `alpha` and `40` noisy trajectories overall.
- Uncertainty rule: report metric means across all `10` rows, but compute variance from the `5` trajectory-seed cluster means because the two replicates for one seed share the same clean trajectory.
- Savitzky-Golay grid: window lengths `7, 11, 21, 41` and polynomial orders `2, 3, 5`, with invalid `polyorder >= window_length` combinations skipped, for `12` valid settings.
- Kernel grid: anchor counts `32, 64, 128`, bandwidth multipliers `1, 2, 4`, Gaussian kernels, and compact-polynomial kernels with degrees `2, 3, 4`, for `36` settings.
- Total evaluated settings: `48`, which over `40` noisy trajectories yields `48 * 40 = 1920` raw metric rows.
- Reported metrics: `RMSE`, `relative_RMSE`, `denoising_gain`, and per-coordinate RMSE diagnostics.

Per `run_manifest.json`, the completed v1 sweep produced `1920` raw rows, `192` grouped summary rows, `8` best-per-noise rows, and `4` robust-setting rows.

## Results

### Best Savitzky-Golay row by noise level

All rows below have `n_realizations = 10` and `n_clusters = 5`.

| alpha | setting | mean RMSE | variance RMSE | mean relative RMSE | variance relative RMSE | mean denoising gain | variance denoising gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.02 | `savgol\|w=21\|p=5` | 0.120012 | 0.000008 | 0.007473 | 0.0000000207 | 0.590022 | 0.000068 |
| 0.05 | `savgol\|w=21\|p=3` | 0.274086 | 0.000089 | 0.017072 | 0.0000004707 | 0.625281 | 0.000320 |
| 0.10 | `savgol\|w=21\|p=3` | 0.492264 | 0.000167 | 0.030660 | 0.0000008657 | 0.663556 | 0.000156 |
| 0.20 | `savgol\|w=41\|p=5` | 0.882383 | 0.000538 | 0.054959 | 0.0000030473 | 0.698451 | 0.000136 |

Provenance: `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/best_by_noise.csv`.

### Best kernel row by noise level

All rows below have `n_realizations = 10` and `n_clusters = 5`.

| alpha | setting | mean RMSE | variance RMSE | mean relative RMSE | variance relative RMSE | mean denoising gain | variance denoising gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.02 | `kernel\|type=gaussian\|M=128\|ch=1` | 0.957341 | 0.006175 | 0.059651 | 0.0000286533 | -2.274181 | 0.102205 |
| 0.05 | `kernel\|type=gaussian\|M=128\|ch=1` | 0.971331 | 0.006093 | 0.060522 | 0.0000283678 | -0.328782 | 0.016240 |
| 0.10 | `kernel\|type=gaussian\|M=128\|ch=1` | 1.019702 | 0.005842 | 0.063534 | 0.0000275145 | 0.302571 | 0.003979 |
| 0.20 | `kernel\|type=gaussian\|M=128\|ch=1` | 1.193503 | 0.005268 | 0.074356 | 0.0000257727 | 0.591923 | 0.000964 |

Provenance: `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/best_by_noise.csv`.

### Method comparison

- Savitzky-Golay beats the best tested kernel row on all three reported metrics at every noise level. On RMSE, the winner gap shrinks from `0.957341 / 0.120012 = 7.98` at `alpha = 0.02` to `1.193503 / 0.882383 = 1.35` at `alpha = 0.20`, but the ranking never flips.
- Kernel smoothing is especially weak in the low-noise regime. The number of kernel settings with positive mean denoising gain is `0/36` at `alpha = 0.02`, `0/36` at `0.05`, `8/36` at `0.10`, and `11/36` at `0.20`. The corresponding Savitzky-Golay counts are `10/12`, `10/12`, `12/12`, and `12/12`.
- The best kernel row is stable but limited: `kernel|type=gaussian|M=128|ch=1` is the best kernel entry in `best_by_noise.csv` at all four noise levels, and no compact-polynomial kernel wins any per-noise slice.
- Kernel uncertainty stays much larger than Savitzky-Golay uncertainty across all reported metrics. At `alpha = 0.02`, kernel versus Savitzky-Golay cluster-adjusted variances are `0.006175` versus `0.000008` for RMSE, `0.0000286533` versus `0.0000000207` for relative RMSE, and `0.102205` versus `0.000068` for denoising gain.

Provenance: `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/best_by_noise.csv`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/summary_by_setting.csv`.

## Recommendations

### Default cross-noise recommendation

For a single default over the tested noise range, use `savgol|w=21|p=3`. In `robust_settings.csv`, it is the only method-level recommendation that satisfies the robust filter and it achieves:

- `robust_mean_relative_rmse_across_noise = 0.029421693881328793`
- `positive_gain_noise_levels = 4/4`

Per-noise rows for the robust default:

| alpha | mean RMSE | variance RMSE | mean relative RMSE | variance relative RMSE | mean denoising gain | variance denoising gain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.02 | 0.168452 | 0.000063 | 0.010493 | 0.0000003111 | 0.424136 | 0.001251 |
| 0.05 | 0.274086 | 0.000089 | 0.017072 | 0.0000004707 | 0.625281 | 0.000320 |
| 0.10 | 0.492264 | 0.000167 | 0.030660 | 0.0000008657 | 0.663556 | 0.000156 |
| 0.20 | 0.954745 | 0.000489 | 0.059462 | 0.0000023220 | 0.673766 | 0.000107 |

Provenance: `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/robust_settings.csv`.

### Per-noise tuning recommendation

- Use `savgol|w=21|p=5` at `alpha = 0.02`.
- Use `savgol|w=21|p=3` at `alpha = 0.05` and `alpha = 0.10`.
- Use `savgol|w=41|p=5` at `alpha = 0.20`.

These are the Savitzky-Golay best-per-noise rows from `best_by_noise.csv`.

### Kernel-specific recommendation

If the benchmark must stay within the tested kernel family, use `kernel|type=gaussian|M=128|ch=1` as the best tested kernel configuration. It is the kernel winner at every `alpha`, but it is not a strong default:

- it has negative mean denoising gain at `alpha = 0.02` and `alpha = 0.05`
- it never beats the best Savitzky-Golay row on RMSE, relative RMSE, or denoising gain
- no kernel configuration qualified for `robust_settings.csv` under the positive-gain filter

The practical recommendation is therefore method-selective, not symmetric: use Savitzky-Golay for the current v1 benchmark, and treat the tested kernel family as a weaker baseline rather than a competitive default.

## Limitations

- This report covers one benchmark version and one kernel-estimator family. The conclusion is limited to the tested Savitzky-Golay grid and the tested anchor-basis kernel grid.
- Reported metrics measure pointwise state-space reconstruction fidelity, not attractor geometry or derivative preservation.
- Uncertainty uses `5` outer clusters, which is sufficient for the v1 CPU budget target but still a small-sample regime.

## Optional follow-up

- If a v2 benchmark is needed, expand beyond the current anchor-basis kernel family before spending more sweep budget on fine-grained retuning inside the same family.
