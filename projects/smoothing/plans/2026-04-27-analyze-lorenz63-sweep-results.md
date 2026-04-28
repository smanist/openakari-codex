# Plan: Analyze Lorenz63 denoising sweep results

Date: 2026-04-27
Project: smoothing
Task: Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]

## Goal

Turn the completed v1 Lorenz63 denoising sweep artifacts into provenance-backed findings and hyperparameter recommendations in the experiment record.

## Steps

1. Verify task claim state and scope classification in the project log.
2. Inspect `summary_by_setting.csv`, `best_by_noise.csv`, `robust_settings.csv`, and `metrics_raw.csv` to identify:
   - best method/setting by noise level
   - robust cross-noise settings
   - method-level trends in RMSE, relative RMSE, and denoising gain
   - uncertainty patterns from the cluster-adjusted variance columns
3. Update `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md` Findings with quantitative claims that cite the exact artifact files or inline arithmetic.
4. Mark the task complete if the experiment record now satisfies the task done-when condition.
5. Run verification commands that mechanically support the documented findings.
6. Run `/compound fast` behavior: check for reusable learnings or follow-up tasks, then record the result in the project log.
