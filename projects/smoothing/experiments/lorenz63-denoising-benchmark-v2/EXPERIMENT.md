---
id: lorenz63-denoising-benchmark-v2
type: experiment
status: in_progress
date: 2026-04-28
project: smoothing
consumes_resources: true
module: smoothing
artifacts_dir: modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2
tags: [lorenz63, denoising, benchmark-v2, local-regression, smoothing-spline]
---

# Lorenz63 Denoising Benchmark v2

## Specification

### Knowledge output

This benchmark should determine whether the v1 kernel failure was specific to the anchor-basis least-squares family or whether stronger classical smoothers still fail to compete with Savitzky-Golay on noisy Lorenz63 trajectories. The benchmark also measures whether adding one dynamics-aware diagnostic changes the practical ranking.

### Hypothesis

The v1 kernel family underperformed mainly because it used a low-rank anchor basis with no row normalization or local polynomial correction. Therefore:

1. at least one non-anchor v2 family will achieve positive mean denoising gain at all four `alpha` values, unlike the strongest frozen anchor-basis reference slice from v1
2. at least one non-anchor v2 family will reduce the RMSE gap to the best Savitzky-Golay row enough to finish within `20%` of Savitzky-Golay at `alpha in {0.10, 0.20}`

### CI layers

- L2 Workflow: dataset reuse, family implementation, staged sweep execution
- L4 Evaluation: metric computation, family screening, confirmatory tables and plots
- L5 Human: deciding whether dynamics-aware secondary diagnostics change the practical recommendation

### Variables

- Independent: denoising family and hyperparameters.
  Savitzky-Golay reference settings: `(w, p) in {(11, 3), (21, 3), (21, 5), (41, 5)}`.
  Frozen anchor-basis kernel reference settings: the strongest committed `M=128` v1 rows, namely `gaussian` with `c_h in {1, 2, 4}` plus `compact_polynomial M=128, c_h=2, degree=3`.
  New v2 families:
  `normalized_kernel_regression` with kernels `{gaussian, tricube}` and odd spans `{11, 21, 41, 81}`;
  `local_linear_regression` with kernels `{gaussian, tricube}` and the same spans;
  `cubic_smoothing_spline` with `lambda_rel in {0.25, 0.5, 1, 2, 4}`, where each coordinate uses the observable noisy-signal scale
  `obs_scale_j = mean_t |y_j(t)|` and smoothing factor `s_j = lambda_rel * N * (alpha * obs_scale_j)^2`.
  These families were chosen because they remove the v1 anchor-basis restriction while remaining CPU-feasible and classical enough to interpret mechanistically.
- Dependent: primary metric `RMSE`, kept as the ranking metric so v2 stays directly comparable to v1.
  RMSE captures pointwise reconstruction fidelity in state-space units, but it can favor amplitude smoothing over dynamics fidelity.
- Dependent: secondary metric `relative_RMSE`.
  It normalizes for signal scale across noise levels, but it still inherits RMSE's sensitivity to large pointwise errors.
- Dependent: secondary metric `denoising_gain`.
  It measures improvement over the noisy input baseline, but it can be noisy when the noisy-input RMSE is small.
- Dependent: secondary diagnostic `derivative_RMSE`, computed from centered finite differences on the interior time steps for both clean and denoised trajectories using the same `dt = 0.01`.
  This is a dynamics-aware check, not the primary ranking metric, because numerical differentiation amplifies boundary and phase errors.
- Controlled: keep the v1 data regime fixed through `modules/smoothing/generate_lorenz63_dataset.py:build_dataset()` with `sigma = 10`, `rho = 28`, `beta = 8/3`, RK4 `dt = 0.01`, burn-in `5000`, record length `2048`, `alpha in {0.02, 0.05, 0.10, 0.20}`, trajectory seeds, and noise-seed derivation.
- Controlled: all families are scored on identical clean/noisy realizations, must return the same output shape as the noisy input, and must record exact family metadata in raw rows.

### Method

1. Reuse the existing dataset-generation contract in `modules/smoothing/generate_lorenz63_dataset.py:build_dataset()` and write the v2 dataset snapshot under `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/`.
2. Implement v2 methods in new code paths rather than mutating the v1 runner in place:
   `modules/smoothing/denoise_families_v2.py` for the new families and `modules/smoothing/run_denoising_sweep_v2.py` for staged execution.
   Keep `modules/smoothing/run_denoising_sweep.py:run_sweep()` unchanged so v1 remains reproducible.
