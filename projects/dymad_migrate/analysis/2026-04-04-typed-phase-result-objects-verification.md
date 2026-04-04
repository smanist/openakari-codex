# Typed phase-result objects verification

Date: 2026-04-04
Task: Replace ad-hoc phase records with typed phase result objects tied to `TrainerState` and `PhaseContext`

## Summary

Validated that phase execution results now persist typed `TrainerState` and `PhaseContext` directly, and that legacy `RunState` materialization remains an explicit compatibility adapter (`PhaseResult.to_run_state()` / `compose_run_state(...)`).

## Findings

- `PhaseResult` in `modules/dymad_migrate/src/dymad/training/phase_pipeline.py` stores `trainer_state` and `phase_context` as first-class fields, with metric access via `PhaseResult.get_metric(...)` reading `trainer_state.best_loss`.
- `driver.run_cv_single(...)` now reads fold metrics from `results[-1].get_metric(...)` and does not require ad-hoc direct `RunState` access for metric extraction.
- Focused runtime tests confirm compatibility is explicit: legacy conversion remains available through `to_run_state()`/`run_state` adapter paths while typed fields remain primary.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py -q
```

Output excerpt:

- `tests/test_training_phase_runtime.py::test_phase_runtime_round_trip_preserves_state_and_context PASSED`
- `tests/test_training_phase_runtime.py::test_stacked_opt_uses_phase_runtime_adapters PASSED`
- `tests/test_training_phase_runtime.py::test_stacked_opt_wraps_phase_pipeline PASSED`
- `tests/test_training_phase_runtime.py::test_phase_result_get_metric_reads_typed_trainer_state PASSED`
- `tests/test_training_phase_runtime.py::test_run_cv_single_uses_trainer_run PASSED`
- `5 passed, 2 warnings in 0.67s`

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `1 passed, 2 warnings in 1.46s`
