# Checkpoint/DataInterface Typed Boundary Verification

Date: 2026-03-30
Scope: verify that migrated checkpoint helpers and `DataInterface` stop directly constructing `DynData` on the active regular and graph paths, while keeping any remaining compatibility use explicit and narrow.

## Code changes under test

- `modules/dymad_migrate/src/dymad/io/checkpoint.py`

## Expected boundary after this step

- regular checkpoint prediction builds typed regular series payloads first, then crosses the temporary legacy runtime seam through typed model context
- graph checkpoint prediction builds typed graph series payloads first, then crosses the temporary legacy runtime seam through typed model context
- `DataInterface` uses typed `TrajectoryManager.process_all(typed=True)` loaders instead of rebuilding `DynData` batches locally
- the only remaining `DynData` use in `checkpoint.py` is the explicit `DynDataAdapter` compatibility hop for the learned encoder path

## Static verification

Command:

```bash
rg -n "DynData\\(|DynData\\.collate|from dymad\\.io\\.data import DynData|from dymad\\.io import DynData" modules/dymad_migrate/src/dymad/io/checkpoint.py
```

Result:

- no output

Interpretation:

- `checkpoint.py` no longer directly imports or constructs `DynData`

## Focused runtime verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_slice_integration.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py tests/test_assert_di.py -q
```

Result:

- `7 passed, 2 warnings in 0.69s`

Interpretation:

- regular checkpoint prediction, public load-model routing, and `DataInterface` behavior still pass after the typed-boundary rewrite

## Workflow gates

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_kp.py tests/test_workflow_ltg.py -q
```

Result:

- `27 passed, 2 warnings in 33.20s`

Interpretation:

- the selected Koopman and graph workflow gates still pass with checkpoint/data-interface paths moved onto the typed boundary

## Reliability note

An earlier overlapping run of `tests/test_workflow_kp.py` and `tests/test_workflow_ltg.py` was discarded because those workflow tests write to fixed output paths and concurrent execution can invalidate the result. The serial rerun above is the trusted verification record for this task.

## Findings

- the active checkpoint prediction paths no longer keep `DynData` alive through direct construction in `checkpoint.py`
- `DataInterface` now consumes typed trajectory-manager outputs and typed trainer-batch accessors on the migrated path
- the remaining compatibility seam in this file is explicit: `DynDataAdapter` is still used only to satisfy the learned encoder interface until model internals stop depending on legacy runtime payloads
