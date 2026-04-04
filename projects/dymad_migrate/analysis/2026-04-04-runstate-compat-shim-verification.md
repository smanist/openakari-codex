# RunState compatibility-shim boundary verification

Date: 2026-04-04
Task: Reduce `RunState` to a compatibility shim and document the remaining adapter boundary

## Summary

Validated that migrated CV/training entrypoints now construct typed runtime context first (`PhaseContext`) and only materialize `RunState` at explicit compatibility boundaries. `RunState` is now documented in-code as a legacy shim rather than a primary runtime carrier.

## Findings

- `modules/dymad_migrate/src/dymad/training/driver.py` now has `_build_phase_context(...)` as the primary fold-data preparation path. `run_cv_single(...)` composes `TrainerState` + `PhaseContext` into `RunState` only at the trainer call boundary.
- `modules/dymad_migrate/src/dymad/training/driver.py::_build_data_state(...)` remains as a compatibility shim for callers/tests that still expect `RunState`; it delegates to typed context + `compose_run_state(...)`.
- `modules/dymad_migrate/src/dymad/training/helper.py` now explicitly marks `RunState` as a legacy compatibility container and documents checkpointable vs. live adapter fields.
- `modules/dymad_migrate/tests/test_training_phase_runtime.py::test_run_cv_single_uses_trainer_run` now verifies the typed-context-first route by patching `_build_phase_context(...)` and `compose_run_state(...)` rather than directly patching `_build_data_state(...)`.

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
- `7 passed, 2 warnings in 0.74s`

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `1 passed, 2 warnings in 1.73s`
