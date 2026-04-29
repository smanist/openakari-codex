Date: 2026-04-28
Status: completed

## Knowledge Goal

This task should produce the first full v2 pilot artifact bundle so a later analysis session can test whether broader classical smoother families close the Lorenz63 denoising gap left by the frozen v1 anchor-basis baseline.

## Scope

In scope:

- run the default pilot-stage v2 Lorenz63 denoising sweep into `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/`
- verify artifact counts and manifest contents against the experiment contract
- update the v2 experiment record, task list, and project log with exact command and runtime evidence

Out of scope:

- confirmatory-stage execution
- analysis or finalist interpretation beyond recording the produced pilot artifacts
- detached experiment-runner submission unless runtime evidence exceeds the 2-minute session threshold

## Scope Classification

`RESOURCE` (`consumes_resources: true`) — this task executes a real CPU sweep and writes durable experiment artifacts. A timed benchmark of the full default pilot command completed in `real 28.96s`, so the run can be executed inline rather than through `infra/experiment-runner/run.py --detach`.

## Discoveries

- Claim attempt fallback: `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim ...` failed with curl exit code `7` and HTTP `000`, so the scheduler control API was unreachable in this session.
- The committed artifact target `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/` does not exist in this worktree yet, so the selected pilot execution task has not been completed here.
- The default pilot-stage setting grid contains `29` settings (`4` Savitzky-Golay references, `4` frozen anchor-basis references, `8` normalized-kernel settings, `8` local-linear settings, `5` spline settings).
- The default pilot dataset uses `5` trajectory seeds × `2` replicate IDs × `4` noise levels = `40` noisy samples, so the expected raw row count is `29 × 40 = 1160`.

## Execution Plan

1. Run `python modules/smoothing/run_denoising_sweep_v2.py --out-dir modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot --stage pilot --overwrite`.
2. Verify the artifact bundle by checking:
   - `metrics_raw.csv` row count = `1160`
   - `summary_by_setting.csv` row count = `29 × 4 = 116`
   - `family_screen.csv` exists and matches the pilot-stage family-screen contract
   - `run_manifest.json` records `n_settings = 29`, `n_rows_expected = 1160`, and `n_rows_written = 1160`
3. Update `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md`, `projects/smoothing/TASKS.md`, and `projects/smoothing/README.md` with the exact command, timing evidence, and completion state.
4. Run a fast compound check, then commit the session changes.

## Done When

- `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/` contains the default pilot artifacts
- the v2 experiment record is updated from `planned` to a completed pilot-execution state with provenance
- the selected task is marked complete and the follow-on pilot analysis task remains open

## Result

- Ran the default pilot command inline in `real 28.87s`, so no detached experiment-runner submission or scheduler registration was necessary for this stage.
- The pilot artifact bundle now exists under `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/` with `metrics_raw.csv`, `summary_by_setting.csv`, `family_screen.csv`, `run_manifest.json`, `output.log`, the dataset snapshot, and the three standard plot PNGs.
- Verification matched the planned counts: `metrics_raw.csv` has `1160` rows, `summary_by_setting.csv` has `116` rows, `family_screen.csv` has `21` rows, and `run_manifest.json` records `n_settings = 29`, `n_rows_expected = 1160`, `n_rows_written = 1160`, and `n_family_screen_rows = 21`.
