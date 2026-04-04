# 2026-04-04 — PhasePipeline extraction plan

## Task
Extract an explicit `PhasePipeline` object from `StackedOpt` while keeping config compatibility.

## Why this produces knowledge
This creates the first concrete training orchestration seam (pipeline vs wrapper) and tests whether staged training can run through a typed boundary without changing caller config shape.

## Implementation outline
1. Add `PhasePipeline` in `modules/dymad_migrate/src/dymad/training/phase_pipeline.py` and move phase-loop logic there.
2. Keep `StackedOpt` as a compatibility wrapper that constructs/delegates to `PhasePipeline`.
3. Preserve phase config compatibility (`config['phases']`) and current trainer registry behavior.
4. Extend focused tests to prove: (a) pipeline executes phase adapters, (b) wrapper preserves behavior for existing callers.
5. Run targeted pytest gates, then log findings with command/output provenance.

## Verification commands (planned)
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py -q`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[7]' -q`
