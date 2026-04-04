# Re-export surface thinning verification

Date: 2026-04-04
Task: Thin `dymad.core` and `dymad.models` re-export surfaces

## Summary

Validated that migration-internal imports no longer depend on broad package re-export barrels and that `dymad.core` / `dymad.models` now expose an explicit bounded compatibility surface guarded by regression tests.

## Findings

- Internal import cleanup:
  - `modules/dymad_migrate/src/dymad/io/checkpoint.py` now imports `build_model_context` from `dymad.core.model_context` (not `dymad.core` barrel).
  - `modules/dymad_migrate/src/dymad/sako/base.py` now imports `DKBF`/`KBF` from `dymad.models.collections` (not `dymad.models` barrel).
- Barrel-surface reduction:
  - `modules/dymad_migrate/src/dymad/core/__init__.py` now exports a bounded typed-series/model-context/runtime-transform compatibility set.
  - `modules/dymad_migrate/src/dymad/models/__init__.py` now exports predefined model families plus stable model-construction/spec types; internal maps/predictors/recipes are no longer package-barrel exports.
- Public import regression guard:
  - added `modules/dymad_migrate/tests/test_public_reexport_surfaces.py` to assert exact `__all__` sets and assert selected internal-only symbols are absent from package barrels.
- Post-change source scan result:
  - `rg -n "from\s+dymad\.(core|models)\s+import|import\s+dymad\.(core|models)" modules/dymad_migrate/src/dymad`
  - no matches (internal broad barrel imports eliminated).

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_public_reexport_surfaces.py tests/test_model_context_adapter.py tests/test_sako_runtime_batch_adapter.py tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter -q
```

Output excerpt:

- `tests/test_public_reexport_surfaces.py::test_core_reexport_surface_is_explicit_and_bounded PASSED`
- `tests/test_public_reexport_surfaces.py::test_models_reexport_surface_is_explicit_and_bounded PASSED`
- `tests/test_model_context_adapter.py::test_regular_model_context_preserves_runtime_fields PASSED`
- `tests/test_sako_runtime_batch_adapter.py::test_encode_runtime_batch_accepts_typed_regular_trainer_batch PASSED`
- `tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter PASSED`
- `13 passed, 2 warnings in 1.81s`

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_torch_transform_modules.py tests/test_graph_series_core.py 'tests/test_workflow_lti.py::test_lti[7]' -q
```

Output excerpt:

- `tests/test_torch_transform_modules.py::test_torch_compose_transform_matches_legacy_regular_payloads PASSED`
- `tests/test_graph_series_core.py::test_fixed_graph_series_slice_and_device_dtype_move PASSED`
- `tests/test_workflow_lti.py::test_lti[7] PASSED`
- `10 passed, 2 warnings in 1.61s`
