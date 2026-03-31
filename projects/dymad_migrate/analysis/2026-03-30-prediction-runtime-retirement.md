# Prediction Runtime DynData Retirement Checkpoint

Date: 2026-03-30
Task: Replace `models/prediction.py` direct `DynData` construction with typed runtime payloads

## Scope

Moved prediction runtime preparation off direct `DynData()` / `DynData.collate(...)` usage in `modules/dymad_migrate/src/dymad/models/prediction.py` by introducing an explicit compatibility seam in `modules/dymad_migrate/src/dymad/core/model_context.py`.

## Code changes

- Added `ModelRuntimePayload` and `materialize_prediction_runtime(...)` in `core/model_context.py`.
- Updated `models/prediction.py` to accept `ModelRuntimePayload | None` and call `materialize_prediction_runtime(...)` in `_prepare_data(...)`.
- Added focused adapter coverage in `tests/test_model_context_adapter.py`:
  - `test_materialize_prediction_runtime_expands_regular_context_batches`
  - `test_materialize_prediction_runtime_expands_single_legacy_payload`

## Findings

1. `models/prediction.py` no longer contains direct legacy-runtime construction or collate calls.
2. The prediction compatibility seam now supports both typed contexts and legacy payloads while preserving batch-size validation semantics.
3. Post-change source scan reports `87` `DynData` textual references across `modules/dymad_migrate/src/dymad` (from `rg -n "\\bDynData\\b" ... | wc -l`).

## Verification

### 1) No direct `DynData` construction/collate in `models/prediction.py`

Command:

```bash
rg -n "DynData\\.collate|DynData\\(|from dymad\\.io import DynData|ws: DynData" modules/dymad_migrate/src/dymad/models/prediction.py
```

Output:

```text
(no output)
```

### 2) Runtime adapter wiring present in prediction and core model-context files

Command:

```bash
rg -n "materialize_prediction_runtime|ModelRuntimePayload" modules/dymad_migrate/src/dymad/core/model_context.py modules/dymad_migrate/src/dymad/models/prediction.py
```

Output:

```text
modules/dymad_migrate/src/dymad/core/model_context.py:109:ModelRuntimePayload: TypeAlias = "DynData | RegularModelContext | GraphModelContext"
modules/dymad_migrate/src/dymad/core/model_context.py:166:def materialize_prediction_runtime(
modules/dymad_migrate/src/dymad/core/model_context.py:167:    payload: ModelRuntimePayload | None,
modules/dymad_migrate/src/dymad/models/prediction.py:9:from dymad.core.model_context import ModelRuntimePayload, materialize_prediction_runtime
modules/dymad_migrate/src/dymad/models/prediction.py:15:def _prepare_data(x0, ts, ws: ModelRuntimePayload | None, device):
modules/dymad_migrate/src/dymad/models/prediction.py:46:    _ws = materialize_prediction_runtime(ws, batch_size=_Nb, is_batch=is_batch).to(device)
modules/dymad_migrate/src/dymad/models/prediction.py:87:    ws: ModelRuntimePayload | None = None,
modules/dymad_migrate/src/dymad/models/prediction.py:151:    ws: ModelRuntimePayload | None = None,
modules/dymad_migrate/src/dymad/models/prediction.py:197:    ws: ModelRuntimePayload | None = None,
modules/dymad_migrate/src/dymad/models/prediction.py:246:    ws: ModelRuntimePayload | None = None,
modules/dymad_migrate/src/dymad/models/prediction.py:284:    ws: ModelRuntimePayload | None = None,
modules/dymad_migrate/src/dymad/models/prediction.py:332:    ws: ModelRuntimePayload | None = None,
```

### 3) Regression and workflow gate run

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_context_adapter.py tests/test_regular_slice_integration.py tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q
```

Output:

```text
64 passed, 2 warnings in 54.06s
```

Raw output log:
- `projects/dymad_migrate/analysis/2026-03-30-prediction-runtime-retirement-pytest.log`

### 4) Current remaining DynData textual-reference count

Command:

```bash
rg -n "\\bDynData\\b" modules/dymad_migrate/src/dymad -g '*.py' | wc -l
```

Output:

```text
87
```
