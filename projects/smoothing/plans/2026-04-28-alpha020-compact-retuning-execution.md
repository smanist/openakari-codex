# Alpha-0.20 Compact-Retuning Execution Plan

Date: 2026-04-28
Task: `Run the alpha-0.20 compact-polynomial kernel retuning sweep [skill: execute]`

## Knowledge Goal

Produce the run artifacts needed to decide whether a denser compact-polynomial search at `alpha = 0.20` can beat the v1 Savitzky-Golay references, with both aggregate metrics and a mechanically selected representative trajectory plot.

## Scope Classification

`RESOURCE` (`consumes_resources: true`) — this task executes a real CPU sweep and writes experiment artifacts, but a timed benchmark of the full default command completed in `real 7.23s`, so it does not require detached submission under the repo's `>2 minute` rule.

## Execution Plan

1. Run the full default retuning command against `modules/smoothing/artifacts/compact-polynomial-kernel-retuning-v1/`.
2. Verify that the artifact directory contains `metrics_raw.csv`, `summary_by_setting.csv`, `best_compact_setting.csv`, `sg_reference_summary.csv`, `run_manifest.json`, `output.log`, the dataset subdirectory, and `plots/typical_denoised_trajectory.png`.
3. Record the exact execution command, runtime evidence, and artifact counts in `projects/smoothing/experiments/compact-polynomial-kernel-retuning-v1/EXPERIMENT.md`.
4. Mark the execution task complete in `projects/smoothing/TASKS.md` and add a same-day README log entry summarizing the claim, scope classification, discovery, execution, and verification.
5. Run `compound` in fast mode and commit the resulting project-state updates.

## Closeout Criteria

- The retuning artifact directory exists with the required tables and representative plot.
- The experiment record is updated from `planned` to `completed` with execution provenance.
- The task is marked complete and the README includes a dated session summary.
