# Smoothing — Tasks

## Phase 1: Benchmark design

- [x] Define the Lorenz63 denoising evaluation protocol [requires-frontier] [skill: design] [zero-resource]
  Why: The project needs a fixed data-generation, noise, metric, and reporting protocol before algorithm results are comparable.
  Done when: `projects/smoothing/evaluation_protocol.md` specifies trajectory generation, coordinate-scaled Gaussian noise levels, realization counts, metrics, aggregation rules, and standard tables/plots.
  Priority: high
  Evidence: `projects/smoothing/evaluation_protocol.md`; `projects/smoothing/plans/2026-04-27-denoising-benchmark.md`; `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`

- [x] Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]
  Why: All denoising methods need shared clean/noisy trajectories with known provenance.
  Done when: `modules/smoothing/` contains a script or package entrypoint that generates clean and noisy Lorenz63 trajectory datasets for at least two noise levels and two seeds, with metadata recording integration settings and per-coordinate noise scales.
  Priority: high
  Evidence: `modules/smoothing/generate_lorenz63_dataset.py`; `modules/smoothing/test_generate_lorenz63_dataset.py`
  Notes: CPU-only. Keep pilot generation small enough for a full benchmark dry run to stay under 20 minutes.

- [x] Implement Savitzky-Golay and kernel smoothing baselines [skill: execute]
  Why: The benchmark requires comparable implementations for the two requested algorithm families.
  Done when: `modules/smoothing/` exposes denoising functions or scripts for Savitzky-Golay, Gaussian-kernel smoothing, and compact-polynomial-kernel smoothing, and a smoke test verifies each returns a denoised signal with the same shape as the input.
  Priority: high
  Evidence: `modules/smoothing/denoise_baselines.py`; `modules/smoothing/test_denoise_baselines.py`

## Phase 2: Benchmark execution

- [x] Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]
  Why: The project needs empirical mean/variance estimates across noise levels and realizations.
  Done when: `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md` is updated from planned to running/completed, the sweep is submitted through the experiment runner if expected to exceed 2 minutes, and artifacts are written under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/`.
  Priority: high
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`; `modules/smoothing/run_denoising_sweep.py`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/run_manifest.json`
  Notes: CPU-only. Maximum intended runtime for the first sweep is 20 minutes.

- [x] Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]
  Why: Raw sweep outputs need interpretation into method rankings and hyperparameter recommendations.
  Done when: The experiment Findings section reports mean and variance of RMSE and supporting metrics by noise level and method, with provenance to result files or inline arithmetic, and identifies best-performing hyperparameter regimes.
  Priority: high
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`

- [x] Restore portable Lorenz63 sweep plot artifacts [fleet-eligible] [skill: execute] [zero-resource]
  Why: `run_manifest.json` and `output.log` reference the three plot PNGs under the original execution worktree, but the committed artifact directory in this worktree currently lacks `plots/`, which weakens report portability.
  Done when: `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/` contains `rmse_vs_noise.png`, `relative_rmse_vs_noise.png`, and `denoising_gain_vs_noise.png`, and the manifest/log references are regenerated or clarified for the current workspace.
  Priority: medium
  Evidence: `modules/smoothing/run_denoising_sweep.py`; `modules/smoothing/test_run_denoising_sweep.py`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/run_manifest.json`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/output.log`; `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/rmse_vs_noise.png`

## Phase 3: Report

- [x] Write the Lorenz63 denoising benchmark report [requires-frontier] [skill: record] [zero-resource]
  Why: The project Done-when requires a durable report that consolidates protocol, algorithms, results, and recommendations.
  Done when: `projects/smoothing/benchmark_report.md` exists and summarizes the benchmark design, sweep grid, metric means/variances, method comparison, and recommended hyperparameters.
  Priority: medium
  Evidence: `projects/smoothing/benchmark_report.md`; `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`

## Phase 4: Compact-polynomial kernel retuning

- [x] Design a targeted compact-polynomial kernel retuning study [requires-frontier] [skill: design] [zero-resource]
  Why: Human follow-up argues the compactly supported polynomial kernel family was not explored sufficiently before concluding it cannot compete with Savitzky-Golay.
  Done when: `projects/smoothing/plans/2026-04-28-compact-kernel-retuning.md` and `projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1/EXPERIMENT.md` define a fixed-noise retuning protocol, SG reference, success threshold, and visual-check outputs.
  Priority: high
  Evidence: `projects/smoothing/plans/2026-04-28-compact-kernel-retuning.md`; `projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1/EXPERIMENT.md`

