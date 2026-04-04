# ExecutionServices seam verification

Date: 2026-04-04
Task: Introduce `ExecutionServices` and remove logger/path setup from trainer-state shims

## Summary

Validated that training execution policy (device selection, artifact path ownership, and logger setup) now routes through an explicit `ExecutionServices` seam instead of being scattered across driver/pipeline/optimizer setup code.

## Findings

- Added `modules/dymad_migrate/src/dymad/training/execution_services.py` as the central non-checkpointable runtime-policy seam:
  - derives runtime policy from config/run-state contexts
  - owns checkpoint/results prefixes and directory creation
  - owns logger configuration hooks used by training orchestration paths
- Updated training orchestration layers to consume the seam:
  - `driver.py` now derives per-driver and per-fold execution policy through `ExecutionServices`
  - `trainer_run.py` and `phase_pipeline.py` now carry/preserve explicit execution services per run
  - `opt_base.py` now sources device/checkpoint/results policy from `ExecutionServices` instead of ad-hoc path/device setup
- Updated runtime shims to make service policy explicit:
  - `phase_runtime.py::TrainerState` now carries `execution_services`
  - `run_state_to_trainer_state(...)` reconstructs service policy from compatibility `RunState`
  - `compose_run_state(...)` materializes compatibility state using explicit service policy
- Added focused compatibility coverage in `tests/test_training_phase_runtime.py` for execution-service propagation through adapters and trainer-run construction.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py tests/test_linear_typed_batch_driver.py -q
```

Output excerpt:

- `tests/test_training_phase_runtime.py::test_phase_runtime_round_trip_preserves_state_and_context PASSED`
- `tests/test_training_phase_runtime.py::test_stacked_opt_uses_phase_runtime_adapters PASSED`
- `tests/test_training_phase_runtime.py::test_stacked_opt_wraps_phase_pipeline PASSED`
- `tests/test_training_phase_runtime.py::test_phase_result_get_metric_reads_typed_trainer_state PASSED`
- `tests/test_training_phase_runtime.py::test_run_cv_single_uses_trainer_run PASSED`
- `tests/test_linear_typed_batch_driver.py::test_build_data_state_uses_regular_typed_batches_for_linear_only PASSED`
- `tests/test_linear_typed_batch_driver.py::test_build_data_state_uses_graph_typed_batches_for_linear_only PASSED`
- `7 passed, 2 warnings in 0.85s`

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `1 passed, 2 warnings in 1.50s`
