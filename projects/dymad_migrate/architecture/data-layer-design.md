# DyMAD Data Layer Design

Date: 2026-03-30
Status: revised for module-first migration
Depends on:
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `projects/dymad_migrate/architecture/current-state.md`
- `projects/dymad_migrate/architecture/migration-matrix.md`
- `modules/dymad_migrate/tasks/refactor_target_architecture.md`

## Purpose

Define the first `core` data abstractions that replace the legacy catch-all `DynData` object while preserving parity-critical workflows.

This document answers three concrete questions:
1. What semantic series types should exist first?
2. Which storage/layout specializations should be implemented first?
3. Which exact legacy call sites migrate first?

## Module-first scope update

This design is now the target contract for module-first replacement of data handling.

Updated scope rule:

- backward compatibility with legacy data APIs is no longer a primary requirement
- downstream modules may consume the new data contract through temporary adapters
- `DynData` should be treated as a compatibility object, not the design center

## Design constraints

1. Preserve parity-critical behavior for regular-series, graph-series, and transform/training workflows.
2. Avoid a new single catch-all type with mixed concerns.
3. Avoid full combinatorial type explosion in the first milestone.
4. Keep `core` types free of facade/store/MCP concerns.
5. Keep downstream adapters narrow and temporary while call sites migrate.

## Initial semantic series types

The first milestone should introduce a small semantic family.

### 1) `RegularSeries`

Represents one regular (non-graph) trajectory.

Required fields:
- `time`: `Tensor[T]`
- `state`: `Tensor[T, state_dim]`
- `control`: optional `Tensor[T, control_dim]`
- `target`: optional `Tensor[T, aux_dim]` (legacy `y`)
- `params`: optional `Tensor[param_dim]` (legacy `p`)
- `meta`: optional dict-like metadata

Required operations:
- `slice_steps(start, end)`
- `with_state(new_state)` and `with_control(new_control)`
- `to(device, dtype)`
- `window(window, stride)` for unfold-like behavior

### 2) `GraphSeries`

Represents one graph trajectory with node states and edge data over time.

Required fields:
- `time`: `Tensor[T]`
- `node_state`: `Tensor[T, n_nodes, node_state_dim]`
- `control`: optional `Tensor[T, n_nodes, control_dim]` or `Tensor[T, control_dim]`
- `target`: optional `Tensor[T, n_nodes, aux_dim]`
- `params`: optional `Tensor[n_nodes, param_dim]` or `Tensor[param_dim]`
- `edge_index`: time-indexed edge topology (fixed or varying)
- `edge_weight`: optional time-indexed edge weights
- `edge_attr`: optional time-indexed edge attributes
- `meta`: optional dict-like metadata

Required operations:
- `slice_steps(start, end)`
- `to(device, dtype)`
- `to_flat_node_features()` for legacy model entry compatibility

### 3) `LatentSeries`

Represents encoded latent trajectories used between encoder/dynamics/decoder.

Required fields:
- `time`: optional `Tensor[T]`
- `latent`: `Tensor[T, latent_dim]` or `Tensor[T, n_nodes, latent_dim]`
- `context`: optional control/parameter context

### 4) `DerivedSeries`

Represents typed intermediate artifacts (instead of ad hoc dicts).

First derived payloads:
- `SmoothedLatentSeries`
- `DenoisedDeltaSeries`
- `EncodedSeries`

## First storage/layout specializations

Start with four concrete layouts that cover blocker workflows and avoid over-building.

### A) `UniformStepRegularSeries`

Why first:
- most regular workflow tests assume fixed-step trajectories
- directly replaces the dominant `DynData(t,x,y,u,p)` path

Layout assumptions:
- monotonic `time`
- constant `dt` per trajectory
- dense contiguous tensors

### B) `VariableStepRegularSeries`

Why first:
- preserves non-uniform time support required by the contract
- prevents hidden regression when `dt` is not constant

Layout assumptions:
- monotonic `time`
- variable `dt`
- dense tensors, no ragged batch assumption

### C) `FixedGraphSeries`

Why first:
- covers graph blocker workflows where topology is fixed across steps
- allows efficient adjacency reuse in model code

Layout assumptions:
- `edge_index` fixed across time
- edge weights/attrs may vary

### D) `VariableEdgeGraphSeries`

Why first (adapter-first):
- required for parity with legacy jagged edge handling in graph data
- can ship with slower nested/jagged backing first, then optimize

Layout assumptions:
- per-step `edge_index`
- per-step jagged edge payloads

## Batch wrappers to implement first

Use explicit batch wrappers rather than implicit shape conventions.

- `RegularSeriesBatch`: list-like batch of `RegularSeries`
- `GraphSeriesBatch`: list-like batch of `GraphSeries` plus optional collated graph view

