# Typed Trainer Batch Emission Verification

Date: 2026-03-30
Status: passed
Scope:
- `modules/dymad_migrate/src/dymad/core/trainer_batch.py`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`
- `modules/dymad_migrate/tests/test_typed_trainer_batches.py`

## Goal

Verify that the first retirement execution step is real:

- one regular `TrajectoryManager` path emits typed trainer batches
- one graph `TrajectoryManagerGraph` path emits typed trainer batches
- the existing typed series adapter seams still behave as before

## Changes verified

1. Added `RegularTrainerBatch` and `GraphTrainerBatch` in
   `modules/dymad_migrate/src/dymad/core/trainer_batch.py`
2. Updated `TrajectoryManager.process_data(...)`, `process_all(...)`, and
   `create_dataloaders(...)` to support `typed=True`
3. Updated `TrajectoryManagerGraph.create_dataloaders(...)` to emit typed graph
   trainer batches on the new path without `DynData.collate`
4. Stored typed datasets alongside the legacy dataset in `trajectory_manager.py`
   so the new path can be exercised without breaking the current default path

## Verification commands

Compile gate:

```bash
python -m compileall modules/dymad_migrate/src/dymad/core/trainer_batch.py modules/dymad_migrate/src/dymad/io/trajectory_manager.py modules/dymad_migrate/tests/test_typed_trainer_batches.py
```

Result:
- completed without error

Focused typed-batch gate:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_typed_trainer_batches.py tests/test_regular_series_adapter.py tests/test_graph_series_adapter.py -q
```

Result:
- `6 passed, 2 warnings in 0.75s`

## Findings

- the new typed path can be added behind `typed=True` without regressing the current
  default `DynData` path
- graph typed batching no longer needs the old pre-collate `batch_size=1` workaround on
  the new path
- `TrajectoryManager` is no longer forced to center `DynData` when building loaders;
  the remaining blocker is trainer consumption, not batch emission
