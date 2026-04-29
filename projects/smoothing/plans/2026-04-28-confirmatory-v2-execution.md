Date: 2026-04-28
Status: completed

## Knowledge Goal

This task should produce the confirmatory v2 Lorenz63 denoising artifact bundle needed for final cross-family analysis on a larger seed set than the pilot, using only the pilot-selected finalist settings plus the frozen reference rows.

## Scope

In scope:

- claim the pre-selected confirmatory execution task if the scheduler control API is available
- materialize the confirmatory finalist settings from the pilot outputs into a durable JSON input
- benchmark the real confirmatory command to decide whether it stays under the repo's `2` minute inline threshold or must be submitted through `infra/experiment-runner/run.py --detach`
- run or submit the confirmatory stage into `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/confirmatory/`
- verify artifact and progress state against the experiment contract
- update the v2 experiment record, task list, and project log with exact command evidence

Out of scope:

- interpret confirmatory results beyond structural verification
- final benchmark analysis or recommendation updates
- adding non-pilot derivative winners that were explicitly not selected by the pilot handoff rule

## Scope Classification

`RESOURCE` (`consumes_resources: true`) — this task executes the real confirmatory CPU benchmark and writes durable experiment artifacts. The exact execution mode depends on an empirical runtime check of the full confirmatory command because the confirmatory grid has fewer settings than the pilot but more samples.

## Discoveries

- `POST /api/tasks/claim` is live for this session. Claiming `Run the confirmatory v2 Lorenz63 denoising benchmark [skill: execute]` returned HTTP `200` with claim ID `e2bd31d9dfda27af`.
- The pilot outputs already name `6` confirmatory finalists in `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/family_screen.csv`: `spline|lambda_rel=1`, `spline|lambda_rel=0.5`, `local_linear|type=tricube|span=11`, `local_linear|type=gaussian|span=11`, `normalized|type=tricube|span=11`, and `normalized|type=gaussian|span=11`.
- The confirmatory stage reuses the `4` Savitzky-Golay references and `4` frozen anchor-basis references, so the total confirmatory grid is `14` settings.
- With the default confirmatory seed regime (`8` trajectory seeds × `2` replicate IDs × `4` noise levels = `64` noisy samples), the expected raw output size is `14 × 64 = 896` rows and the grouped summary size is `14 × 4 = 56` rows.

## Execution Plan

1. Write a durable confirmatory settings JSON under `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/` from the pilot-selected finalists.
2. Benchmark the full command:
   `python modules/smoothing/run_denoising_sweep_v2.py --out-dir <temp-dir> --stage confirmatory --confirmatory-settings-json projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/confirmatory_settings.json --overwrite`
3. If runtime is under `2` minutes, execute the same command inline into `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/confirmatory/`; otherwise submit it through `infra/experiment-runner/run.py --detach` with explicit `--artifacts-dir`, `--project-dir`, `--max-retries`, `--watch-csv`, and `--total`.
4. Verify either:
   - inline completion: artifact counts and manifest contents match the confirmatory contract, or
   - detached submission: `progress.json` and scheduler registration reflect a live run with the correct artifact target.
5. Update `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md`, `projects/smoothing/TASKS.md`, and `projects/smoothing/README.md`, then run a fast compound pass and commit.

## Done When

- the confirmatory execution mode is chosen from measured runtime evidence rather than assumption
- the confirmatory benchmark is either completed inline or validly submitted through the experiment runner
- the experiment record captures the exact claim, command, and artifact/progress state with provenance

## Result

- The scheduler control API claim succeeded with claim ID `e2bd31d9dfda27af`.
- The durable confirmatory finalist input now lives at `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/confirmatory_settings.json`.
- A timed full-command benchmark completed in `real 14.03s`, so the confirmatory stage stayed below the repo's `2` minute detached-run threshold and could be executed inline.
- The durable confirmatory run completed in `real 14.13s` under `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/confirmatory/`.
- Verification matched the designed confirmatory bundle: `metrics_raw.csv` has `896` rows, `summary_by_setting.csv` has `56` rows, `best_by_noise.csv` has `20` rows, `robust_settings.csv` has `16` rows, `family_comparison.csv` has `20` rows, and `run_manifest.json` records `n_settings = 14`, `n_samples = 64`, `n_rows_expected = 896`, and `n_rows_written = 896`.
