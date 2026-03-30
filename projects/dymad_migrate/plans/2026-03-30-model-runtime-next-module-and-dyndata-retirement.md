# Next Module After Data/Transform: Model Runtime / Prediction

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/architecture/data-layer-design.md`
- `projects/dymad_migrate/architecture/model-spec-design.md`
- `projects/dymad_migrate/architecture/checkpoint-facade-design.md`
- `projects/dymad_migrate/architecture/training-layer-design.md`
- `projects/dymad_migrate/analysis/2026-03-30-data-transform-boundary-verification.md`

## Decision

The next active module migration after Phase 1 data/transform should be the
model runtime / prediction boundary, not training and not full model-spec.

## Why this module next

1. It is the narrowest remaining layer that still depends heavily on `DynData`.
2. It sits directly between the completed data/transform work and later training migration.
3. It reduces the main architectural bottleneck without forcing the full trainer redesign yet.
4. It gives the project one stable typed execution path for regular and graph prediction before optimizer-phase work begins.

## Scope of the next module

In scope:
- model-facing typed input/context objects
- prediction/runtime helpers
- one regular typed prediction path
- one graph typed prediction path
- compatibility adapters where legacy model internals still need `DynData`

Out of scope for this module:
- full trainer/phase-pipeline migration
- full typed model-spec builder migration
- deleting `DynData`

## Separate DynData queue

`DynData` retirement should be tracked as a separate planning queue.

Reason:
- retirement spans model runtime, training, checkpoint, and dataloader boundaries
- making it the active execution target now would blur module sequencing
- the correct current rule is: stop expanding `DynData`, shrink it at explicit boundaries, then retire it by phase

## Execution order

1. model runtime / prediction typed boundary design
2. regular prediction typed context prototype
3. graph prediction typed context prototype
4. helper/component migration away from direct `DynData` field access
5. parity verification for prediction flows
6. only then begin the training-module migration