3. Pilot stage: use the v1 replication budget of `5` trajectory seeds times `2` replicate IDs for `10` raw rows and `5` outer clusters per `alpha`.
4. Evaluate the `29` pilot settings defined above on the exact same noisy trajectories:
   `4` Savitzky-Golay references, `4` anchor-basis references, `8` normalized-kernel settings, `8` local-linear settings, and `5` spline settings.
5. For both `normalized_kernel_regression` and `local_linear_regression`, map each odd `span` to an interior sample-index radius `r = (span - 1) / 2`. For Gaussian kernels, use `K(u) = exp(-u^2 / 2)` with bandwidth `h = r / 3`, so the runtime truncation rule `|t - i| <= 3h` is exactly `|t - i| <= r`. For tricube kernels, define `u = (t - i) / max(r, 1)` and use `K(u) = (1 - |u|^3)^3` for `|u| <= 1`, else `0`; this makes `span` the common neighborhood-width contract across both families.
6. For `normalized_kernel_regression`, compute coordinate-wise row-normalized weighted averages over sample index using the span-to-kernel mapping above. For Gaussian weights, normalize over the truncated `|t - i| <= r` neighborhood only. For tricube weights, use the same `r`-bounded neighborhood.
7. For `local_linear_regression`, fit a weighted first-order polynomial independently at each target index and coordinate, then evaluate the fitted intercept at that target. Use the same kernels and the same explicit `span -> r -> h` mapping as the normalized-kernel family so the comparison isolates estimator order rather than neighborhood shape alone.
8. For `cubic_smoothing_spline`, fit each coordinate independently with a cubic spline whose smoothing factor uses only observable inputs: compute `obs_scale_j = mean_t |y_j(t)|` from the noisy coordinate and set `s_j = lambda_rel * N * (alpha * obs_scale_j)^2`. Clean-side `coordinate_scales` metadata from dataset generation must not be consumed by this family.
9. Extend the raw output schema from v1 to include `family`, `span`, `lambda_rel`, and `derivative_rmse`, but keep the v1 ranking contract explicit: in the v2 runner, `method` becomes the family key consumed by `modules/smoothing/run_denoising_sweep.py:summarize_rows()`, `select_best_by_noise()`, and `select_robust_settings()`, with values such as `savitzky_golay`, `anchor_basis_kernel`, `normalized_kernel_regression`, `local_linear_regression`, and `cubic_smoothing_spline`. The added `family` column should mirror that family label for readability, while legacy v1 hyperparameter fields remain present and null when a family does not use them.
10. Pilot selection rule: within each non-reference v2 family, carry forward up to `2` finalist settings with the lowest mean `relative_RMSE` averaged equally across the four noise levels among settings with positive mean denoising gain at least `3/4` noise levels. If a family has no such setting, carry forward its single best average-`relative_RMSE` row as a failure-case reference.
11. Confirmatory stage: rerun the finalist settings plus the four Savitzky-Golay references and the four frozen anchor-basis reference settings on `8` trajectory seeds times `2` replicate IDs for `16` raw rows and `8` outer clusters per `alpha`.
12. In confirmatory comparisons, define the anchor-basis baseline at each noise level as the lowest-RMSE row among those four frozen anchor-basis reference settings, rather than comparing against a weaker hand-picked subset.
13. Produce pilot artifacts:
    `metrics_raw.csv`, `summary_by_setting.csv`, `family_screen.csv`, and the standard RMSE / relative-RMSE / denoising-gain plots under `pilot/`.
14. Produce confirmatory artifacts:
    `metrics_raw.csv`, `summary_by_setting.csv`, `best_by_noise.csv`, `robust_settings.csv`, `family_comparison.csv`, and the standard plots plus `derivative_rmse_vs_noise.png` under `confirmatory/`.
15. If either stage is expected to run longer than `2` minutes, submit it through `infra/experiment-runner/run.py --detach` with explicit `--artifacts-dir`, `--project-dir`, `--max-retries`, `--watch-csv`, and `--total` flags rather than supervising it in-session.

### Validity threats

