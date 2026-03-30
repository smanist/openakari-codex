# DyMAD Legacy Current-State Map

Date: 2026-03-29
Source package: `modules/dymad_ref/`
Status: initial discovery

## Scope

This note maps the current legacy package into migration-relevant subsystems. The goal is not exhaustive documentation of every class, but a stable description of responsibility boundaries, major coupling points, and the files that define the first migration seams.

## Package shape

Top-level source subpackages under `modules/dymad_ref/src/dymad/`:

- `io`
- `losses`
- `models`
- `modules`
- `numerics`
- `sako`
- `training`
- `transform`
- `utils`

Observed source footprint:

- total Python source in `src/dymad/**/*.py`: `13885` lines
- largest files:
  - `io/trajectory_manager.py` — `904`
  - `training/opt_base.py` — `695`
  - `transform/base.py` — `649`
  - `utils/sampling.py` — `628`
  - `numerics/dm.py` — `583`
  - `numerics/linalg.py` — `582`
  - `sako/base.py` — `581`
  - `utils/plot.py` — `549`
  - `io/data.py` — `523`
  - `training/driver.py` — `421`

These counts strongly suggest that `io`, `training`, `transform`, and spectral-analysis code are the highest-leverage split candidates.

## Major subsystems

### 1. Data container and trajectory preprocessing

Primary files:

- `modules/dymad_ref/src/dymad/io/data.py`
- `modules/dymad_ref/src/dymad/io/trajectory_manager.py`
- `modules/dymad_ref/src/dymad/utils/graph.py`

Current responsibility:

- `DynData` is the central time-series/graph data container.
- It handles both regular and graph data, including nested-tensor edge handling and batching behavior.
- `TrajectoryManager` does much more than loading:
  - metadata/config loading
  - transform construction and fitting
  - broadcasting/normalizing raw arrays
  - dataset indexing and splits
  - train/valid/test preparation
  - dataloader construction

Migration significance:

- This is the clearest example of the contract’s “do not keep one giant catch-all object” warning.
- `DynData` and `TrajectoryManager` should be split before higher-level API cleanup, because many other layers depend on their current mixed responsibilities.

### 2. Transform system

Primary files:

- `modules/dymad_ref/src/dymad/transform/base.py`
- `modules/dymad_ref/src/dymad/transform/collection.py`
- `modules/dymad_ref/src/dymad/transform/lift.py`
- `modules/dymad_ref/src/dymad/transform/ndr.py`

Current responsibility:

- base transform protocol and fitted transform behavior
- transform composition factory via `make_transform`
- lifting and polynomial feature transforms
- manifold / diffusion-map style transforms that depend on numerical submodules

Migration significance:

- The transform layer is already a conceptual subsystem, but it is not yet PyTorch-first in the way the target contract expects.
- It is also the current bridge between data preprocessing and numerics-heavy methods, so it is a likely early migration seam.

### 3. Model assembly and prediction

Primary files:

- `modules/dymad_ref/src/dymad/models/model_base.py`
- `modules/dymad_ref/src/dymad/models/components.py`
- `modules/dymad_ref/src/dymad/models/helpers.py`
- `modules/dymad_ref/src/dymad/models/prediction.py`
- `modules/dymad_ref/src/dymad/models/recipes.py`
- `modules/dymad_ref/src/dymad/models/recipes_corr.py`
- `modules/dymad_ref/src/dymad/models/collections.py`

Current responsibility:

- define composed-dynamics model classes
- build model components from config and type strings
- encode predefined model families such as LDM/KBF/KM/SDM variants
- provide prediction policies for continuous/discrete rollout and control interpolation

Migration significance:

- This layer already contains the semantics the future typed `ModelSpec` system should express.
- The recipes/helpers surface is currently string-map heavy and should become the compatibility layer rather than the long-term internal API.

### 4. Neural/module primitives and kernels

Primary files:

- `modules/dymad_ref/src/dymad/modules/*.py`

Current responsibility:

- neural-network building blocks (`MLP`, `GNN`, sequential models)
- linear modules
- kernel definitions
- kernel ridge regression operators
- factory/collection registries

Migration significance:

- This subsystem is mostly “pure implementation” and is a good candidate to remain in `core`.
- The main migration risk is not the math here but the string-factory surfaces that higher layers currently rely on.

### 5. Numerical algorithms

Primary files:

- `modules/dymad_ref/src/dymad/numerics/*.py`

Current responsibility:

- diffusion maps / manifold methods
- low-rank linear algebra
- weak-form utilities
- gradient helpers
- time integration
- complex/spectral helper functions

Migration significance:

- This is the purest `core` material in the current package.
- It should remain isolated from MCP/storage concerns and only be wrapped, not re-architected around external interfaces.

### 6. Spectral analysis (`sako`)

Primary files:

