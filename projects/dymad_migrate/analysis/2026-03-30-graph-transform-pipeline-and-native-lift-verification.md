# Graph Transform Pipeline and Native Lift Verification

Date: 2026-03-30
Status: completed

## Purpose

Verify the remaining Phase 1 data/transform tasks:

- graph-compatible preprocessing routes through the typed transform pipeline
- the built-in non-NDR transform family includes native Torch lift support for the exercised lift families

## Findings

- `TrajectoryManagerGraph.apply_data_transformations(...)` now routes graph preprocessing through `_build_graph_transform_pipeline()` in `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`.
- The graph compatibility boundary must present node/control tensors to legacy transforms as a list of per-node `[T, F]` arrays. Passing a single `[T, N, F]` payload is not compatible with the legacy delay-embedding contract.
- `LiftTransform` now has focused native Torch equivalence coverage for built-in `poly` and `mixed` lift families in `modules/dymad_migrate/tests/test_torch_transform_modules.py`.
- Optional identity-transform metadata can legitimately store `None` state. `set_transforms(...)` must therefore guard `load_state_dict(...)` calls on optional transform states.

## Verification

- `git -C /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate diff --check`
  - no output
- `python -m compileall /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io/trajectory_manager.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_torch_transform_modules.py`
  - completed without error
- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trajmgr_graph.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q`
  - `12 passed, 1268 warnings in 0.86s`
- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trans_lift.py -q`
  - `6 passed, 2 warnings in 0.67s`

## Residual scope

- NDR transforms still need explicit Torch/autodiff adapters.
- Graph preprocessing is now routed through the typed pipeline, but it still uses legacy transform objects behind `LegacyTransformModuleAdapter` for compatibility.
