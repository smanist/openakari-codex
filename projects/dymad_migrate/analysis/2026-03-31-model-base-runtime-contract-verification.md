# Model-Base Runtime Contract Migration Checkpoint

Date: 2026-03-31
Task: Replace `model_base` legacy runtime reconstruction with typed runtime contracts

## Scope

Removed direct `DynData` reconstruction from `modules/dymad_migrate/src/dymad/models/model_base.py` by routing `ComposedDynamics.forward(...)` through a dedicated compatibility seam in `modules/dymad_migrate/src/dymad/core/model_context.py`.

## Code changes

- Added `materialize_model_base_forward_payload(...)` to `core/model_context.py`.
- Updated `models/model_base.py` to:
  - import and call `materialize_model_base_forward_payload(...)` in `forward(...)`
  - remove direct `DynData` import and reconstruction code
  - update the predict signature docstring to `ComponentInputPayload`.
- Added focused coverage:
  - `tests/test_model_context_adapter.py`
    - `test_materialize_model_base_forward_payload_regular_context`
    - `test_materialize_model_base_forward_payload_graph_context`
  - `tests/test_model_base_runtime_contract.py`
    - `test_model_base_forward_routes_through_runtime_contract`

## Findings

1. `model_base.py` now crosses exactly one explicit compatibility seam for forward runtime payload materialization.
2. The seam preserves both regular and graph forward payload shapes while returning typed `RegularModelContext`/`GraphModelContext` objects.
3. The project-wide textual `DynData` reference count is unchanged at `87`; this task moved one runtime reconstruction site but did not attempt broader retirement.

## Verification

### 1) No direct `DynData` reconstruction/import in `model_base.py`

Command:

```bash
rg -n "DynData\\.collate|DynData\\(|from dymad\\.io\\.data import DynData|\\bDynData\\b" modules/dymad_migrate/src/dymad/models/model_base.py
```

Output:

```text
(no output)
```

### 2) Seam wiring present in model base and model context

Command:

```bash
rg -n "materialize_model_base_forward_payload|ComponentInputPayload" modules/dymad_migrate/src/dymad/models/model_base.py modules/dymad_migrate/src/dymad/core/model_context.py
```

Output:

```text
modules/dymad_migrate/src/dymad/core/model_context.py:166:def materialize_model_base_forward_payload(
modules/dymad_migrate/src/dymad/models/model_base.py:7:from dymad.core.model_context import materialize_model_base_forward_payload
modules/dymad_migrate/src/dymad/models/model_base.py:8:from dymad.models.runtime_view import ComponentInputPayload
modules/dymad_migrate/src/dymad/models/model_base.py:11:Encoder = Callable[[nn.Module, ComponentInputPayload], torch.Tensor]
modules/dymad_migrate/src/dymad/models/model_base.py:14:Features = Callable[[torch.Tensor, ComponentInputPayload], torch.Tensor]
modules/dymad_migrate/src/dymad/models/model_base.py:17:Composer = Callable[[nn.Module, torch.Tensor, torch.Tensor, ComponentInputPayload], torch.Tensor]
modules/dymad_migrate/src/dymad/models/model_base.py:20:Decoder = Callable[[nn.Module, torch.Tensor, ComponentInputPayload], torch.Tensor]
modules/dymad_migrate/src/dymad/models/model_base.py:23:Predictor = Callable[[torch.Tensor, ComponentInputPayload, Union[np.ndarray, torch.Tensor], Any], Tuple[torch.Tensor, torch.Tensor]]
modules/dymad_migrate/src/dymad/models/model_base.py:62:    - `predict(x0: torch.Tensor, w: ComponentInputPayload, ts: Union[np.ndarray, torch.Tensor], **kwargs) -> Tuple[torch.Tensor, torch.Tensor]`
modules/dymad_migrate/src/dymad/models/model_base.py:166:        w = materialize_model_base_forward_payload(t=t, x=x, u=u, p=p, ei=ei, ew=ew, ea=ea)
modules/dymad_migrate/src/dymad/models/model_base.py:172:    def encoder(self, w: ComponentInputPayload) -> torch.Tensor:
modules/dymad_migrate/src/dymad/models/model_base.py:176:    def dynamics(self, z: torch.Tensor, w: ComponentInputPayload) -> torch.Tensor:
modules/dymad_migrate/src/dymad/models/model_base.py:184:    def decoder(self, z: torch.Tensor, w: ComponentInputPayload) -> torch.Tensor:
modules/dymad_migrate/src/dymad/models/model_base.py:188:    def linear_eval(self, w: ComponentInputPayload) -> Tuple[torch.Tensor, torch.Tensor]:
modules/dymad_migrate/src/dymad/models/model_base.py:197:    def linear_features(self, w: ComponentInputPayload) -> Tuple[torch.Tensor, torch.Tensor]:
modules/dymad_migrate/src/dymad/models/model_base.py:220:    def predict(self, x0: torch.Tensor, w: ComponentInputPayload, ts: Union[np.ndarray, torch.Tensor],
```

### 3) Focused adapter + workflow gate run

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_context_adapter.py tests/test_component_runtime_view.py tests/test_model_base_runtime_contract.py tests/test_workflow_lti.py -q
```

Output:

```text
24 passed, 2 warnings in 10.70s
```

Raw output log:
- `projects/dymad_migrate/analysis/2026-03-31-model-base-runtime-contract-pytest.log`

### 4) Current remaining DynData textual-reference count

Command:

```bash
rg -n "\\bDynData\\b" modules/dymad_migrate/src/dymad -g '*.py' | wc -l
```

Output:

```text
87
```
