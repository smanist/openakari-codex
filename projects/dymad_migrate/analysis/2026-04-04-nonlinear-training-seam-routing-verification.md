# Non-linear training seam routing verification

Date: 2026-04-04
Task: Route one non-linear training workflow through the new training seam
Scope: structural (verifiable), `consumes_resources: false`

## Findings

1. A non-linear workflow gate now has explicit seam verification: `tests/test_workflow_kp.py::test_non_linear_kp_workflow_routes_through_trainer_run` instruments `dymad.training.driver.TrainerRun` and confirms the `NODE` KPI path executes through `TrainerRun`.
2. `PhaseResult.to_run_state` and `PhaseResult.run_state` are now explicitly marked as temporary compatibility adapters, making the remaining legacy `RunState` boundary visible in code.
3. Verification limitation: the `kp_data` fixture writes a shared `modules/dymad_migrate/tests/kp.npz` file (session scope), so running `kp` tests in parallel can corrupt the archive; sequential execution is stable.

## Verification

- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py -q`
  - `5 passed, 2 warnings in 0.73s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_kp.py::test_non_linear_kp_workflow_routes_through_trainer_run -q`
  - `1 passed, 2 warnings in 1.22s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_kp.py::test_kp[1]' -q`
  - `1 passed, 2 warnings in 1.20s`
