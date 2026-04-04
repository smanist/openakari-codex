# Model-spec rollout/memory metadata checkpoint

Date: 2026-04-03
Task: Extend `ModelSpec` with typed rollout and memory metadata for one predefined family

## Summary

Added typed rollout and memory metadata to `ModelSpec` and wired it through
`PredefinedModel` for the LTI family (`LTI`, `DLTI`, `GLTI`, `DGLTI`).

## Findings

- `ModelSpec` now carries optional typed sub-specs:
  - `RolloutSpec(family, predictor, supports_control_inputs)`
  - `MemorySpec(family, latent_state, requires_delay_window)`
- LTI-family predefined entries now populate these fields directly, while other
  predefined families remain unchanged.
- Focused adapter tests now assert rollout and memory fields on the typed spec
  passed through the predefined-model build path.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_spec_adapter.py 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_model_spec_adapter.py::test_predefined_model_routes_via_typed_model_spec PASSED`
- `tests/test_model_spec_adapter.py::test_build_model_from_spec_adapts_to_legacy_builder PASSED`
- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `3 passed, 2 warnings in 2.02s`
