# DyMAD Transform Layer Design

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/architecture/data-layer-design.md`
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `projects/dymad_migrate/architecture/migration-matrix.md`
- `modules/dymad_migrate/tasks/refactor_target_architecture.md`

## Purpose

Define the target transform layer for DyMAD’s migration from NumPy-list transforms toward PyTorch-first fitted modules that can operate both:

- as preprocessing on typed series/batches
- inside differentiable model pipelines

This document answers three questions:
1. what is the base transform contract?
2. how do legacy config aliases and transform state survive migration?
3. which transform families port first?

## Design constraints

1. Preserve blocker-level transform behavior from `test_assert_transform.py`, `test_assert_trans_mode.py`, `test_assert_trans_lift.py`, and `test_assert_trans_ndr.py`.
2. Keep transform logic in `core`; do not mix in store/handle/MCP concerns.
3. Keep fitted-state persistence explicit and checkpoint-friendly.
4. Support both component-wise preprocessing and model-embedded usage.
5. Allow external numerical routines to stay wrapped temporarily where pure PyTorch equivalents do not exist yet.

## Problems in the legacy design

The current transform stack is coherent conceptually but limited architecturally:

- `Transform` assumes list-of-NumPy-array I/O
- `Compose` depends on string-name factories and range-based partial application
- transform fitting and transform-state reuse are wired directly into `TrajectoryManager`
- `make_transform(...)` is used as an eager config-to-runtime constructor in both preprocessing and checkpoint paths
- nonlinear dimensionality reduction transforms depend on external numerical classes with implicit gradient limitations

Representative legacy entrypoints:

- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:159`
- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:216`
- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:473`
- `modules/dymad_ref/src/dymad/io/trajectory_manager.py:810`
- `modules/dymad_ref/src/dymad/io/checkpoint.py:64`
- `modules/dymad_ref/src/dymad/transform/collection.py:168`

## Proposed base protocol

Transforms should become `torch.nn.Module`-based objects with explicit fitted state.

### `TransformModule`

Required interface:

- `fit(series_or_batch) -> self`
- `forward(x_or_series)`
- `inverse(x_or_series)`
- `jacobian(...)` or `forward_modes(...)`
- `inverse_jacobian(...)` or `backward_modes(...)`
- `state_dict()` / `load_state_dict()`

Required metadata:

- `input_dim`
- `output_dim`
- `delay`
- `invertibility`: `exact | approximate | none`
- `supports_gradients`: `true | false | approximate`

### `FieldTransform`

A transform should declare which field(s) it targets:

- `state`
- `control`
- `target`
- `params`
- `edge_weight`
- `edge_attr`
- `latent`

This removes the current pattern where `TrajectoryManager` owns multiple parallel transform members (`transform_x`, `transform_y`, `transform_u`, `transform_p`, ...).

### `TransformPipeline`

Pipeline responsibilities:

- ordered composition
- delay bookkeeping
- partial application by stage range when needed for compatibility
- pipeline-level inverse and mode propagation
- pipeline-level `state_dict()` / `load_state_dict()`

The pipeline should operate on typed series/batches, but allow component-level application through a thin adapter for legacy paths.

## Transform spec and compatibility model

### `TransformSpec`

Introduce a typed config representation:

- `IdentitySpec`
- `ScalerSpec(mode="01" | "-11" | "std" | "none")`
- `DelaySpec(delay=int)`
- `LiftSpec(kind="poly" | "mixed", ...)`
- `SVDSpec(...)`
- `DiffMapSpec(...)`
- `IsomapSpec(...)`
- `ComposeSpec(stages=[...])`

### Legacy compatibility

Keep config dictionaries and string aliases as adapter input only.

Compatibility path:

- legacy config -> `TransformSpec` parser
- `TransformSpec` -> concrete `TransformModule`
- pipeline persists typed stage metadata, not only string names

This preserves user-facing brevity while moving the internals away from `TRN_MAP` string dispatch.

## Transform categories to support first

### Category A — stateless differentiable transforms

Examples:

- identity
- add-one / bias augmentation
- pure algebraic lifting helpers

These should port first because they are low-risk and establish the module contract.

### Category B — fitted differentiable transforms

Examples:

- scaler / normalization
- delay embedding
- lift variants with cached structure

These are the first parity-critical family because they appear directly in blocker workflows and trajectory preprocessing.

### Category C — approximate or wrapped external transforms

Examples:

- SVD-based transforms
- diffusion-map / manifold transforms
- Isomap-like nonlinear reduction

Policy:

- allow CPU-side external implementation in phase 1
- wrap in explicit adapter/autograd contracts
- mark `supports_gradients` explicitly

## First transform families to port

### Port first

1. `Identity`
2. `Scaler`
3. `DelayEmbedder`
4. `Lift`
5. `Compose`

Why:

- these dominate parity-critical transform behavior
- they appear directly in workflow configs (`transform_x`, `transform_u`)
- they are sufficient for the first vertical slice

### Port second

6. `SVD`
7. `Autoencoder` transform wrapper

Why:

- important but not needed for the first vertical slice’s minimal proof

### Wrap third

8. `DiffMap`
9. `DiffMapVB`
10. `Isomap`

Why:

- these are numerics-heavy and should not block the first boundary extraction

## State persistence rules

Transform checkpoints should store:

- typed stage identity
- fitted parameters/buffers
- delay and dimension metadata
- gradient-support metadata

Do not rely only on ad hoc names + child dictionaries as the long-term representation.

Compatibility shim:

- `LegacyTransformCheckpointAdapter` reads old transform state dicts and constructs equivalent `TransformModule` instances

This adapter should be used in:

- trajectory-manager transform reuse
- checkpoint loading
- model-prediction compatibility paths

## Migration entrypoints

### Phase 1 — constructor boundary

- replace `make_transform(...)` internals with `TransformSpec` parsing + module construction
- keep the public call surface available through a shim

### Phase 2 — trajectory preprocessing

- swap `TrajectoryManager` field-specific transform members for field-aware pipeline application
- preserve output parity through adapters

### Phase 3 — checkpoint/load-model path

- load transform modules through the compatibility adapter
- keep legacy checkpoint payloads readable

## Verification gates

Primary gates:

```bash
cd modules/dymad_ref && pytest tests/test_assert_transform.py tests/test_assert_trans_mode.py tests/test_assert_trans_lift.py tests/test_assert_trans_ndr.py -q
```

Boundary gate:

```bash
cd modules/dymad_ref && pytest tests/test_assert_trajmgr.py tests/test_workflow_lti.py -q
```

## Open questions

1. Should partial-range pipeline application survive as a permanent feature or remain a compatibility-only capability?
2. Should `DelayEmbedder` stay as a transform or become part of the data/windowing layer for some workflows?
3. Which NDR-family transforms need true gradient support versus explicit no-grad contracts in the first milestone?