Minimum operations:
- `collate(list[Series])`
- `slice_batch(indices)`
- `to(device, dtype)`

These wrappers replace the legacy dual meaning of `DynData.batch_size` and remove graph-mode special casing hidden in one class.

## Legacy-to-new field mapping

| Legacy `DynData` field | New location |
|---|---|
| `t` | `RegularSeries.time` / `GraphSeries.time` |
| `x` | `RegularSeries.state` / `GraphSeries.node_state` |
| `y` | `target` |
| `u` | `control` |
| `p` | `params` |
| `ei` | `GraphSeries.edge_index` |
| `ew` | `GraphSeries.edge_weight` |
| `ea` | `GraphSeries.edge_attr` |
| `meta` | `meta` |

## Compatibility adapters (temporary downstream boundary)

Introduce explicit adapters only where downstream modules still require them:

- `DynDataAdapter.from_series(series_or_batch) -> DynData`
- `SeriesAdapter.from_dyndata(dyn_data) -> RegularSeries|GraphSeries`

Adapter constraints:
- no silent shape mutation beyond documented graph flatten/unflatten
- preserve legacy delay/window semantics during transition
- emit clear errors for unsupported mixed-shape payloads

## Exact legacy call sites to migrate first

The first migration set is ordered to reduce blast radius.

### Phase 1: Data ingestion and dataset construction (highest leverage)

1. `modules/dymad_ref/src/dymad/io/trajectory_manager.py:469`
   `TrajectoryManager._transform_by_index(...)` assembles `DynData` samples.
2. `modules/dymad_ref/src/dymad/io/trajectory_manager.py:571`
   `TrajectoryManager.create_dataloaders(...)` relies on `DynData.collate`.
3. `modules/dymad_ref/src/dymad/io/trajectory_manager.py:805`
   `TrajectoryManagerGraph._transform_by_index(...)` assembles graph `DynData`.
4. `modules/dymad_ref/src/dymad/io/trajectory_manager.py:890`
   `TrajectoryManagerGraph.create_dataloaders(...)` uses graph collation path.

Migration action:
- produce `RegularSeriesBatch` / `GraphSeriesBatch` here first, then adapter back to `DynData` for downstream compatibility.

### Phase 2: Training entrypoints that instantiate trajectory managers

5. `modules/dymad_ref/src/dymad/training/driver.py:262`
   `_create_trajectory_manager(...)` currently hardcodes legacy manager classes.

Migration action:
- switch this factory to new manager interfaces that output series batches.

### Phase 3: Checkpoint and prediction compatibility boundary

6. `modules/dymad_ref/src/dymad/io/checkpoint.py:135`
   `predict_fn(...)` creates synthetic `DynData` for model prediction.
7. `modules/dymad_ref/src/dymad/io/checkpoint.py:340`
   `DataInterface` path creates `TrajectoryManager` for train/valid data access.

Migration action:
- adapt checkpoint facade to accept `Series` payloads; retain `load_model(...)` behavior through adapter shims.

### Phase 4: Model interfaces that still type against `DynData`

8. `modules/dymad_ref/src/dymad/models/model_base.py:168`
   `forward(...)` materializes `DynData` during model inspection path.
9. `modules/dymad_ref/src/dymad/models/model_base.py:179`
   `encoder/dynamics/decoder/predict` signatures still depend on `DynData`.

Migration action:
- introduce typed context interface (`ModelContext`) with adapter support from `Series`.

## Parity gates for this migration seam

Run these as blocker checks after each migration chunk:

```bash
cd modules/dymad_ref && pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py -q
cd modules/dymad_ref && pytest tests/test_assert_trajmgr_graph.py tests/test_assert_graph.py -q
cd modules/dymad_ref && pytest tests/test_workflow_lti.py -q
```

Rationale:
- first command validates regular-series data and transform behavior
- second command validates graph-series data handling
- third command validates one end-to-end regular training/prediction workflow

## Initial implementation sequence inside `modules/dymad_migrate/`

1. Add core series dataclasses/protocols (`RegularSeries`, `GraphSeries`, `LatentSeries`, `DerivedSeries`) and batch wrappers.
2. Implement `UniformStepRegularSeries`, `VariableStepRegularSeries`, `FixedGraphSeries`, `VariableEdgeGraphSeries`.
3. Implement adapters (`DynDataAdapter`, `SeriesAdapter`) with round-trip tests.
4. Migrate data-manager construction path to emit series batches.
5. Keep legacy model/training code running via adapter until transform/model/training layer designs land.

## Open design questions

1. Should graph `control` and `params` be strictly node-wise, strictly global, or union-typed with validation rules?
2. Do we keep nested-tensor backing for `VariableEdgeGraphSeries` in phase 1, or normalize to packed edge tables immediately?
3. Should `target` remain an optional field on base series or move to task-specific wrappers for supervised workflows?
