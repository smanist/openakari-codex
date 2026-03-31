# DynData Batch Contract Design

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/architecture/data-layer-design.md`
- `projects/dymad_migrate/architecture/model-runtime-boundary-design.md`
- `projects/dymad_migrate/architecture/dyndata-retirement-inventory.md`

## Purpose

Define the first trainer-facing batch contracts that replace `DynData` in dataloaders,
optimizers, and checkpoint-side data access.

This document answers:
1. what typed batch object should dataloaders emit first?
2. which trainer and loader call sites move first?
3. which compatibility adapters remain temporary while trainers are migrated?

## Design rule

The canonical data carriers are the existing typed batch objects:

- `RegularSeriesBatch`
- `GraphSeriesBatch`

Trainer code should not receive raw `DynData`. When trainer logic needs collated views
or runtime helpers, it should derive them from typed batches rather than reconstructing
legacy payloads.

## Proposed trainer-facing contracts

Use thin trainer batch wrappers over the typed series batches.

### `RegularTrainerBatch`

Owns:
- `series: RegularSeriesBatch`
- lazy `runtime: RegularModelContext`

Required operations:
- `to(device, dtype)`
- `truncate(num_steps)`
- `window(window, stride)`
- `initial_state()`
- `time_tensor()`
- `state_tensor()`
- `control_tensor()`
- `target_tensor()`
- `params_tensor()`

### `GraphTrainerBatch`

Owns:
- `series: GraphSeriesBatch`
- lazy `runtime: GraphModelContext`

Required operations:
- `to(device, dtype)`
- `truncate(num_steps)`
- `window(window, stride)` where supported
- `initial_state()`
- `time_tensor()`
- `node_state_tensor()`
- `control_tensor()`
- `edge_index_payload()`
- `edge_weight_payload()`
- `edge_attr_payload()`

## Compatibility rule

These wrappers exist to serve trainer/runtime consumers. They do not replace the typed
series classes themselves.

Temporary compatibility adapters may still expose:
- `to_legacy_runtime()` through `core/model_context.py`
- `SeriesAdapter.from_*_series(...)` for code paths that have not migrated yet

But dataloaders must emit typed trainer batches, not `DynData`.

## First exact call sites to replace

### Loader and dataset boundary

- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:613`
  regular dataloader currently uses `DynData.collate`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:1018`
  graph batching currently pre-collates with `DynData.collate`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:1021`
  graph dataloader still uses `DynData.collate`
- `modules/dymad_migrate/src/dymad/io/checkpoint.py:470`
  `DataInterface` still rebuilds loaders with `DynData.collate`

### Trainer consumers

- `modules/dymad_migrate/src/dymad/training/opt_linear.py:38`
- `modules/dymad_migrate/src/dymad/training/ls_update.py:22`
- `modules/dymad_migrate/src/dymad/training/opt_node.py:73`
- `modules/dymad_migrate/src/dymad/training/opt_weak_form.py:52`
- `modules/dymad_migrate/src/dymad/training/opt_base.py:461`

### Driver and run-state boundary

- `modules/dymad_migrate/src/dymad/training/driver.py:44`
- `modules/dymad_migrate/src/dymad/training/helper.py:44`

`RunState` does not need a structural rewrite yet, but its loader fields must carry
typed trainer batches once `TrajectoryManager` changes.

## First migration order

### Step 1 - regular and graph typed loader emission

`TrajectoryManager` should emit:
- `RegularTrainerBatch` on the regular path
- `GraphTrainerBatch` on the graph path

The internal dataset may still store per-sample typed series objects, but collation
must no longer route through `DynData.collate`.

### Step 2 - linear trainer family

Migrate `opt_linear.py` plus `ls_update.py` first.

Why first:
- the family is small and coherent
- `LSUpdater` already centralizes much of the linear-training batch access
- successful migration there gives a reusable pattern for NODE and weak-form trainers

### Step 3 - NODE and weak-form trainers

After the linear family works on typed trainer batches:
- migrate `opt_node.py`
- migrate `opt_weak_form.py`
- then remove remaining `DynData` assumptions from `opt_base.py`

## Required convenience surface

To keep the rest of the training stack narrow, the trainer batch wrappers should expose
the minimum tensor views current trainers need:

- regular:
  - `state_tensor()` maps to current `batch.x`
  - `control_tensor()` maps to current `batch.u`
  - `time_tensor()` maps to current `batch.t`
- graph:
  - `node_state_tensor()` maps to the current flattened or node-wise graph state,
    whichever the consuming trainer requires
  - graph edge payload accessors preserve fixed-topology and per-step edge lists

The wrappers should prefer explicit accessors over emulating the full `DynData` API.

## Temporary adapters that remain acceptable

The following remain temporary but acceptable after batch migration starts:

- `modules/dymad_migrate/src/dymad/core/model_context.py`
- `modules/dymad_migrate/src/dymad/io/series_adapter.py`
- `modules/dymad_migrate/src/dymad/models/runtime_view.py`

The following should not gain new `DynData` logic:

- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`
- `modules/dymad_migrate/src/dymad/training/*.py`
- `modules/dymad_migrate/src/dymad/io/checkpoint.py`

## Verification gates

Design gate:

```bash
rg -n "DynData\\.collate|batch: DynData|ws: DynData" modules/dymad_migrate/src/dymad/io modules/dymad_migrate/src/dymad/training modules/dymad_migrate/src/dymad/models
```

Execution follow-up gates:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py -q
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q
```
