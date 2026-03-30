# Data/Transform Boundary Verification

Date: 2026-03-30
Status: complete

## Purpose

Record the verification gates for the remaining Phase 1 data/transform boundary work:

- explicit NDR adapters on the typed transform protocol
- centralized transform construction/export at the builder boundary
- checkpoint/load paths no longer rebuilding transforms through hidden direct calls
- graph preprocessing preserving the legacy per-step edge transform contract only behind narrow typed adapters

## Commands and outcomes

1. Compile and diff hygiene

- `git diff --check -- projects/dymad_migrate modules/dymad_migrate`
  - Result: no output
- `python -m compileall /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/core /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io/checkpoint.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io/trajectory_manager.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_transform_builder.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_regular_slice_integration.py`
  - Result: completed without error

2. NDR adapter boundary

- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_transform_builder.py -q`
  - Result: `3 passed, 2 warnings in 0.51s`

3. Graph transform parity after explicit edge-field adapters

- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_assert_trajmgr_graph.py::test_trajmgr_graph[0]' -q -o log_cli=false --maxfail=1`
  - Result: `1 passed, 962 warnings in 0.79s`

4. Focused boundary suite

- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_transform_builder.py tests/test_regular_slice_integration.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py tests/test_assert_trajmgr_graph.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q`
  - Result: `19 passed, 1268 warnings in 1.23s`

## Findings

- NDR now has an explicit Phase 1 migration boundary: builder-created typed modules wrap legacy `Isomap`, `DiffMap`, and `DiffMapVB` with `supports_gradients="false"` and `invertibility="approximate"`.
- Checkpoint/load construction now flows through `modules/dymad_migrate/src/dymad/core/transform_builder.py` rather than reconstructing the legacy stack directly in `checkpoint.py`.
- Graph edge transforms need a narrower compatibility boundary than node/control transforms. Treating `edge_weight` as a plain `[T, E]` tensor field changes scaler semantics; the verified boundary is a typed adapter that preserves the legacy per-step list-of-`[E, 1]` contract.

## Residual risks

- The warning volume is still high in graph tests because legacy NumPy-based edge adapters remain active under the typed boundary.
- NDR remains intentionally non-differentiable in Phase 1. That is an explicit design choice, not a missing implementation.
