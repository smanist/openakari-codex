# DyMAD Migration Scoreboard

Date: 2026-04-04
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
| `data` | `projects/dymad_migrate/architecture/data-layer-design.md` | `modules/dymad_migrate/src/dymad/core/series.py`, `modules/dymad_migrate/src/dymad/core/graph_series.py`, `modules/dymad_migrate/src/dymad/io/series_adapter.py`, `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` | `modules/dymad_migrate/tests/test_regular_series_adapter.py`, `modules/dymad_migrate/tests/test_graph_series_adapter.py`, `modules/dymad_migrate/tests/test_graph_series_core.py`, `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md`, `projects/dymad_migrate/analysis/2026-03-30-graph-transform-pipeline-and-native-lift-verification.md` | `verified` | Regular and graph preprocessing now construct typed series first; legacy `DynData` remains a downstream compatibility boundary |
| `transform` | `projects/dymad_migrate/architecture/transform-layer-design.md` | `modules/dymad_migrate/src/dymad/core/transform_builder.py`, `modules/dymad_migrate/src/dymad/core/transform_pipeline.py`, `modules/dymad_migrate/src/dymad/core/transform_module.py`, `modules/dymad_migrate/src/dymad/core/torch_transforms.py`, `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`, `modules/dymad_migrate/src/dymad/io/checkpoint.py` | `modules/dymad_migrate/tests/test_torch_transform_modules.py`, `modules/dymad_migrate/tests/test_transform_builder.py`, `modules/dymad_migrate/tests/test_assert_trans_lift.py`, `modules/dymad_migrate/tests/test_assert_trajmgr_graph.py`, `modules/dymad_migrate/tests/test_regular_slice_integration.py`, `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md`, `projects/dymad_migrate/analysis/2026-03-30-graph-transform-pipeline-and-native-lift-verification.md`, `projects/dymad_migrate/analysis/2026-03-30-data-transform-boundary-verification.md` | `verified` | Typed transform construction is now centralized in `transform_builder`; NDR stages are explicit non-differentiable adapters, and graph edge fields use narrow legacy wrappers only where the legacy per-step edge contract still matters |
| `model-runtime` | `projects/dymad_migrate/architecture/model-runtime-boundary-design.md` | `modules/dymad_migrate/src/dymad/core/model_context.py`, `modules/dymad_migrate/src/dymad/models/runtime_view.py`, `modules/dymad_migrate/src/dymad/models/components.py`, `modules/dymad_migrate/src/dymad/models/model_base.py`, `modules/dymad_migrate/src/dymad/io/checkpoint.py` | `modules/dymad_migrate/tests/test_model_context_adapter.py`, `modules/dymad_migrate/tests/test_component_runtime_view.py`, `modules/dymad_migrate/tests/test_regular_slice_integration.py`, `projects/dymad_migrate/analysis/2026-03-30-model-runtime-parity-gates.md` | `verified` | Public regular and graph checkpoint prediction paths now cross typed model contexts first, and helper/component families use a narrow runtime-view adapter instead of direct `DynData` field access |
| `model-spec` | `projects/dymad_migrate/architecture/model-spec-design.md` | `modules/dymad_migrate/src/dymad/models/model_spec.py`, `modules/dymad_migrate/src/dymad/models/collections.py`, `modules/dymad_migrate/src/dymad/models/helpers.py`, `modules/dymad_migrate/src/dymad/models/rollout_engine.py` | `modules/dymad_migrate/tests/test_model_spec_adapter.py`, `projects/dymad_migrate/analysis/2026-04-04-model-spec-first-family-verification.md`, `projects/dymad_migrate/analysis/2026-04-04-rollout-engine-seam-first-family.md` | `verified` | LTI-family predefined paths now use typed-dispatch metadata plus a typed rollout-engine selector for continuous/discrete predictor dispatch, with workflow gate verification |
| `training` | `projects/dymad_migrate/architecture/training-layer-design.md` | `modules/dymad_migrate/src/dymad/training/phase_pipeline.py`, `modules/dymad_migrate/src/dymad/training/stacked_opt.py`, `modules/dymad_migrate/src/dymad/training/phase_runtime.py`, `modules/dymad_migrate/src/dymad/training/trainer_run.py` | `modules/dymad_migrate/tests/test_training_phase_runtime.py`, `modules/dymad_migrate/tests/test_workflow_lti.py::test_lti[7]`, `projects/dymad_migrate/analysis/2026-04-04-phase-pipeline-prototype-verification.md`, `projects/dymad_migrate/analysis/2026-04-04-trainer-run-wrapper-single-split-verification.md` | `prototype` | `StackedOpt` delegates to `PhasePipeline`, and `run_cv_single` now constructs a first `TrainerRun` wrapper that owns run identity/artifact paths for one single-split path |
| `checkpoint-facade` | `projects/dymad_migrate/architecture/checkpoint-facade-design.md` | `modules/dymad_migrate/src/dymad/facade/`, `modules/dymad_migrate/src/dymad/store/`, `modules/dymad_migrate/src/dymad/exec/`, `modules/dymad_migrate/src/dymad/io/load_model_compat.py`, `modules/dymad_migrate/src/dymad/io/checkpoint.py`, `modules/dymad_migrate/src/dymad/core/transform_builder.py` | `modules/dymad_migrate/tests/test_boundary_skeleton.py`, `modules/dymad_migrate/tests/test_load_model_compat.py`, `modules/dymad_migrate/tests/test_public_load_model_boundary.py`, `modules/dymad_migrate/tests/test_checkpoint_e2e_layering.py`, `projects/dymad_migrate/analysis/2026-03-30-data-transform-boundary-verification.md` | `verified` | Public `load_model(...)` is routed through the boundary, and checkpoint hydration now constructs transforms through the central typed builder instead of directly rebuilding the legacy stack |
| `spectral-analysis` | `projects/dymad_migrate/architecture/spectral-analysis-design.md` | none | `projects/dymad_migrate/analysis/2026-03-30-sa-lti-rerun-warning-diagnosis.md` | `design-only` | Diagnostic evidence exists, but no adapter boundary code has landed |

## Interpretation

The project is no longer in pure design mode, but it is still highly asymmetric:

- checkpoint boundary work is the most mature seam
- data seam work has started but is not yet the default path across the package
- model-spec is now verified for the first LTI-family typed-dispatch path, while rollout-engine extraction and broader family migration remain open
- training now has a first `PhasePipeline` prototype, but `RunState`-centric compatibility adapters still carry the main execution path

That asymmetry is acceptable only if it stays visible. This scoreboard exists to keep that visible.
