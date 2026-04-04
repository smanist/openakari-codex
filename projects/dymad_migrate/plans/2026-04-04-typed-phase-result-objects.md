# Plan: typed phase-result objects tied to trainer/runtime state

Date: 2026-04-04
Task: Replace ad-hoc phase records with typed phase result objects tied to `TrainerState` and `PhaseContext`

## Scope classification

- Category: structural (verifiable)
- consumes_resources: false
- Resource-signal checklist:
  - LLM API calls: no
  - External API calls: no
  - GPU compute: no
  - Long-running compute (>10m): no

## Why this task now

`PhasePipeline` exists, but `PhaseResult` still persists a recomposed legacy `RunState`, and downstream metric access (`driver.run_cv_single`) depends on that ad-hoc shape. This keeps `RunState` as the primary state carrier instead of an explicit compatibility boundary.

## Implementation steps

1. Redefine `PhaseResult` in `modules/dymad_migrate/src/dymad/training/phase_pipeline.py` as a typed result object carrying `TrainerState`, `PhaseContext`, and `hist`.
2. Add an explicit compatibility adapter on `PhaseResult` (`to_run_state()` and compatibility property) so legacy callers can still materialize `RunState` behind a named boundary.
3. Update pipeline result creation to store typed state/context outputs directly and update driver metric extraction to use the explicit adapter.
4. Expand focused runtime tests to assert typed `PhaseResult` fields plus compatibility behavior.
5. Run focused verification:
   - `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py -q`
   - `cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[7]' -q`
