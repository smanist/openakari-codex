# Model-Spec Compatibility Prototype Checkpoint

Date: 2026-03-31
Task: Implement typed model-spec compatibility objects for predefined model entrypoints

## Scope

Introduce a first typed model-spec seam for predefined model construction while preserving the current legacy builder behavior.

## Code changes

- Added typed compatibility objects in `modules/dymad_migrate/src/dymad/models/model_spec.py`:
  - `ModelSpec`
  - `EncoderSpec`, `FeatureSpec`, `DynamicsSpec`, `DecoderSpec`
  - `LegacyPredefinedModelAdapter`
- Updated `modules/dymad_migrate/src/dymad/models/collections.py`:
  - `PredefinedModel` now materializes a typed `ModelSpec` in `__post_init__`
  - `PredefinedModel.__call__(...)` now routes through `build_model_from_spec(...)`
- Updated `modules/dymad_migrate/src/dymad/models/helpers.py`:
  - added `build_model_from_spec(...)` compatibility entrypoint
- Added focused coverage in `modules/dymad_migrate/tests/test_model_spec_adapter.py`.

## Findings

1. Predefined model entrypoints (including the LTI family) now create typed compatibility objects before crossing the legacy list-based builder seam.
2. The migration can advance model-spec semantics without changing workflow-facing predefined model names.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_spec_adapter.py 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output:

```text
3 passed, 2 warnings in 1.61s
```