- [x] Implement dense compact-polynomial kernel retuning support [requires-frontier] [skill: execute]
  Why: The v1 runner only swept a coarse anchor/bandwidth/degree grid and did not emit typical denoised-trajectory visualizations.
  Done when: `modules/smoothing/` can run a compact-polynomial-only retuning sweep over denser `M`, bandwidth, and degree grids at a selected noise level, and tests cover the added grid construction plus plot-output contract without changing v1 artifacts.
  Priority: high
  Evidence: `projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1/EXPERIMENT.md`

- [x] Run the alpha-0.20 compact-polynomial kernel retuning sweep [skill: execute]
  Why: The project needs empirical evidence for whether dense tuning can make the compact polynomial kernel beat the v1 Savitzky-Golay reference at a representative high-noise setting.
  Done when: artifacts exist under `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/`, the experiment record captures the exact command/submission, and the run includes both aggregate metrics and typical denoised-trajectory plots.
  Priority: high
  Notes: CPU-only; use the experiment runner if the sweep is expected to exceed 2 minutes.

- [x] Analyze the compact-polynomial retuning results against Savitzky-Golay [requires-frontier] [skill: analyze] [zero-resource]
  Why: The retuning sweep must decide whether the compact polynomial kernel can beat SG, and whether any win survives visual inspection of typical trajectories.
  Done when: the experiment Findings section reports mean/variance metrics against `savgol|w=41|p=5` and `savgol|w=21|p=3`, identifies the best compact-polynomial settings, and links typical denoised-result plots for the chosen algorithms.
  Priority: high
  Evidence: `projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1/EXPERIMENT.md`

## Phase 5: Benchmark v2

- [x] Design a v2 Lorenz63 denoising benchmark that expands beyond the current anchor-basis kernel family [requires-frontier] [skill: design] [zero-resource]
  Why: The v1 report shows the anchor-basis kernel family is a weak baseline, so the next benchmark should test broader classical smoother families if targeted compact-polynomial retuning does not close the gap.
  Done when: `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md` specifies the staged v2 benchmark design, and `projects/smoothing/plans/2026-04-28-design-v2-lorenz63-benchmark.md` records the execution plan.
  Priority: medium
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md`; `projects/smoothing/plans/2026-04-28-design-v2-lorenz63-benchmark.md`
  Notes: Defer execution until the compact-polynomial retuning workstream has confirmed, partially confirmed, or refuted the kernel-rescue hypothesis.

- [x] Implement the v2 denoiser families and staged sweep harness [requires-frontier] [skill: execute]
  Why: The v2 design depends on normalized local-regression and smoothing-spline families plus a separate staged runner that preserves v1 reproducibility; compact-polynomial retuning is now complete, so the implemented v2 harness is unblocked for pilot execution.
  Done when: `modules/smoothing/` includes reusable implementations for the planned v2 families, a v2 sweep runner emits pilot-stage artifacts, and regression tests cover the new family contracts without changing v1 outputs.
  Priority: medium
  Evidence: `modules/smoothing/denoise_families_v2.py`; `modules/smoothing/run_denoising_sweep_v2.py`; `modules/smoothing/test_denoise_families_v2.py`

- [x] Run the v2 pilot Lorenz63 denoising sweep [skill: execute]
  Why: The staged design requires a family-level screen before committing more CPU to confirmatory replication, and compact-polynomial retuning has left a remaining gap to the strongest Savitzky-Golay reference.
  Done when: pilot artifacts exist under `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/`, and `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md` records the pilot submission and completion state.
  Priority: medium
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md`; `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/`

- [ ] Analyze the v2 pilot Lorenz63 denoising sweep [requires-frontier] [skill: analyze] [zero-resource]
  Why: The pilot must identify which non-anchor settings justify confirmatory reruns and whether any family already fails the low-noise positive-gain criterion.
  Done when: the v2 experiment record names the finalist settings and records the pilot-stage findings with provenance to pilot artifacts.
  Priority: medium
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md`

- [ ] Run the confirmatory v2 Lorenz63 denoising benchmark [skill: execute] [blocked-by: v2 pilot analysis]
  Why: Final recommendations should be based on a larger cluster count than v1 after the pilot has pruned the grid.
  Done when: confirmatory artifacts exist under `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/confirmatory/`, and the v2 experiment record captures the confirmatory submission and completion state.
  Priority: medium
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md`; `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/confirmatory/`

- [ ] Analyze the confirmatory v2 Lorenz63 denoising benchmark [requires-frontier] [skill: analyze] [zero-resource] [blocked-by: v2 confirmatory completion]
  Why: The project needs a final interpretation of whether any broadened v2 family materially improves on the v1 anchor-basis baseline and approaches Savitzky-Golay.
  Done when: the v2 experiment record reports confirmatory-stage findings with provenance, including both state-space and derivative-aware comparisons.
  Priority: medium
  Evidence: `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md`
