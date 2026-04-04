# Model-spec first-family verification checkpoint

Date: 2026-04-04
Task: Verify the first typed model-spec family against an existing workflow gate and update the scoreboard

## Summary

Verified that the first migrated typed model-spec family (LTI) remains on the
typed builder-dispatch path and passes an existing workflow gate.

## Findings

- The typed model-spec path for the LTI family now has an explicit verification
  artifact that pairs adapter-level checks with an existing workflow gate.
- The current verification command still covers both:
  - typed-dispatch behavior (`tests/test_model_spec_adapter.py`)
  - workflow-level behavior (`tests/test_workflow_lti.py::test_lti[7]`)
- This supports advancing `model-spec` from `prototype` to `verified` for the
  first migrated family path while unmigrated families still use fallback
  compatibility behavior.

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
- `4 passed, 2 warnings in 1.63s`
