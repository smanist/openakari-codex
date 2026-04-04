# Plan: Reduce `RunState` to compatibility shim

Date: 2026-04-04
Task: `Reduce RunState to a compatibility shim and document the remaining adapter boundary`

## Goal

Make migrated training paths carry typed state/context first, and keep `RunState` only as an explicit compatibility adapter surface.

## Steps

1. Update `training/driver.py` so fold data preparation builds typed `PhaseContext`, then materializes `RunState` only at the trainer boundary via `compose_run_state(...)`.
2. Tighten `training/helper.py` documentation/comments so `RunState` is explicitly marked as compatibility-only (checkpoint restoration + legacy trainer boundary).
3. Update focused tests that patch data-state builders so they follow the new typed-context-first path.
4. Add a dated analysis note with command-level verification evidence and boundary findings.

## Verification

- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py tests/test_linear_typed_batch_driver.py -q`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[7]' -q`