- Position bias: not applicable; the benchmark is numerical, not pairwise human judgment.
- Sample size: the pilot keeps the v1 `5`-cluster uncertainty regime for direct comparability, but the confirmatory stage raises that to `8` clusters so close family differences are less likely to be pure small-sample noise.
- Confounds: all families share the same clean trajectories, noise realizations, and scoring window. The confirmatory stage reruns finalists, Savitzky-Golay references, and frozen anchor-basis references on the same fresh, larger seed set instead of mixing pilot and confirmatory rows. Family-specific tuning may depend only on the noisy observation and the benchmark-declared noise level `alpha`; clean-side `coordinate_scales` metadata is not allowed at evaluation time.
- Construct validity: RMSE remains the primary ranking metric, so v2 still centers state reconstruction. `derivative_RMSE` is added only as a secondary check because it is informative for dynamics preservation but more numerically fragile.
- Boundary behavior: Savitzky-Golay, local-kernel, local-linear, and spline methods handle edges differently. v2 mitigates this by scoring the full window, documenting each edge rule explicitly, and comparing multiple family types rather than treating one boundary convention as neutral.
- Config fidelity: no `projects/smoothing/production-code.md` exists. Verified reusable paths are `modules/smoothing/generate_lorenz63_dataset.py:build_dataset()` and `modules/smoothing/run_denoising_sweep.py:run_sweep()` plus its summary helpers. v2 should add new runner/module files instead of rewriting the v1 path.
- Upstream limitations reviewed:
  `lorenz63-denoising-sweep-v1` has no explicit `## Limitations` section in its EXPERIMENT record, but the v1 benchmark report records three relevant limitations: only one kernel-estimator family was tested, only pointwise state-space metrics were primary, and uncertainty rested on `5` outer clusters.
  Mitigation: v2 broadens the smoother families, adds `derivative_RMSE` as a secondary dynamics-aware diagnostic, increases the confirmatory stage to `8` clusters, and freezes the anchor-basis references to the strongest actually committed `M=128` v1 settings rather than introducing weaker unrun rows.

### Cost estimate

- API calls: none.
- Compute: pilot target `10-15` CPU minutes; confirmatory target `10-15` CPU minutes with fewer settings but more clusters.
- Human time: low after implementation; manual work is limited to pilot-review and confirmatory interpretation.
- Sessions: multi-session. Implementation, pilot submission, pilot analysis, confirmatory submission, and confirmatory analysis should be separate tasks.

### Success criteria

- Confirmed if:
  at least one non-anchor v2 family has positive mean denoising gain at all four `alpha` values in the confirmatory stage, beats the best confirmatory-stage frozen anchor-basis reference row on mean RMSE at all four `alpha` values, and finishes within `20%` of the best confirmatory-stage Savitzky-Golay RMSE at `alpha = 0.10` and `0.20`.
- Refuted if:
  every non-anchor v2 family either fails the positive-gain test at low noise or remains worse than the best confirmatory-stage frozen anchor-basis reference row on at least `3/4` noise levels.
- Ambiguous if:
  a non-anchor family trades slightly worse RMSE for materially better `derivative_RMSE`, or the confirmatory-stage uncertainty bands overlap enough that no ranking is stable.

## Design rationale

The core judgment call was to expand laterally across smoother families instead of vertically retuning the known-weak anchor-basis family. v1 already showed that the best anchor-basis kernel stayed worse than Savitzky-Golay at every tested noise level and even had negative denoising gain at `alpha = 0.02` and `0.05`, so more budget inside that same family would produce limited new knowledge.

I kept Savitzky-Golay and a small frozen slice of the anchor-basis family in the grid because v2 still needs anchored comparisons, but I rejected carrying the entire v1 `36`-setting kernel sweep forward. The broader signal-processing question is whether locality and penalization help, not whether one more anchor-count tweak rescues the old family.

I chose normalized kernel regression, local-linear regression, and cubic smoothing splines because they cover three distinct failure-mode hypotheses: row normalization may remove amplitude shrinkage, local-linear fitting may reduce boundary and bias error, and spline penalization may offer a smoother global bias-variance tradeoff than the v1 low-rank basis. I did not include wavelet shrinkage or Kalman-style filters in v2 because they would introduce a larger dependency and modeling jump before the benchmark has exhausted simpler classical smoothers.

## Findings

Result: partially confirmed in the pilot stage. Every non-anchor v2 family produced confirmatory-worthy settings with positive mean denoising gain at low noise, and the best non-anchor row beat the frozen anchor-basis reference at every tested `alpha`, but Savitzky-Golay remained the primary-RMSE winner at all four noise levels. The derivative-aware diagnostic keeps confirmatory evaluation necessary because it favors some unselected local-linear settings that the primary handoff rule does not carry forward.

