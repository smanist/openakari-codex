# DynData Retirement Inventory

Date: 2026-03-30
Status: active baseline
Depends on:
- `projects/dymad_migrate/plans/2026-03-30-dyndata-retirement-centered-path.md`
- `projects/dymad_migrate/architecture/data-layer-design.md`
- `projects/dymad_migrate/architecture/model-runtime-boundary-design.md`

## Purpose

Identify the remaining `DynData` dependency surface after the completed data/transform
and model-runtime slices, and classify each dependency by removal phase.

This document answers:
1. where is `DynData` still imported or constructed?
2. which uses are temporary compatibility boundaries versus real blockers?
3. what should be removed first, and what must remain until the last phase?

## Current surface summary

As of 2026-03-30, `rg -n "\bDynData\b" modules/dymad_migrate/src/dymad -g '*.py'`
finds 103 textual references across 18 files.

The remaining surface falls into six categories:

1. legacy object definition and public export
2. shrinking compatibility adapters
3. dataloader and batch boundaries
4. model runtime and prediction consumers
5. training consumers
6. low-priority analysis helpers and comments

## Category A - object definition and public export

These files are allowed to survive until the final deletion phase.

- `modules/dymad_migrate/src/dymad/io/data.py:176`
  defines the legacy `DynData` object and its batch helpers
- `modules/dymad_migrate/src/dymad/io/__init__.py:2`
  still exports `DynData` as part of the public `dymad.io` surface

Removal phase:
- keep through retirement Phases 2-4
- remove only after no production path depends on `DynData.collate`, `get_step`,
  `truncate`, `unfold`, or public import re-exports

## Category B - shrinking compatibility adapters

These are temporary by design and should remain only until the last remaining
legacy consumers are gone.

- `modules/dymad_migrate/src/dymad/core/model_context.py:45`
  `RegularModelContext.to_legacy_runtime()` still materializes `DynData`
- `modules/dymad_migrate/src/dymad/core/model_context.py:85`
  `GraphModelContext.to_legacy_runtime()` still materializes `DynData`
- `modules/dymad_migrate/src/dymad/io/series_adapter.py:77`
  `SeriesAdapter.from_dyndata(...)` still converts legacy payloads into typed series
- `modules/dymad_migrate/src/dymad/io/series_adapter.py:190`
  `SeriesAdapter.from_regular_series(...)` converts typed regular series back to `DynData`
- `modules/dymad_migrate/src/dymad/io/series_adapter.py:201`
  `SeriesAdapter.from_graph_series(...)` converts typed graph series back to `DynData`
- `modules/dymad_migrate/src/dymad/models/runtime_view.py:28`
  helper-facing adapter still accepts raw `DynData` in the payload union

Removal phase:
- keep through retirement Phases 2-4
- delete when prediction, training, and helper call sites no longer need a legacy
  runtime payload

## Category C - dataloader and batch boundaries

This is the main retirement bottleneck. `DynData` is still the canonical batch object
emitted by dataset and dataloader code.

- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:473`
  regular `_transform_by_index(...)` still returns `List[DynData]`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:613`
  regular `DataLoader(...)` still uses `collate_fn=DynData.collate`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:810`
  graph `_transform_by_index(...)` still returns `List[DynData]`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:1018`
  graph batching still pre-collates with `DynData.collate(...)`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py:1021`
  graph `DataLoader(...)` still uses `collate_fn=DynData.collate`
- `modules/dymad_migrate/src/dymad/io/checkpoint.py:470`
  `DataInterface` still rebuilds dataloaders with `DynData.collate`

Removal phase:
- Phase 2 first target
- once this category moves to typed batches, the downstream training surface becomes
  bounded and `DynData` stops being the design center

## Category D - model runtime and prediction consumers

These call sites still consume `DynData` semantics even though public checkpoint
prediction already enters through typed contexts first.

- `modules/dymad_migrate/src/dymad/models/prediction.py:7`
  prediction helpers still type `ws` as `DynData`
- `modules/dymad_migrate/src/dymad/models/prediction.py:48`
  `_prepare_data(...)` still batch-expands with `DynData.collate(...)`
- `modules/dymad_migrate/src/dymad/models/prediction.py:65`
  empty fallback runtime still uses `DynData().to(device)`
- `modules/dymad_migrate/src/dymad/models/model_base.py:169`
  `forward(...)` still reconstructs `DynData` for inspection and visualization
- `modules/dymad_migrate/src/dymad/models/recipes.py:255`
  specialized predictor override in `CD_KMM.predict(...)` still types `w: DynData`
- `modules/dymad_migrate/src/dymad/models/recipes.py:259`
  `CD_KMM.fenc_step(...)` still types `w: DynData`
- `modules/dymad_migrate/src/dymad/models/recipes_corr.py:95`
  correction-model `dynamics(...)` still types `w: DynData`
- `modules/dymad_migrate/src/dymad/models/recipes_corr.py:106`
  correction encoder helpers still type `w: DynData`
- `modules/dymad_migrate/src/dymad/io/checkpoint.py:258`
  nested-list graph fallback still directly constructs `DynData`
- `modules/dymad_migrate/src/dymad/io/checkpoint.py:425`
  `DataInterface.encoder(...)` still wraps raw arrays in `DynData`

Removal phase:
- Phase 3
- regular and graph checkpoint entrypoints already cross typed contexts first, so this
  category is now mostly a consumer rewrite rather than a public API rewrite

## Category E - training consumers

Training still assumes that dataloaders emit `DynData`, and the linear-solve helpers
are especially direct about that contract.

- `modules/dymad_migrate/src/dymad/training/opt_linear.py:38`
  `_process_batch(...)` expects `DynData`
- `modules/dymad_migrate/src/dymad/training/opt_node.py:73`
  `_process_batch(...)` expects `DynData`
- `modules/dymad_migrate/src/dymad/training/opt_weak_form.py:52`
  `_process_batch(...)` expects `DynData`
- `modules/dymad_migrate/src/dymad/training/opt_base.py:461`
  validation helpers still type `truth: DynData`
- `modules/dymad_migrate/src/dymad/training/ls_update.py:22`
  linear-feature helpers still type `batch: DynData`
- `modules/dymad_migrate/src/dymad/training/ls_update.py:256`
  `LSUpdater.eval_batch(...)` still expects `DynData`
- `modules/dymad_migrate/src/dymad/training/helper.py:44`
  `RunState` does not name `DynData` directly, but its live loader fields still carry
  legacy `DynData` batches and therefore must be updated together with typed batch adoption

Removal phase:
- Phase 4
- recommended first trainer family: `opt_linear` plus `ls_update`, because it is the
  narrowest coherent batch consumer

## Category F - analysis helpers and comments

These are not primary blockers but should be cleaned once the core runtime is stable.

- `modules/dymad_migrate/src/dymad/sako/base.py:96`
  analysis helper still calls `self.model.encoder(DynData(x=batch.x))`
- `modules/dymad_migrate/src/dymad/utils/graph.py:26`
  comment still documents graph handling in terms of later `DynData` processing

Removal phase:
- Phase 4 or 5, after the corresponding runtime and training paths are typed

## Allowed temporary boundaries

The following files are the only acceptable `DynData` construction or translation
boundaries during retirement:

- `modules/dymad_migrate/src/dymad/io/data.py`
- `modules/dymad_migrate/src/dymad/io/series_adapter.py`
- `modules/dymad_migrate/src/dymad/core/model_context.py`
- `modules/dymad_migrate/src/dymad/models/runtime_view.py`

Everything else should be treated as a migration target, not as a stable home for
new `DynData` dependencies.

## Recommended cut order

1. replace dataloader and trainer-facing batch emission in `trajectory_manager.py`
2. replace first trainer family consumption (`opt_linear` plus `ls_update`)
3. replace residual prediction/runtime consumers in `models/prediction.py`,
   `model_base.py`, `recipes.py`, and `recipes_corr.py`
4. remove direct `DynData` construction from `checkpoint.py` and `DataInterface`
5. remove public export from `dymad.io`
6. delete reverse adapters and finally delete `io/data.py`

## Deletion criteria

`DynData` can be deleted only when all of the following are true:

1. `TrajectoryManager` emits typed batches on all active regular and graph paths
2. trainer entrypoints consume typed batches or typed model contexts
3. `models/prediction.py` no longer requires `DynData` as its runtime carrier
4. `checkpoint.py` and `DataInterface` no longer construct `DynData` on migrated paths
5. `rg -n "\bDynData\b" modules/dymad_migrate/src/dymad -g '*.py'` only reports
   staging shims inside files scheduled for deletion
