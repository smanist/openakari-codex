# DyMAD Model Spec Design

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/architecture/data-layer-design.md`
- `projects/dymad_migrate/architecture/transform-layer-design.md`
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `projects/dymad_migrate/architecture/migration-matrix.md`
- `modules/dymad_migrate/tasks/refactor_target_architecture.md`

## Purpose

Define the typed model-spec system that replaces the current string-map-heavy construction path while preserving concise predefined-model instantiation.

This document answers:
1. what objects define model structure?
2. how are memory and rollout specified separately from structure?
3. how do legacy names like `LDM`, `KBF`, `DKBF`, etc. survive during migration?

## Problems in the legacy design

Current model construction is spread across:

- `models/collections.py` — predefined names as tuples of strings + class
- `models/helpers.py` — dimension inference, autoencoder/processor factories, predictor selection
- `models/recipes.py` — class-specific interpretation of config and type strings
- `models/prediction.py` — rollout logic mixed with memory assumptions and control interpolation

Consequences:

- structural semantics are encoded in loosely coupled strings
- rollout policy is not cleanly separated from model structure
- adding new variants risks expanding string combinations instead of composing typed concepts

Representative migration entrypoints:

- `modules/dymad_ref/src/dymad/models/collections.py:8`
- `modules/dymad_ref/src/dymad/models/helpers.py:155`
- `modules/dymad_ref/src/dymad/models/recipes.py:20`
- `modules/dymad_ref/src/dymad/models/prediction.py:97`

## Design principles

1. structure and rollout are different concerns
2. predefined names remain concise, but they build typed specs
3. graph/non-graph and continuous/discrete distinctions become explicit fields, not inferred from string prefixes
4. analysis-facing capabilities should depend on stable protocols, not on rummaging through model internals

## Proposed typed spec family

### `ModelSpec`

Top-level structural spec with:

- `name`
- `time_domain`: `continuous | discrete`
- `graph_mode`: `none | autoencoder_graph | dynamics_graph`
- `encoder: EncoderSpec`
- `features: FeatureSpec`
- `dynamics: DynamicsSpec`
- `decoder: DecoderSpec`
- `transform_pipeline: TransformPipelineSpec | None`
- `memory: MemorySpec`
- `prediction: PredictionSpec`
- `analysis: AnalysisSpec | None`

### `EncoderSpec`

Fields:

- `family`: `mlp | gnn | seq | raw | custom`
- `variant`
- `layers`
- `hidden_dim`
- `latent_dim`
- `activation`
- `weight_init`
- `graph_config | None`

### `FeatureSpec`

Fields:

- `family`: `none | cat | blin | graph_cat | graph_blin | custom`
- `const_term: bool`

This replaces the current `fzu_type` string handling.

### `DynamicsSpec`

Fields:

- `family`: `direct | skip | graph_direct | custom`
- `processor: ProcessorSpec`

### `ProcessorSpec`

Fields:

- `family`: `mlp | gnn | kernel | linear | sequential`
- `variant`
- `hidden_dim`
- `depth`
- `extra`

This turns the current processor-type/config mutation into explicit structure.

### `DecoderSpec`

Fields parallel to `EncoderSpec`.

### `MemorySpec`

Defines what historical state the model consumes and emits.

Initial variants:

- `MarkovMemory(order=1)`
- `HistoryMemory(window=k, update="shift")`
- `SequenceMemory(length=k, flatten="concat")`

This replaces the current implicit mixing of `delay`, sequence models, and rollout shape assumptions.

### `PredictionSpec`

Defines rollout policy, not structural dynamics.

Initial variants:

- `ContinuousRollout(solver="dopri5", control_interp="cubic")`
- `ContinuousExponentialRollout()`
- `DiscreteRollout(mode="step")`
- `DiscreteExponentialRollout()`

Fields:

- rollout family
- solver or stepping mode
- control interpolation
- projection / post-step behavior

## Predefined model compatibility

Keep the user-facing names, but redefine them as spec builders:

- `LDM(...) -> ModelSpec`
- `KBF(...) -> ModelSpec`
- `DKBF(...) -> ModelSpec`
- `LTI(...) -> ModelSpec`
- graph variants likewise

Compatibility layer:

- `LegacyPredefinedModelAdapter`
- `legacy_name + config + data_meta -> ModelSpec`
- `build_model_from_spec(ModelSpec, data_signature, dtype, device)`

This preserves concise APIs while removing string combinations as the internal contract.

## Rollout separation

The model object should provide structural ingredients:

- encode
- decode
- state transition or rate function
- memory update contract

The rollout engine should own:

- continuous vs discrete stepping
- control interpolation
- batch/time iteration
- graph-batch peculiarities
- rollout bookkeeping

This means the current `predict_*` functions become implementations of typed rollout specs rather than ad hoc free functions chosen by string/config combinations.

## Analysis-facing protocols

Introduce stable protocols/adapters for downstream analysis:

- `LinearizableModel`
- `ModalAnalyzableModel`
- `OperatorViewProvider`
- `EncodedTrajectoryProvider`

The first milestone does not need every protocol implemented, but the spec system should reserve a clean place for them.

## Migration plan

### Phase 1 — spec introduction without behavior change

- define spec dataclasses/protocols
- add converters from current predefined names/config
- keep `build_model(...)` alive behind an adapter

### Phase 2 — rollout extraction

- map legacy `predict_*` selection into `PredictionSpec`
- move rollout logic behind typed engines

### Phase 3 — shrink string internals

- stop passing raw type strings deep into helpers
- convert recipes to spec builders or specialized assemblers

## First exact legacy entrypoints to target

1. `modules/dymad_ref/src/dymad/models/collections.py:8`
   `PredefinedModel` should become a compatibility builder over typed specs.
2. `modules/dymad_ref/src/dymad/models/helpers.py:155`
   `build_model(...)` becomes `build_model_from_spec(...)`.
3. `modules/dymad_ref/src/dymad/models/helpers.py:124`
   predictor selection becomes rollout-spec selection.
4. `modules/dymad_ref/src/dymad/models/recipes.py:20`
   class-specific `build_core(...)` logic becomes structured spec interpretation rather than string mutation.
5. `modules/dymad_ref/src/dymad/models/prediction.py:97`
   rollout functions migrate behind typed rollout engines.

## Verification gates

Primary workflow gates:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_kp.py tests/test_workflow_lti.py -q
```

Graph follow-up gate:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q
```

## Open questions

1. Should `TransformPipelineSpec` live inside `ModelSpec`, or should models reference reusable pipeline specs owned by the data/facade layer?
2. Do graph autoencoder and graph dynamics variants deserve separate `graph_mode` enums, or should they be inferred from encoder/dynamics specs?
3. Which analysis protocols need to be first-class in the first milestone versus deferred until the spectral-analysis adapter work?