- The committed pilot bundle is internally complete: `metrics_raw.csv` contains `1160` rows, `summary_by_setting.csv` contains `116` grouped rows, and `family_screen.csv` contains `21` screening rows. This matches the declared pilot design because `29` settings evaluated over `40` noisy samples implies `29 * 40 = 1160` raw rows. Provenance: `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/{metrics_raw.csv,summary_by_setting.csv,family_screen.csv,run_manifest.json}`.
- Pilot screening selected `6` confirmatory finalists from `11/21` gain-eligible non-anchor settings, and no family required the fallback "single best failure-case reference" path. The selected settings are `spline|lambda_rel=1`, `spline|lambda_rel=0.5`, `local_linear|type=tricube|span=11`, `local_linear|type=gaussian|span=11`, `normalized|type=tricube|span=11`, and `normalized|type=gaussian|span=11`. Eligible-setting counts were `3/5` for cubic splines, `4/8` for local-linear regression, and `4/8` for normalized kernel regression. Provenance: `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/family_screen.csv`.
- Savitzky-Golay still leads on the primary RMSE metric at every tested noise level, but the best non-anchor row is already much stronger than the frozen anchor-basis reference and stays within `14.66460182333849%` of the best Savitzky-Golay RMSE even at its worst pilot slice. The best frozen anchor row is the same setting, `anchor|type=gaussian|M=128|ch=1`, at all four `alpha` values.

| alpha | best Savitzky-Golay | mean RMSE | best non-anchor | mean RMSE | best non-anchor / SG | best non-anchor / anchor |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| 0.02 | `savgol\|w=21\|p=5` | 0.120012 | `spline\|lambda_rel=1` | 0.132752 | 1.106162 | 0.138668 |
| 0.05 | `savgol\|w=21\|p=3` | 0.274086 | `local_linear\|type=tricube\|span=11` | 0.312081 | 1.138623 | 0.321292 |
| 0.10 | `savgol\|w=21\|p=3` | 0.492264 | `local_linear\|type=tricube\|span=11` | 0.564453 | 1.146646 | 0.553547 |
| 0.20 | `savgol\|w=41\|p=5` | 0.882383 | `local_linear\|type=gaussian\|span=21` | 0.943215 | 1.068942 | 0.790292 |

Provenance: `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/summary_by_setting.csv`; inline arithmetic from the same file.
- No non-anchor family fails the pilot low-noise positive-gain criterion at the family level. Each family has at least one setting with positive mean denoising gain on all four noise levels, while the rejected settings cluster in the over-smoothed regime: spline `lambda_rel in {2, 4}` has `0/4` positive-gain noise levels, both `span=81` local-linear settings have `0/4`, both `span=81` normalized settings have `0/4`, and the `span=41` local-linear/normalized rows range from `1/4` to `2/4`. Provenance: `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/family_screen.csv`; `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/summary_by_setting.csv`.
- `derivative_RMSE` changes the provisional story enough that the confirmatory stage should keep reporting it even though the pilot handoff rule stays primary-metric driven. At every `alpha`, the best non-anchor derivative row beats the best derivative-aware Savitzky-Golay row, but the derivative winners at `alpha = 0.10` and `0.20` are eligible `span=21` local-linear settings that were not selected for confirmatory reruns because the pilot rule ranks by average `relative_RMSE` instead.

| alpha | best non-anchor derivative row | mean derivative RMSE | best SG derivative row | mean derivative RMSE | selected for confirmatory |
| --- | --- | ---: | --- | ---: | --- |
| 0.02 | `spline\|lambda_rel=1` | 3.985906 | `savgol\|w=21\|p=5` | 4.252440 | yes |
| 0.05 | `spline\|lambda_rel=1` | 7.616714 | `savgol\|w=21\|p=3` | 7.714158 | yes |
| 0.10 | `local_linear\|type=gaussian\|span=21` | 11.991120 | `savgol\|w=41\|p=5` | 12.112833 | no |
| 0.20 | `local_linear\|type=tricube\|span=21` | 17.234338 | `savgol\|w=41\|p=5` | 20.005708 | no |

Provenance: `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/summary_by_setting.csv`; `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/family_screen.csv`.

## Changes

2026-04-28 pilot execution completed the first staged artifact bundle under `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/`.

