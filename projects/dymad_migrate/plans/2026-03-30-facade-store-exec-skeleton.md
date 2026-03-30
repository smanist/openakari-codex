# Facade/Store/Exec Skeleton Plan

Date: 2026-03-30
Status: completed
Project: dymad_migrate

## Why this plan exists

The migration architecture requires a `core -> facade -> store -> exec` layering pattern, but the current package still mirrors the legacy subsystem layout. This plan records the first non-invasive boundary skeleton so future sessions can extend it without touching numerical internals yet.

## Current-state discovery (captured this session)

- As of this session, `modules/dymad_migrate/src/dymad/` contained only legacy-style subpackages (`io`, `models`, `training`, `transform`, `numerics`, etc.) and no `facade`, `store`, or `exec` package.

## Implemented skeleton

### New package boundaries

- `modules/dymad_migrate/src/dymad/store/object_store.py`
  - in-memory object store with typed kinds for checkpoint registrations and prediction requests
- `modules/dymad_migrate/src/dymad/facade/`
  - typed handle validators (`chk_*`, `pred_*`)
  - boundary operations that validate input and create/store handle-backed records
- `modules/dymad_migrate/src/dymad/exec/`
  - composition root (`build_default_context()`)
  - compatibility executor that plans a checkpoint prediction request without running core math

### Typed handle flow (first end-to-end)

1. `exec.CompatibilityExecutor.plan_checkpoint_prediction(...)`
2. `facade.register_checkpoint(...)` -> `chk_<id>`
3. `facade.prepare_prediction_request(...)` -> `pred_<id>` derived from checkpoint handle
4. plan output records `entrypoint="dymad.io.checkpoint.load_model"` for checkpoint compatibility mapping

This flow validates layer boundaries and typed handles while keeping existing numerical behavior in `dymad.io` and `dymad.models`.

## Verification

```bash
cd modules/dymad_migrate && pytest tests/test_boundary_skeleton.py -q
```
