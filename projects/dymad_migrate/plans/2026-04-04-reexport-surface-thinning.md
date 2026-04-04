# Plan: Thin `dymad.core` and `dymad.models` re-export surfaces

Date: 2026-04-04
Task: `Thin dymad.core and dymad.models re-export surfaces`

## Knowledge goal

Produce explicit evidence that package-level convenience imports in `dymad_migrate` are now intentionally bounded: internal code imports concrete modules, and `dymad.core`/`dymad.models` export only a documented compatibility surface.

## Immediate discoveries

- Internal broad re-export imports currently appear at two migration callsites:
  - `modules/dymad_migrate/src/dymad/io/checkpoint.py` (`from dymad.core import build_model_context`)
  - `modules/dymad_migrate/src/dymad/sako/base.py` (`from dymad.models import KBF, DKBF`)
- Current package barrels (`src/dymad/core/__init__.py`, `src/dymad/models/__init__.py`) export a wider surface than the currently exercised compatibility imports.

## Steps

1. Replace internal broad barrel imports with direct module imports at the identified callsites.
2. Reduce `dymad.core` and `dymad.models` `__all__` surfaces to an explicit compatibility set used by current workflow/tests.
3. Add focused regression tests that assert the intended package-level import surface and guard against re-export growth.
4. Run targeted pytest commands covering:
   - new re-export regression tests
   - checkpoint/model-context path
   - spectral path still loading model-family classes after import-path change
5. Record findings and command outputs in a dated analysis note; update task/log artifacts.

## Verification

- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_public_reexport_surfaces.py tests/test_model_context_adapter.py tests/test_sako_runtime_batch_adapter.py tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter -q`
