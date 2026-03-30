# DyMAD Training Layer Design

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `projects/dymad_migrate/architecture/migration-matrix.md`
- `projects/dymad_migrate/architecture/model-spec-design.md`
- `modules/dymad_migrate/tasks/refactor_target_architecture.md`

## Purpose

Define the training-stack split that replaces the current overlap between optimizer phases, run state, checkpoint state, data loaders, CV orchestration, and convenience trainer wrappers.

This document answers:
1. what hierarchy should training own?
2. how should phase primitives differ from workflow orchestration?
3. which legacy entrypoints migrate first?

## Problems in the legacy design

The current training layer concentrates too many concerns in a few places:

- `RunState` mixes checkpointable artifacts with live loaders, datasets, optimizers, criteria, and execution state
- `OptBase` owns model setup, optimizer/scheduler/criteria setup, checkpointing, history, LS update, and loop control
- `StackedOpt` sequences phases but passes around a coarse `RunState`
- `DriverBase` and `SingleSplitDriver` handle CV/grid-search orchestration plus trajectory-manager creation
- `trainer.py` mutates config into synthetic `phases` for convenience wrappers

Representative legacy entrypoints:

- `modules/dymad_ref/src/dymad/training/helper.py:9`
- `modules/dymad_ref/src/dymad/training/opt_base.py:19`
- `modules/dymad_ref/src/dymad/training/driver.py:37`
- `modules/dymad_ref/src/dymad/training/stacked_opt.py:26`
- `modules/dymad_ref/src/dymad/training/trainer.py:10`

## Required hierarchy

Adopt the hierarchy already implied by the target contract:

- `CVDriver`
- `TrainerRun`
- `PhasePipeline`
- `Phase`

### `CVDriver`

Responsibilities:

- parameter-grid expansion
- fold enumeration
- parallel scheduling of independent runs
- aggregation of fold metrics

Must not own:

- model internals
- phase implementations
- direct transform fitting details

### `TrainerRun`

Represents one concrete training run and its persistent artifacts.

Responsibilities:

- own run identity and artifact locations
- own checkpointable run state
- coordinate one `PhasePipeline`
- expose final metrics and artifacts

### `PhasePipeline`

Responsibilities:

- sequence phases
- pass typed artifacts from one phase to the next
- maintain `PhaseContext`
- capture phase-by-phase history

### `Phase`

First-class phase categories:

- `OptimizerPhase`
- `DataPhase`
- `AnalysisPhase`
- `ExportPhase`

This explicitly lifts things like LS update, smoother output generation, denoising, and export/report phases out of hidden side effects.

## State split

### `TrainerState`

Checkpointable, persistent artifacts only:

- model weights
- learned transform state
- typed intermediate artifacts
- best metrics
- phase history
- checkpoint metadata

### `PhaseContext`

Per-run/per-phase working state:

- active datasets/batches
- current phase config
- current artifact registry handles
- references to execution services

### `ExecutionServices`

Non-checkpointable services:

- logger
- scheduler factory
- device policy
- timing / progress sinks

This replaces the current pattern where one object effectively owns everything.

## Phase design

### `OptimizerPhase`

Examples:

- NODE optimization
- weak-form optimization
- linear solve optimization

Contract:

- consume typed inputs (`SeriesBatch`, model, prior artifacts)
- produce updated model and metrics
- optionally emit intermediate artifacts

### `DataPhase`

Examples:

- smoothing
- denoising
- latent encoding precomputation
- windowing / repacking

Contract:

- consume dataset/model artifacts
- produce typed data artifacts such as `SmoothedLatentSeries`

### `AnalysisPhase`

Examples:

- spectral analysis prep
- validation metrics over stored artifacts

### `ExportPhase`

Examples:

- checkpoint export
- artifact packaging
- report serialization

## Linear solve and LS updates

The migration contract explicitly says linear solve must not stay hidden inside other optimizers.

Decision for training design:

- model LS updates as explicit `OptimizerPhase` variants
- allow phase pipelines like:
  - `DataPhase(smoothing)`
  - `OptimizerPhase(linear_solve)`
  - `OptimizerPhase(node_update)`

This is cleaner than the current `ls_update` config flags buried inside `OptBase`.

## Legacy-to-target mapping

| Legacy element | Target role |
|---|---|
| `RunState` | split into `TrainerState` + `PhaseContext` + execution services |
| `OptBase` | abstract `OptimizerPhase` base + shared utilities |
| `OptNODE`, `OptWeakForm`, `OptLinear` | concrete `OptimizerPhase` implementations |
| `StackedOpt` | `PhasePipeline` |
| `DriverBase`, `SingleSplitDriver` | `CVDriver` / run launcher |
| `trainer.py` wrappers | compatibility constructors over `TrainerRun` / `PhasePipeline` |

## First migration targets

### Phase 1 — state split on paper

- define `TrainerState`, `PhaseContext`, and typed artifact flow
- keep legacy `RunState` as an adapter

### Phase 2 — explicit phase pipeline

- convert `StackedOpt` semantics into `PhasePipeline`
- retain existing phase configs through adapters

### Phase 3 — driver split

- move grid/fold orchestration to `CVDriver`
- move concrete run ownership to `TrainerRun`

### Phase 4 — shrink `OptBase`

- move checkpoint/history/criteria wiring to reusable helpers
- leave phase implementations focused on their real optimization logic

## Exact legacy call sites to migrate first

1. `modules/dymad_ref/src/dymad/training/helper.py:9`
   `RunState` should be split conceptually first.
2. `modules/dymad_ref/src/dymad/training/driver.py:37`
   `_build_data_state(...)` currently packages data-only `RunState`.
3. `modules/dymad_ref/src/dymad/training/driver.py:338`
   `SingleSplitDriver` is the current run-level orchestration shell.
4. `modules/dymad_ref/src/dymad/training/stacked_opt.py:26`
   `StackedOpt` is the direct predecessor of `PhasePipeline`.
5. `modules/dymad_ref/src/dymad/training/opt_base.py:19`
   `OptBase` is the core mixed-responsibility object to shrink.
6. `modules/dymad_ref/src/dymad/training/trainer.py:10`
   convenience trainers should become compatibility wrappers, not structural anchors.

## Verification gates

Primary workflow gates:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_lti.py tests/test_workflow_kp.py -q
```

Phase/analysis follow-up gate:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_sa_lti.py -q
```

## Open questions

1. Should `TrainerRun` own artifact paths directly, or should a later facade/store layer inject those paths?
2. Which typed intermediate artifacts should become mandatory in the first milestone: smoothed latents, encoded series, denoised deltas, or LS linearization bundles?
3. Should criteria definitions live inside `OptimizerPhase` configs only, or be shareable reusable specs across phases?
