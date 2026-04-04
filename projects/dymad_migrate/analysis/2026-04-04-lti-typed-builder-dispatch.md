# LTI typed builder dispatch checkpoint

Date: 2026-04-04
Task: Route one predefined family through typed builder dispatch instead of `to_legacy_tuple()` fallback

## Summary

Added an explicit typed dispatch branch in `build_model_from_spec(...)` for the
LTI family so the migrated family no longer depends on the generic
`ModelSpec.to_legacy_tuple()` fallback path.

## Findings

- `modules/dymad_migrate/src/dymad/models/helpers.py` now detects an LTI typed
  spec (`rollout.family == "lti"`, direct dynamics, cat latent memory) and uses
  `_build_lti_legacy_tuple(...)` instead of `to_legacy_tuple()`.
- The new LTI typed dispatch validates predictor consistency:
  - continuous-time spec requires `rollout.predictor == "continuous"`
  - discrete-time spec requires `rollout.predictor == "discrete"`
- The generic tuple fallback remains unchanged for unmigrated families.
- A focused regression test proves LTI dispatch bypasses fallback by monkeypatching
  `ModelSpec.to_legacy_tuple()` to fail and asserting the LTI path still builds.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_spec_adapter.py 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_model_spec_adapter.py::test_predefined_model_routes_via_typed_model_spec PASSED`
- `tests/test_model_spec_adapter.py::test_build_model_from_spec_adapts_to_legacy_builder PASSED`
- `tests/test_model_spec_adapter.py::test_build_model_from_spec_uses_typed_dispatch_for_lti PASSED`
- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `4 passed, 2 warnings in 1.67s`
