# Plan: Introduce `ExecutionServices` seam in training

Date: 2026-04-04
Task: `Introduce ExecutionServices and remove logger/path setup from trainer-state shims`

## Knowledge goal

Produce explicit evidence that training runtime policy (device, artifact paths, logging) can be centralized behind one typed seam without regressing migrated workflow behavior.

## Steps

1. Add a `training/execution_services.py` seam that owns device selection, artifact prefixes, and logger configuration.
2. Route `DriverBase`, `TrainerRun`, `PhasePipeline`, and `OptBase` through this seam instead of duplicating path/logger/device setup logic.
3. Update `TrainerState` adapters so execution services are explicit at compatibility boundaries rather than implicit in ad-hoc state fields.
4. Add/adjust focused tests for execution-services propagation and trainer/pipeline compatibility.
5. Record verification commands and findings in a dated analysis note and update migration status artifacts.

## Verification

- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py tests/test_linear_typed_batch_driver.py -q`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py::test_lti[7] -q`
