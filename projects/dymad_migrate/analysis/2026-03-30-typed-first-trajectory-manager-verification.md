# Typed-First Trajectory Manager Verification

Date: 2026-03-30
Status: complete
Project: dymad_migrate

## Scope

This note verifies the Phase 1 change that both regular and graph trajectory managers now
construct typed series objects first and only adapt back to `DynData` at the temporary
legacy boundary.

## Commands

```bash
git -C /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate diff --check
python -m compileall /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_graph_series_adapter.py
cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_series_adapter.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q
```

## Results

- `git diff --check` -> no output
- `python -m compileall ...` -> completed without error for the updated IO adapters and focused graph adapter test
- `PYTHONPATH=src pytest tests/test_regular_series_adapter.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q` ->
  - `9 passed, 2 warnings in 0.59s`

## Findings

1. The regular preprocessing path still uses typed `RegularSeries` first.
2. The graph preprocessing path now also uses typed `GraphSeries` first via `TrajectoryManagerGraph._transform_graph_series_by_index(...)`.
3. Both paths now adapt to `DynData` only through `DynDataAdapter`.
4. Graph round-trip coverage now exists for `TrajectoryManagerGraph`, `SeriesAdapter`, and `DynDataAdapter`.
