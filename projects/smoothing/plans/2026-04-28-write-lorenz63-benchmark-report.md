# Plan: Write Lorenz63 denoising benchmark report

Date: 2026-04-28
Project: smoothing
Task: Write the Lorenz63 denoising benchmark report [requires-frontier] [skill: record] [zero-resource]

## Knowledge goal

Produce a durable report artifact that consolidates the adopted protocol, executed v1 sweep, quantitative method comparison, and hyperparameter recommendations so the project's mission-level conclusion is readable without reconstructing it from multiple session logs.

## Steps

1. Claim the selected task through the scheduler API and record scope classification in the project log.
2. Gather the benchmark inputs from `evaluation_protocol.md`, `EXPERIMENT.md`, and the committed sweep artifacts (`run_manifest.json`, `best_by_noise.csv`, `robust_settings.csv`, `summary_by_setting.csv`).
3. Write `projects/smoothing/benchmark_report.md` with:
   - benchmark design and sweep-grid summary
   - artifact provenance
   - per-noise metric means and cluster-adjusted variances
   - method comparison and robust-setting recommendation
4. Mark the selected task complete and update the project README log with discovery, execution, and verification evidence.
5. Run `/compound fast` behavior after committing the report changes, then record the result if it yields any additional reusable learning.
