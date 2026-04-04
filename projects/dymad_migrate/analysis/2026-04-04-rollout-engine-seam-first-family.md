# Rollout-engine seam for first typed model-spec family

Date: 2026-04-04
Task: Introduce an explicit rollout-engine seam for the first typed model-spec family

## Summary

Added a typed rollout-engine selector and wired the LTI-family typed
`ModelSpec` path to choose predictor functions from rollout metadata, rather
than relying only on legacy predictor-type string resolution.

## Findings

- `build_model_from_spec(...)` now applies a typed rollout-engine selection step
  for typed specs, while preserving fallback behavior for unmigrated families.
- The first migrated family now has an explicit typed rollout-engine seam:
  - `LTI` typed metadata selects `predict_continuous`
  - `DLTI` typed metadata selects `predict_discrete`
- The existing workflow gate remains green with the new seam in place.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_spec_adapter.py 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_model_spec_adapter.py::test_build_model_from_spec_selects_rollout_engine_from_typed_metadata[typed_model0-predict_continuous] PASSED`
- `tests/test_model_spec_adapter.py::test_build_model_from_spec_selects_rollout_engine_from_typed_metadata[typed_model1-predict_discrete] PASSED`
- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `6 passed, 2 warnings in 1.63s`