- The default pilot run was executed inline rather than through `infra/experiment-runner/run.py --detach` because a timed full-command benchmark completed in under the repo's `2` minute threshold.
- The pilot bundle writes the dataset snapshot, `metrics_raw.csv`, `summary_by_setting.csv`, `family_screen.csv`, `run_manifest.json`, `output.log`, and the three standard comparison plots.
- `.gitignore` now explicitly unignores `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/{pilot,confirmatory}/plots/*.png` so staged plot artifacts remain portable in git rather than local-only.
- 2026-04-28 pilot analysis named six confirmatory finalists and documented the derivative-metric caveat where two eligible `span=21` local-linear rows beat Savitzky-Golay on `derivative_RMSE` but are not part of the primary-metric finalist handoff.
- The overall experiment remains `in_progress`: pilot execution and pilot analysis are complete, but confirmatory execution and confirmatory analysis are still pending.

## Verification

- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Run the v2 pilot Lorenz63 denoising sweep [skill: execute]","agentId":"codex-manual-2026-04-28-v2-lorenz63-pilot"}'`
  Output: curl exited with code `7` and printed `000`, so the scheduler claim endpoint was unreachable in this session and no live claim could be created.
- `/usr/bin/time -p python modules/smoothing/run_denoising_sweep_v2.py --out-dir /tmp/lorenz63-v2-pilot-benchmark-$$ --stage pilot --overwrite >/tmp/lorenz63-v2-pilot-benchmark-$$.stdout`
  Output: `real 28.96`, `user 28.68`, `sys 0.16`, establishing that the full default pilot stays below the repo's detached-run threshold.
- `/usr/bin/time -p python modules/smoothing/run_denoising_sweep_v2.py --out-dir modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot --stage pilot --overwrite >/tmp/lorenz63-v2-pilot-run.stdout`
  Output: `real 28.87`, `user 28.58`, `sys 0.17`
- `python - <<'PY' ... PY` counting rows in `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/{metrics_raw.csv,summary_by_setting.csv,family_screen.csv}` and reading `run_manifest.json`
  Output: `metrics_raw.csv 1160`, `summary_by_setting.csv 116`, `family_screen.csv 21`, and `manifest_counts {'n_family_screen_rows': 21, 'n_rows_expected': 1160, 'n_rows_written': 1160, 'n_samples': 40, 'n_settings': 29, 'n_summary_rows': 116}`. The same manifest recorded repo-relative pilot dataset paths and plot paths under `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/`.
- `python - <<'PY' ... PY` summarizing finalist selection, per-noise primary winners, and derivative winners from the pilot CSVs
  Output:
  `artifact_counts metrics_raw=1160 summary=116 family_screen=21`
  `family cubic_smoothing_spline eligible=3/5 selected=2`
  `family local_linear_regression eligible=4/8 selected=2`
  `family normalized_kernel_regression eligible=4/8 selected=2`
  `selected_finalists spline|lambda_rel=1, spline|lambda_rel=0.5, local_linear|type=tricube|span=11, local_linear|type=gaussian|span=11, normalized|type=tricube|span=11, normalized|type=gaussian|span=11`
  `alpha 0.02 primary sg=savgol|w=21|p=5 rmse=0.120012 non_anchor=spline|lambda_rel=1 rmse=0.132752 ratio_vs_sg=1.106162 ratio_vs_anchor=0.138668`
  `alpha 0.02 derivative non_anchor=spline|lambda_rel=1 deriv=3.985906 sg=savgol|w=21|p=5 deriv=4.252440 selected=True`
  `alpha 0.05 primary sg=savgol|w=21|p=3 rmse=0.274086 non_anchor=local_linear|type=tricube|span=11 rmse=0.312081 ratio_vs_sg=1.138623 ratio_vs_anchor=0.321292`
  `alpha 0.05 derivative non_anchor=spline|lambda_rel=1 deriv=7.616714 sg=savgol|w=21|p=3 deriv=7.714158 selected=True`
  `alpha 0.10 primary sg=savgol|w=21|p=3 rmse=0.492264 non_anchor=local_linear|type=tricube|span=11 rmse=0.564453 ratio_vs_sg=1.146646 ratio_vs_anchor=0.553547`
  `alpha 0.10 derivative non_anchor=local_linear|type=gaussian|span=21 deriv=11.991120 sg=savgol|w=41|p=5 deriv=12.112833 selected=False`
  `alpha 0.20 primary sg=savgol|w=41|p=5 rmse=0.882383 non_anchor=local_linear|type=gaussian|span=21 rmse=0.943215 ratio_vs_sg=1.068942 ratio_vs_anchor=0.790292`
  `alpha 0.20 derivative non_anchor=local_linear|type=tricube|span=21 deriv=17.234338 sg=savgol|w=41|p=5 deriv=20.005708 selected=False`
