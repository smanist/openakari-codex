# Linear training seam routing verification

Date: 2026-04-04
Task: Route the linear-training workflow through `TrainerRun` plus `PhasePipeline`

## Summary

The linear single-split workflow now reads its CV metric directly from typed `PhaseResult` state (`trainer_state.best_loss`) after executing `TrainerRun -> PhasePipeline`, rather than recomposing a legacy `RunState` for metric extraction.

## Findings

1. `run_cv_single(...)` in `modules/dymad_migrate/src/dymad/training/driver.py` now calls `PhaseResult.get_metric(...)` on the final phase result. This keeps metric reads on the typed training seam.
2. `PhaseResult` in `modules/dymad_migrate/src/dymad/training/phase_pipeline.py` now exposes `get_metric(...)`, while `to_run_state()` remains available as a compatibility adapter.
3. Focused linear workflow gates still pass for both `KBF` linear and `DKBF` linear cases in `tests/test_workflow_lti.py`.

## Verification

Command:
```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py -q
```
Output:
```text
5 passed, 2 warnings in 0.69s
```

Command:
```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[10]' 'tests/test_workflow_lti.py::test_lti[14]' -q
```
Output:
```text
2 passed, 2 warnings in 1.48s
```
