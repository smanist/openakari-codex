# DyMAD Legacy-to-Target Migration Matrix

Date: 2026-03-29
Status: initial mapping

## Purpose

Map the current legacy subsystems in `modules/dymad_ref/` to the target architecture described in `modules/dymad_migrate/tasks/refactor_target_architecture.md`.

## Matrix

| Legacy subsystem | Primary files | Target layer | Migration shape | Notes |
|---|---|---|---|---|
| Dynamic data container | `io/data.py` | `core` | split | `DynData` should become typed series/data objects rather than a single catch-all container. |
| Trajectory loading and preprocessing | `io/trajectory_manager.py` | `core` + `facade` | split | Core should keep schema/preprocess/windowing logic; facade can own user-facing dataset construction and validation boundaries. |
| Checkpoint / model loading API | `io/checkpoint.py`, `io/__init__.py` | `facade` + `store` | adapt | This is the clearest predecessor to a stable typed handle boundary. |
| Transform implementations | `transform/base.py`, `transform/lift.py`, `transform/ndr.py` | `core` | migrate | Keep transform math in core; redesign protocol as fitted `nn.Module`-style objects. |
| Transform factories and composition entrypoints | `transform/collection.py`, `transform/__init__.py` | `facade` + compatibility adapters | adapt | Keep string aliases initially as adapters over typed transform specs. |
| Model component implementations | `modules/*.py` | `core` | mostly migrate-as-is | Kernel/NN/GNN primitives look like pure implementation material. |
| Model composition and prediction | `models/model_base.py`, `models/components.py`, `models/prediction.py` | `core` | migrate | This is central core model logic once data/model specs are cleaner. |
| Predefined model recipes and collections | `models/helpers.py`, `models/recipes.py`, `models/recipes_corr.py`, `models/collections.py` | `facade` + compatibility adapters | split | The semantics should move into typed `ModelSpec`; legacy names remain as adapters. |
| Numerical primitives | `numerics/*.py` | `core` | mostly migrate-as-is | Keep pure; avoid introducing store/MCP concerns here. |
| Spectral analysis | `sako/*.py` | `core` + analysis adapters | split | Core math can stay pure, but model-loading/plotting bridges should be adapters, not entangled imports. |
| Loss functions | `losses/losses.py` | `core` | migrate-as-is | Likely stable core material with low architectural risk. |
| Training phase implementations | `training/opt_base.py`, `opt_linear.py`, `opt_node.py`, `opt_weak_form.py`, `ls_update.py`, `stacked_opt.py` | `core` | split and migrate | These map to future training phase primitives; `opt_base.py` is too large and mixed. |
| Training orchestration and CV | `training/driver.py`, `training/trainer.py`, parts of `training/helper.py` | `exec` | split | These files represent workflow control, not pure model math. |
| Sampling and control generation | `utils/sampling.py`, `utils/control.py` | `core` or `exec` helper layer | review | Keep generation logic accessible, but separate it from general utility clutter. |
| Plotting / visualization | `utils/plot.py` | outside core (`exec` / analysis tooling) | split | Plotting should not remain entangled with mathematical core packages. |
| Logging/config/scheduler helpers | `utils/misc.py`, `utils/scheduler.py` | `exec` | move or wrap | These are developer/workflow concerns, not core model concerns. |
| External wrappers | `utils/wrapper.py` | `facade` or `exec` boundary | review | Keep external runtime boundaries explicit. |

## First unresolved ownership conflicts

### Conflict 1 — `TrajectoryManager`

`TrajectoryManager` is not cleanly one layer today. It currently spans:

- raw file loading
- config interpretation
- transform fitting and state reuse
- dataset split construction
- dataloader building

Resolution direction:

- move reusable data/schema/transform/windowing logic toward `core`
- keep user-facing normalization/validation/config entrypoints near `facade`
- keep multi-step training workflow assembly in `exec`

### Conflict 2 — model recipes

The current recipes encode both:

- useful semantic model families
- brittle string-based internal dispatch

Resolution direction:

- typed model specs become the real internal API
- legacy recipe names become compatibility constructors

### Conflict 3 — spectral analysis

`sako/base.py` currently spans math, model loading, and plotting.

Resolution direction:

- preserve math/analysis kernels in `core`
- rebuild loading/reporting/plotting as adapter layers over cleaner model outputs

### Conflict 4 — checkpoint loading

`load_model` is currently a workflow-critical public boundary but does not yet resemble the future handle-oriented facade.

Resolution direction:

- preserve compatibility early
- treat checkpoint/model loading as one of the first facade-compatible surfaces

## Recommended first vertical slice

Based on the current map, the first slice should center on the data boundary:

- `DynData` replacement contract
- `TrajectoryManager` responsibility split
- transform fitting/application compatibility at that boundary

Why this slice first:

- it is upstream of regular, graph, and training workflows
- it directly addresses the biggest architectural bottleneck
- it can be validated with blocker-level trajectory-manager and transform tests before broader training refactors