- `modules/dymad_ref/src/dymad/sako/base.py`
- `modules/dymad_ref/src/dymad/sako/sako.py`
- `modules/dymad_ref/src/dymad/sako/rals.py`

Current responsibility:

- spectral analysis and pseudospectrum evaluation for trained Koopman-style models
- bridges trained-model loading, numerical eigensystem utilities, resolvent analysis, and plotting

Migration significance:

- This subsystem is mathematically `core`-like, but the current implementation couples `io`, `models`, `numerics`, and plotting.
- It should migrate as an analysis adapter layer over core model outputs, not stay entangled with checkpoint loading and plotting.

### 7. Training orchestration

Primary files:

- `modules/dymad_ref/src/dymad/training/opt_base.py`
- `modules/dymad_ref/src/dymad/training/opt_linear.py`
- `modules/dymad_ref/src/dymad/training/opt_node.py`
- `modules/dymad_ref/src/dymad/training/opt_weak_form.py`
- `modules/dymad_ref/src/dymad/training/ls_update.py`
- `modules/dymad_ref/src/dymad/training/stacked_opt.py`
- `modules/dymad_ref/src/dymad/training/driver.py`
- `modules/dymad_ref/src/dymad/training/trainer.py`
- `modules/dymad_ref/src/dymad/training/helper.py`

Current responsibility:

- optimizer/trainer phase implementations
- least-squares update routines
- stacked multi-phase workflows
- CV/grid-search orchestration
- dataset preparation through `TrajectoryManager`
- trainer convenience wrappers that mutate config structure

Migration significance:

- The target architecture’s split between “phase primitives” and “execution/orchestration” is directly motivated by this subsystem.
- `opt_*` logic looks like future `core.training` material.
- `driver.py` / `trainer.py` look like future `exec` material.

### 8. Checkpointing and public loading API

Primary files:

- `modules/dymad_ref/src/dymad/io/checkpoint.py`
- `modules/dymad_ref/src/dymad/io/__init__.py`

Current responsibility:

- load model + transform state
- expose `load_model`
- expose `DataInterface`
- visualize models / checkpoint-related helpers

Migration significance:

- This is the most obvious predecessor to a future `facade` boundary.
- Workflow tests repeatedly use `load_model(...)` followed by prediction functions, so compatibility here is important.

### 9. Utilities and sampling

Primary files:

- `modules/dymad_ref/src/dymad/utils/sampling.py`
- `modules/dymad_ref/src/dymad/utils/control.py`
- `modules/dymad_ref/src/dymad/utils/scheduler.py`
- `modules/dymad_ref/src/dymad/utils/misc.py`
- `modules/dymad_ref/src/dymad/utils/plot.py`
- `modules/dymad_ref/src/dymad/utils/wrapper.py`

Current responsibility:

- config/logging helpers
- signal/control generation and interpolation
- trajectory sampling
- plotting
- scheduler construction
- wrappers for external runtimes

Migration significance:

- This is not one subsystem in the architectural sense; it is a grab-bag.
- It should be split by role:
  - sampling/control helpers that support core workflows
  - exec-facing logging/config helpers
  - plotting/visualization that should stay outside the core numerical boundary

## Coupling hotspots

### Hotspot A — `DynData` and `TrajectoryManager`

Why it matters:

- `DynData` mixes regular-series and graph-series concerns.
- `TrajectoryManager` mixes raw-data loading, transform lifecycle, split construction, and dataloader creation.
- Training drivers depend on it directly, so it is upstream of most end-to-end workflows.

### Hotspot B — string-based model construction

Why it matters:

- model recipes/helpers/collections encode a lot of domain semantics through string aliases and config mutation.
- this is the direct target for the typed model-spec migration.

### Hotspot C — training orchestration

Why it matters:

- phase logic (`opt_*`) and workflow control (`driver.py`, `trainer.py`) are currently interleaved through shared config/state conventions.
- this makes it hard to expose a stable handle-based API later.

### Hotspot D — checkpoint/load-model compatibility

Why it matters:

- end-to-end workflow tests use `load_model` as a central public entrypoint.
- if this boundary is broken, many workflows will appear to fail even if the internal math still works.

### Hotspot E — spectral analysis bridging

Why it matters:

- `sako/base.py` directly imports `dymad.io`, `dymad.models`, `dymad.numerics`, `dymad.utils`, and `dymad.sako`.
- it is a likely “adapter over core” target, not a place to preserve current entanglement.

## Initial recommendation for migration ordering

1. Define parity-critical workflows first so architectural work stays grounded.
2. Split the data boundary (`DynData` / `TrajectoryManager`) conceptually before broad model/training rewrites.
3. Define typed model-spec and training-boundary contracts after the data split is understood.
4. Treat checkpoint/load-model compatibility as a first-class facade requirement.
5. Treat spectral analysis as an adapter layer that should be rebuilt over cleaner model/data boundaries rather than preserved structurally.
