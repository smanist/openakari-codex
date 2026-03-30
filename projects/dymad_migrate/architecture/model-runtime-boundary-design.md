# DyMAD Model Runtime Boundary Design

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/architecture/data-layer-design.md`
- `projects/dymad_migrate/architecture/model-spec-design.md`
- `projects/dymad_migrate/architecture/checkpoint-facade-design.md`
- `projects/dymad_migrate/plans/2026-03-30-model-runtime-next-module-and-dyndata-retirement.md`

## Purpose

Define the typed model-runtime boundary that sits between the completed typed
data/transform migration and the still-legacy model/prediction internals.

This document answers:
1. what typed object should prediction/runtime code consume first?
2. which legacy runtime entrypoints should migrate first?
3. where does `DynData` remain, temporarily, during this module migration?

## Legacy bottlenecks

The current model runtime still depends directly on `DynData` across several layers:

- `modules/dymad_migrate/src/dymad/models/model_base.py:7`
  model-facing signatures use `DynData` for `encoder`, `dynamics`, `decoder`,
  `linear_eval`, `linear_features`, and `predict`.
- `modules/dymad_migrate/src/dymad/models/components.py:11`
  helper functions read state, control, and graph fields directly from `DynData`.
- `modules/dymad_migrate/src/dymad/models/prediction.py:12`
  prediction helpers normalize batch/time behavior around `DynData`.
- `modules/dymad_migrate/src/dymad/io/checkpoint.py:205`
  checkpoint-backed `predict_fn(...)` still assembles `DynData` payloads directly
  before calling `model.predict(...)`.

This is now the main post-data/transform bottleneck because typed series exist, but
runtime still lacks a stable typed model-facing boundary.

## Design principles

1. model runtime should consume typed context objects, not raw `DynData`
2. one typed context family should cover both regular and graph prediction inputs
3. `DynData` remains only as a narrow compatibility payload behind the model-runtime boundary
4. the first migration target is prediction/runtime, not full model-spec or training
5. helper migration should move field reads behind typed context readers before `DynData` deletion

## Proposed typed runtime context

Introduce a small family of typed runtime-context objects:

- `RegularModelContext`
- `GraphModelContext`

Each context is built from the already-migrated typed series batches:

- `RegularSeriesBatch -> RegularModelContext`
- `GraphSeriesBatch -> GraphModelContext`

### `RegularModelContext`

Owns:
- the batch of regular typed series
- initial state extraction for prediction entrypoints
- access to per-item time/control/params metadata
- a narrow `to_legacy_runtime()` adapter for legacy model internals

### `GraphModelContext`

Owns:
- the batch of graph typed series
- flattened initial-state extraction for current graph prediction APIs
- access to edge index / edge weight / edge attr payloads
- a narrow `to_legacy_runtime()` adapter for legacy graph internals

## Temporary compatibility rule

The first model-runtime slice does **not** rewrite model internals yet.

Temporary rule:
- public prediction entrypoints build typed model context first
- typed context is the authoritative runtime payload
- only at the shrinking compatibility boundary do we adapt typed context to `DynData`

That means:
- `DynData` remains inside `model_base`, `components`, and `prediction` temporarily
- `checkpoint.py` and future prediction entrypoints should stop constructing `DynData` directly

## First exact migration targets

### 1. Typed context adapter

Add typed runtime adapters that preserve all information legacy helpers currently need.

Target file:
- `modules/dymad_migrate/src/dymad/core/model_context.py`

### 2. Regular checkpoint-backed prediction path

First public path to migrate:
- `modules/dymad_migrate/src/dymad/io/checkpoint.py:205`

Desired flow:
- arrays -> typed series batch
- typed series batch -> `RegularModelContext`
- `RegularModelContext` provides initial state tensor
- `RegularModelContext.to_legacy_runtime()` feeds the temporary legacy boundary

### 3. Graph checkpoint-backed prediction path

Second public path to migrate:
- `modules/dymad_migrate/src/dymad/io/checkpoint.py:205`

Desired flow:
- graph arrays -> typed graph series batch
- typed graph series batch -> `GraphModelContext`
- `GraphModelContext` provides flattened initial state tensor
- `GraphModelContext.to_legacy_runtime()` feeds the temporary legacy boundary

### 4. Helper/component migration

After the first public paths are routed through typed context, start shrinking helper
coupling in:

- `modules/dymad_migrate/src/dymad/models/components.py`

Initial target families:
- encoder input readers
- feature composition readers
- linear feature/eval helpers

## Runtime boundary shape

Short-term boundary:

```text
typed series batch
  -> typed model context
  -> legacy runtime adapter (`DynData`)
  -> legacy model internals
```

Later boundary:

```text
typed series batch
  -> typed model context
  -> typed helper readers / typed predictor engine
  -> typed model internals
```

## Non-goals for this module

Not part of this module slice:
- full typed model-spec builders
- training phase split
- dataloader/batch retirement
- deleting `DynData`

Those remain later tasks and a separate `DynData` retirement queue.

## Verification gates

Adapter gate:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_context_adapter.py -q
```

Regular runtime follow-up gate:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py -q
```

Graph runtime follow-up gate:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q
```

## Open questions

1. Should prediction contexts eventually carry typed rollout-policy metadata, or should rollout remain separate from runtime context?
2. Do graph contexts need an explicit node-feature schema before helper migration, or is the current series-backed shape sufficient for the first slice?
3. Should `model.predict(...)` gain an overload for typed context before helper migration, or should that wait until the first regular and graph routed paths are stable?
