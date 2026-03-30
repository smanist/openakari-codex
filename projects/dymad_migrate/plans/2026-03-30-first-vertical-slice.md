# First Vertical Migration Slice

Date: 2026-03-30
Status: proposed
Project: dymad_migrate

## Slice name

Data-boundary slice: `Series` + transform pipeline + checkpoint-compatible prediction adapter

## Why this slice first

This slice validates the architecture where the current package is most entangled and most upstream:

- `DynData` is the central catch-all runtime object
- `TrajectoryManager` owns loading, transform fitting, dataset preparation, and dataloader construction
- transform fitting/application sits directly on that boundary
- checkpoint prediction currently reconstructs synthetic `DynData` objects for user-facing inference

The slice is therefore both:

- architecturally meaningful
- small enough to finish without rewriting the whole model/training stack

## What this slice will validate

1. `core` can own typed data objects and transform contracts without MCP/store leakage.
2. `facade`-style compatibility adapters can preserve legacy checkpoint/prediction behavior.
3. the migration can preserve blocker-level parity gates while changing the internal boundary.

## In scope

### New core artifacts in `modules/dymad_migrate/`

- initial series types from `projects/dymad_migrate/architecture/data-layer-design.md`
- initial transform module protocol from `projects/dymad_migrate/architecture/transform-layer-design.md`
- adapters between new series objects and legacy-like runtime expectations

### Legacy entrypoints to replace or wrap first

- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:159`
  transform initialization (`make_transform(...)` for `x/y/u/p`)
- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:216`
  transform state reuse / `load_state_dict(...)`
- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:473`
  regular-series transform application path
- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:810`
  graph-series transform application path
- `modules/dymad_ref/src/dymad/io/checkpoint.py:64`
  checkpoint-time transform reconstruction
- `modules/dymad_ref/src/dymad/io/checkpoint.py:135`
  prediction-time synthetic data/context assembly

### Compatibility promise for the slice

- do not yet replace model internals or rollout engines
- do not yet refactor training phases
- preserve `load_model(...)`-style user behavior through adapters

## Out of scope

- typed `ModelSpec` implementation
- `CVDriver -> TrainerRun -> PhasePipeline` implementation
- full facade/store/exec integration into the data-boundary slice (a minimal boundary skeleton is tracked separately in `projects/dymad_migrate/plans/2026-03-30-facade-store-exec-skeleton.md`)
- direct MCP publication
- broad graph-kernel or spectral-analysis refactors

## Implementation sequence

### Step 1 — Add typed data and transform contracts

- land `RegularSeries`, `GraphSeries`, and first batch wrappers
- land `TransformModule` / `TransformPipeline`
- keep adapters to/from legacy representations

### Step 2 — Migrate trajectory preprocessing boundary

- make the new trajectory/data manager path emit series batches
- apply transforms through the new pipeline
- adapt back to `DynData`-compatible forms only where still needed downstream

### Step 3 — Migrate checkpoint prediction boundary

- reconstruct series objects in checkpoint prediction
- call transform pipeline + model/prediction adapter
- preserve legacy output shape/normalization behavior

### Step 4 — Run parity gates

Required blocker gates:

```bash
cd modules/dymad_ref && pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py -q
cd modules/dymad_ref && pytest tests/test_workflow_lti.py -q
```

Strongly recommended graph gate:

```bash
cd modules/dymad_ref && pytest tests/test_assert_trajmgr_graph.py tests/test_assert_graph.py -q
```

## Deliverables

- first series + transform contracts in `modules/dymad_migrate/`
- compatibility adapters for checkpoint prediction
- one implementation note documenting how the old boundary maps to the new one
- parity-gate results recorded in the project README

## Risks

- graph-series transform behavior may force earlier-than-desired edge-payload decisions
- checkpoint prediction may expose hidden assumptions about transform field ordering
- adapter layers could become too thick if the transform contract is underspecified

## Exit criteria

This slice is complete when:

- series + transform contracts exist in the migration target
- trajectory preprocessing can use them internally
- checkpoint prediction still works through adapters
- blocker regression gates pass
