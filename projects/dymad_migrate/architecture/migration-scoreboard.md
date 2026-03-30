# DyMAD Migration Scoreboard

Date: 2026-03-30
Status: active

## Purpose

Keep the design-to-code state explicit so future sessions can see which seams are only specified, which have prototype code, and which are actually verified.

## Status legend

- `design-only` — architecture note exists, but no code artifact yet
- `prototype` — first code seam exists, but it is not yet the default path or broadly verified
- `adopted` — code seam is now the default public/internal path for at least one workflow
- `verified` — adopted seam plus explicit verification artifact exists

## Scoreboard

| Seam | Design artifact | Code artifact | Verification artifact | Status | Notes |
|---|---|---|---|---|---|
| `data` | `projects/dymad_migrate/architecture/data-layer-design.md` | `modules/dymad_migrate/src/dymad/core/series.py`, `modules/dymad_migrate/src/dymad/io/series_adapter.py`, `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` | `modules/dymad_migrate/tests/test_regular_series_adapter.py`, `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md` | `verified` | Regular non-graph preprocessing now uses the typed series seam on the default path; graph/path-wide adoption not started |
| `transform` | `projects/dymad_migrate/architecture/transform-layer-design.md` | `modules/dymad_migrate/src/dymad/core/transform_pipeline.py`, `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`, `modules/dymad_migrate/src/dymad/io/checkpoint.py` | `modules/dymad_migrate/tests/test_regular_series_adapter.py`, `modules/dymad_migrate/tests/test_regular_slice_integration.py`, `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md` | `verified` | Minimal regular `transform_x` / `transform_u` pipeline is active on preprocessing and regular checkpoint prediction; still legacy-wrapped and regular-only |
| `model-spec` | `projects/dymad_migrate/architecture/model-spec-design.md` | none | none | `design-only` | Predefined-model string/recipe system remains active |
| `training` | `projects/dymad_migrate/architecture/training-layer-design.md` | none | none | `design-only` | `RunState` / `OptBase` split not started |
| `checkpoint-facade` | `projects/dymad_migrate/architecture/checkpoint-facade-design.md` | `modules/dymad_migrate/src/dymad/facade/`, `modules/dymad_migrate/src/dymad/store/`, `modules/dymad_migrate/src/dymad/exec/`, `modules/dymad_migrate/src/dymad/io/load_model_compat.py`, `modules/dymad_migrate/src/dymad/io/checkpoint.py` | `modules/dymad_migrate/tests/test_boundary_skeleton.py`, `modules/dymad_migrate/tests/test_load_model_compat.py`, `modules/dymad_migrate/tests/test_public_load_model_boundary.py`, `modules/dymad_migrate/tests/test_checkpoint_e2e_layering.py` | `verified` | Public `load_model(...)` is routed through the boundary; numerical hydration remains in legacy internals |
| `spectral-analysis` | `projects/dymad_migrate/architecture/spectral-analysis-design.md` | none | `projects/dymad_migrate/analysis/2026-03-30-sa-lti-rerun-warning-diagnosis.md` | `design-only` | Diagnostic evidence exists, but no adapter boundary code has landed |

## Interpretation

The project is no longer in pure design mode, but it is still highly asymmetric:

- checkpoint boundary work is the most mature seam
- data seam work has started but is not yet the default path across the package
- transform/model-spec/training/spectral seams remain design-led

That asymmetry is acceptable only if it stays visible. This scoreboard exists to keep that visible.
