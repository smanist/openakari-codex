# DyMAD Checkpoint Facade Design

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md`
- `projects/dymad_migrate/architecture/model-spec-design.md`
- `projects/dymad_migrate/architecture/transform-layer-design.md`
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `modules/mcp_test/ARCHITECTURE_SUMMARY.md`

## Purpose

Define the first checkpoint/load-model compatibility boundary so DyMAD can keep the legacy
`load_model(...)` workflow surface while moving ownership into the target
`core -> facade -> store -> exec` layers.

This document answers:
1. which legacy API shapes are parity-critical and must stay callable
2. what each new layer owns for checkpoint loading and prediction setup
3. how the compatibility shim is staged without moving numerical behavior yet

## Legacy findings to preserve

The current migration package keeps the legacy checkpoint flow in
`modules/dymad_migrate/src/dymad/io/checkpoint.py`.

Key findings from the active call path:

1. `load_model(model_class, checkpoint_path)` is the user-facing entrypoint and returns
   `(model, predict_fn)` (`checkpoint.py:32`).
2. Checkpoint path handling includes fallback from `<name>.pt` to `<name>/<name>.pt`
   (`checkpoint.py:47-51`) and should remain available through compatibility shims.
3. Checkpoint materialization loads config + train metadata + model state dict
   (`checkpoint.py:52-62`) and restores multiple transform families
   (`checkpoint.py:64-80`).
4. `predict_fn(...)` accepts both regular and graph arguments with optional
   control/params/edge payloads and a `ret_dat` compatibility mode
   (`checkpoint.py:135-223`).
5. `DataInterface` also depends on `load_model(...)` when checkpoint-backed
   (`checkpoint.py:282+`, especially `checkpoint.py:308`).
6. Workflow tests in the migration package directly call `load_model(...)` then invoke
   `prd_func(...)` across regular, graph, kernel, and spectral cases:
   - `tests/test_workflow_lti.py:167`
   - `tests/test_workflow_kp.py:163`
   - `tests/test_workflow_ltg.py:161`
   - `tests/test_workflow_ltga.py:140`
   - `tests/test_workflow_ker_auto.py:140`
   - `tests/test_workflow_ker_ctrl.py:133`
   - `tests/test_workflow_sa_lti.py:106`

## Compatibility surface to keep

The first facade boundary must preserve these callable shapes.

### Shape A: Load model

```python
model, predict_fn = load_model(model_class, checkpoint_path)
```

Compatibility requirement:
- still returns a model object and callable prediction function
- still accepts both direct checkpoint paths and folder-prefixed fallback paths

### Shape B: Predict function

```python
predict_fn(
    x0, t,
    u=None, p=None,
    ei=None, ew=None, ea=None,
    device="cpu",
    ret_dat=False,
)
```

Compatibility requirement:
- regular trajectories keep current call shape (`x0, t, u`) behavior
- graph trajectories keep current call shape (`ei`, optional `ew`/`ea`) behavior
- `ret_dat=True` remains available for tooling paths such as visualization

### Shape C: Data interface checkpoint mode

```python
DataInterface(model_class=..., checkpoint_path=...)
```

Compatibility requirement:
- checkpoint-backed construction still loads transform/model state
- no immediate caller changes required for existing notebooks/scripts

## Boundary ownership

To match the MCP-ready layering pattern from `modules/mcp_test/ARCHITECTURE_SUMMARY.md`
(`core -> facade -> exec -> mcp_server`), checkpoint loading responsibilities split as:

### Core ownership

- numerical model internals
- transform implementations and model forward/predict behavior
- no handle/store/agent payload concerns

### Facade ownership

- typed checkpoint and prediction-request handles
- compatibility validation for legacy load-model call shapes
- translating compatibility inputs into explicit store records

### Store ownership

- checkpoint descriptor records (model reference, checkpoint path, device)
- prediction request descriptors derived from checkpoint handles
- future persisted metadata for transform/model-spec compatibility

### Exec ownership

- compatibility planning/execution for `load_model -> predict_fn` workflow steps
- assembling runtime call context from facade/store records
- exposing a stable execution plan that MCP publication can consume later

## First shim design

### 1. Keep public `dymad.io.load_model(...)` import stable

`dymad.io.__init__` continues exporting `load_model`, but implementation moves to a
compatibility shim that delegates to facade/exec.

### 2. Introduce checkpoint compatibility descriptor

`CheckpointCompatSpec` (design target) should capture:
- `model_ref` (typed model identifier or builder reference)
- `checkpoint_path`
- `device`
- flags derived from metadata (`has_control`, `has_graph`, transform families present)

### 3. Facade registration step

Facade call (design target):
- validates shape A inputs
- creates checkpoint handle in store
- records descriptor metadata needed to rebuild callable parity

### 4. Exec materialization step

Exec call (design target):
- resolves checkpoint handle from store
- calls current legacy loader internals for model/transform hydration
- returns `(model, predict_fn)` compatibility pair

This keeps numerical behavior in legacy internals while moving ownership and state
tracking to facade/store/exec.

### 5. Prediction-request compatibility (next slice)

The existing skeleton already plans typed checkpoint -> prediction request flow in
`dymad.exec.workflow.CompatibilityExecutor.plan_checkpoint_prediction(...)`
(`src/dymad/exec/workflow.py:17-40`).

Checkpoint facade migration should reuse that plan path rather than introducing a second
parallel boundary.

## Migration sequence

### Phase 1: Design-complete boundary contract (this task)

- document legacy call shapes and required shim behavior
- define ownership split and staged shim flow

### Phase 2: Non-invasive compatibility adapter in facade/exec

- add adapter objects that wrap current `checkpoint.py` internals
- keep `dymad.io.load_model(...)` signature unchanged
- route through typed handles in facade/store before materializing runtime callable

### Phase 3: Parity verification gates

Run parity gates focusing on workflows that currently consume `load_model(...)`:

```bash
cd modules/dymad_migrate && pytest \
  tests/test_workflow_lti.py \
  tests/test_workflow_kp.py \
  tests/test_workflow_ltg.py \
  tests/test_workflow_ltga.py \
  tests/test_workflow_ker_auto.py \
  tests/test_workflow_ker_ctrl.py \
  tests/test_workflow_sa_lti.py -q
```

### Phase 4: Optional MCP publication boundary

After parity is stable, publish only facade/exec operations to MCP; MCP should not call
`core` internals or legacy checkpoint internals directly.

## Open questions

1. Should checkpoint-path fallback (`name.pt -> name/name.pt`) remain permanent behavior or be
   restricted to compatibility mode only?
2. Should `predict_fn(..., ret_dat=True)` remain part of the stable public contract, or move
   behind an explicit debug/inspection API at the facade layer?
3. How much of `DataInterface` should remain in `dymad.io` versus moving to a new facade-facing
   analysis adapter package?
