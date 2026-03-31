# Linear Trainer Typed-Batch Verification

Date: 2026-03-30
Status: passed
Scope:
- `modules/dymad_migrate/src/dymad/training/batch_adapter.py`
- `modules/dymad_migrate/src/dymad/training/ls_update.py`
- `modules/dymad_migrate/src/dymad/training/opt_linear.py`
- `modules/dymad_migrate/src/dymad/training/driver.py`
- `modules/dymad_migrate/tests/test_linear_typed_batch_driver.py`

## Goal

Verify that the first real trainer family can consume typed batches after the
`TrajectoryManager` typed-loader seam landed.

## Changes verified

1. Added `batch_to_legacy_runtime(...)` in
   `modules/dymad_migrate/src/dymad/training/batch_adapter.py`
2. Updated `ls_update.py` so linear-feature and linear-eval helpers accept typed
   trainer batches and normalize them at one narrow adapter seam
3. Updated `opt_linear.py` so the linear trainer accepts typed trainer batches
4. Updated `training/driver.py` so pure `Linear`-phase runs request typed loaders
   while keeping legacy trajectory datasets for prediction-criterion evaluation

## Verification commands

Compile gate:

```bash
python -m compileall modules/dymad_migrate/src/dymad/training/batch_adapter.py modules/dymad_migrate/src/dymad/training/ls_update.py modules/dymad_migrate/src/dymad/training/opt_linear.py modules/dymad_migrate/src/dymad/training/driver.py modules/dymad_migrate/tests/test_linear_typed_batch_driver.py
```

Result:
- completed without error

Typed-driver gate:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_linear_typed_batch_driver.py tests/test_typed_trainer_batches.py -q
```

Result:
- `4 passed, 2 warnings in 0.72s`

Workflow gate:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_ltg.py -q
```

Result:
- `31 passed, 2 warnings in 33.72s`

## Findings

- the first trainer family can now consume typed regular and graph batches without
  changing the model internals yet
- the safest driver cut is to enable typed loaders only for pure `Linear` phases;
  mixed or non-linear phase stacks should stay on the legacy loader path until their
  trainer consumers migrate
- keeping the dataset objects legacy while moving only the dataloader batches is the
  right intermediate step because prediction-criterion evaluation still expects legacy
  trajectory objects
