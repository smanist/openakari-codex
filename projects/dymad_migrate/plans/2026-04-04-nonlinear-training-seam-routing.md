# Plan: Route one non-linear workflow through the training seam

Date: 2026-04-04
Task: Route one non-linear training workflow through the new training seam

## Knowledge objective

Produce explicit, test-backed evidence that at least one non-linear workflow path runs via `TrainerRun -> PhasePipeline` (not direct legacy trainer wiring), and record the temporary compatibility boundary for remaining `RunState` adapters.

## Steps

1. Add a focused regression in `tests/test_workflow_kp.py` that patches `dymad.training.driver.TrainerRun` and asserts one non-linear KPI workflow (`NODE` path) invokes the seam.
2. Mark `PhaseResult` legacy `RunState` adapter accessors as temporary compatibility seams in docstrings.
3. Run targeted verification:
   - `tests/test_training_phase_runtime.py`
   - `tests/test_workflow_kp.py::test_non_linear_kp_workflow_routes_through_trainer_run`
   - `tests/test_workflow_kp.py::test_kp[1]`
4. If verification is green, update `TASKS.md` completion and append README log entry with exact commands and outputs.
