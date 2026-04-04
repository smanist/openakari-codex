# PhasePipeline extraction prototype verification

Date: 2026-04-04
Task: Extract an explicit `PhasePipeline` object from `StackedOpt` while keeping config compatibility

## Summary

Introduced a first-class `PhasePipeline` abstraction under `dymad.training` and converted `StackedOpt` into a compatibility wrapper that delegates execution to the pipeline while preserving the existing `config['phases']` shape.

## Findings

- Phase sequencing now lives in `modules/dymad_migrate/src/dymad/training/phase_pipeline.py` as a dedicated `PhasePipeline` object.
- `StackedOpt` is now a compatibility wrapper around `PhasePipeline`, keeping existing callers on the same configuration contract.
- Focused runtime tests and an existing workflow gate remained green after the seam extraction.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_training_phase_runtime.py -q
```

Output excerpt:

- `tests/test_training_phase_runtime.py::test_phase_runtime_round_trip_preserves_state_and_context PASSED`
- `tests/test_training_phase_runtime.py::test_stacked_opt_uses_phase_runtime_adapters PASSED`
- `tests/test_training_phase_runtime.py::test_stacked_opt_wraps_phase_pipeline PASSED`
- `3 passed, 2 warnings in 0.68s`

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `1 passed, 2 warnings in 1.64s`
