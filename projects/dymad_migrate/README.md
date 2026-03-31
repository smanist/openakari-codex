# DyMAD Migration

Status: active
Mission: Refactor DyMAD into a layered, extensible architecture that preserves parity-critical legacy behavior while creating a clean path to typed APIs, staged training workflows, and future MCP exposure.
Done when: `modules/dymad_migrate/` documents and implements the agreed `core` / `facade` / `store` / `exec` boundaries, preserves the selected parity-critical legacy workflows against `modules/dymad_ref/`, and exposes at least one verified end-to-end path that matches the MCP layering pattern described by `modules/mcp_test/ARCHITECTURE_SUMMARY.md`.

## Context

The execution target for this project is `modules/dymad_migrate/`, which is registered in `modules/registry.yaml`.

This migration uses three module roles:
- `modules/dymad_ref/` is the frozen reference package. It is read-only and serves as the behavioral oracle during migration.
- `modules/dymad_migrate/` is the writable migration target.
- `modules/mcp_test/` is a read-only architecture reference for the `core -> facade -> exec -> mcp_server` layering pattern.

The primary architecture contract for the migration currently lives in `modules/dymad_migrate/tasks/refactor_target_architecture.md`. That document defines the target layering, typed-data direction, transform redesign, typed model specs, training split, and MCP boundary rules. This project exists to convert that contract into persistent Akari memory, bounded tasks, and verified migration steps.

The immediate risk is not lack of architectural direction; it is loss of migration context across sessions. Akari needs a project-local README, plan, and task queue so Codex can work incrementally without re-deriving the same decisions every time.

## Working rules

- `modules/dymad_ref/` remains the behavioral oracle and is still read-only.
- `modules/mcp_test/` remains a read-only architecture reference.
- New code in `modules/dymad_migrate/` must target typed series, typed model contexts, or typed trainer batches.
- New `DynData` dependencies are not allowed outside the temporary retirement boundaries recorded in `projects/dymad_migrate/architecture/dyndata-retirement-inventory.md`.

## Log

### 2026-03-31 - Routed model_base forward runtime through explicit typed seam

Ran `/orient dymad_migrate` and selected:
`Replace model_base legacy runtime reconstruction with typed runtime contracts`.

Orient highlights:
- findings-first gate remains enabled from recent scheduler history (`0/10` non-zero findings sessions)
- approval queue is empty
- `dymad_migrate` has no project-local `budget.yaml`/`ledger.yaml` gate for this zero-resource implementation task
- task claim succeeded:
  `claimId=7a64b50ce768dda8` (`SESSION_ID=work-session-mne14l2o`)

Scope classification:
- structural (verifiable) implementation, `consumes_resources: false`

Code changes:
- added `materialize_model_base_forward_payload(...)` in `modules/dymad_migrate/src/dymad/core/model_context.py` as the explicit compatibility seam for model-base forward payloads
- updated `modules/dymad_migrate/src/dymad/models/model_base.py` to remove direct `DynData` reconstruction and route `forward(...)` through the seam
- added focused regression coverage in:
  - `modules/dymad_migrate/tests/test_model_context_adapter.py`
  - `modules/dymad_migrate/tests/test_model_base_runtime_contract.py`

Artifacts added:
- `projects/dymad_migrate/analysis/2026-03-31-model-base-runtime-contract-verification.md`
- `projects/dymad_migrate/analysis/2026-03-31-model-base-runtime-contract-pytest.log`

Artifacts updated:
- `projects/dymad_migrate/TASKS.md`

Findings:
- `model_base.py` now crosses one explicit compatibility seam instead of rebuilding `DynData` inline
- regular and graph forward payload materialization is now centralized in `core/model_context.py`
- project-wide textual `DynData` reference count remains `87` after this task (`rg -n "\\bDynData\\b" ... | wc -l`)

Task status:
- completed `Replace model_base legacy runtime reconstruction with typed runtime contracts`

Verification:
- `rg -n "DynData\\.collate|DynData\\(|from dymad\\.io\\.data import DynData|\\bDynData\\b" modules/dymad_migrate/src/dymad/models/model_base.py`
  - no output
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_context_adapter.py tests/test_component_runtime_view.py tests/test_model_base_runtime_contract.py tests/test_workflow_lti.py -q`
  - `24 passed, 2 warnings in 10.70s`

Compound:
- `Compound (fast): no actions.`
- fleet spot-check result: `Fleet: no recent sessions.`

Session-type: autonomous
Duration: 47 minutes
Task-selected: Replace `model_base` legacy runtime reconstruction with typed runtime contracts
Task-completed: yes
Approvals-created: 0
Files-changed: 8
Commits: 3
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 - Retired direct DynData construction from prediction runtime prep

Ran `/orient dymad_migrate` and selected:
`Replace models/prediction.py direct DynData construction with typed runtime payloads`.

Orient highlights:
- findings-first gate remains enabled from scheduler work-cycle history:
  `0/10` non-zero findings sessions
- approval queue is empty
- `dymad_migrate` has no project-local `budget.yaml`/`ledger.yaml` gates for this
  zero-resource implementation step
- task claim succeeded:
  `claimId=faa1812d6d2d82ee` (`SESSION_ID=work-session-mndyzf16`)

Scope classification:
- structural (verifiable) implementation, `consumes_resources: false`

Code changes:
- added `ModelRuntimePayload` and `materialize_prediction_runtime(...)` to
  `modules/dymad_migrate/src/dymad/core/model_context.py` as the explicit
  prediction compatibility seam
- updated `modules/dymad_migrate/src/dymad/models/prediction.py` to consume
  `ModelRuntimePayload | None` and route `_prepare_data(...)` through the seam
  instead of direct `DynData()` / `DynData.collate(...)`
- added focused adapter tests in
  `modules/dymad_migrate/tests/test_model_context_adapter.py`

Artifacts added:
- `projects/dymad_migrate/analysis/2026-03-30-prediction-runtime-retirement.md`
- `projects/dymad_migrate/analysis/2026-03-30-prediction-runtime-retirement-pytest.log`

Artifacts updated:
- `projects/dymad_migrate/TASKS.md`

Findings:
- `models/prediction.py` now contains no direct legacy-runtime construction or
  collate calls (verified via `rg`)
- prediction runtime prep now accepts typed model contexts directly while
  preserving legacy payload support behind one compatibility seam
- current source scan reports `87` textual `DynData` references across
  `modules/dymad_migrate/src/dymad` (`rg ... | wc -l`)

Task status:
- completed `Replace models/prediction.py direct DynData construction with typed runtime payloads`

Verification:
- `rg -n "DynData\\.collate|DynData\\(|from dymad\\.io import DynData|ws: DynData" modules/dymad_migrate/src/dymad/models/prediction.py`
  - no output
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_context_adapter.py tests/test_regular_slice_integration.py tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q`
  - `64 passed, 2 warnings in 54.06s`
- `rg -n "\\bDynData\\b" modules/dymad_migrate/src/dymad -g '*.py' | wc -l`
  - `87`

Compound:
- `Compound (fast): no actions.`
- fleet spot-check result: `Fleet: no recent sessions.`

Session-type: autonomous
Duration: 38 minutes
Task-selected: Replace `models/prediction.py` direct `DynData` construction with typed runtime payloads
Task-completed: yes
Approvals-created: 0
Files-changed: 8
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 - Verified DynData-retired regular and graph workflow gates

Ran `/orient dymad_migrate` and selected the highest-value open task:
`Verify the DynData-retired regular and graph workflow gates`.

Orient highlights:
- findings-first gate trigger remains active from scheduler work-cycle history:
  `0/10` sessions with non-zero (`newExperimentFindings + logEntryFindings`)
- task-claim API was unavailable (`curl` exit `7`, HTTP `000`), so execution
  proceeded via SOP fallback

Scope classification:
- routine analysis, `consumes_resources: false` (no external API/model calls,
  no GPU, no long-running detached compute)

Artifacts added:
- `projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gate-verification.md`
- `projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gates-pytest.log`

Artifacts updated:
- `projects/dymad_migrate/TASKS.md`

Findings:
- migration package gate result on the selected regular+graph workflows:
  `56 passed, 2 warnings in 55.11s`
- comparison baseline from
  `projects/dymad_migrate/analysis/2026-03-30-model-runtime-parity-gates.md`:
  `56 passed, 2 warnings in 61.80s`
- pass/warning counts are unchanged from baseline; no workflow regression detected
  for this checkpoint

Task status:
- completed `Verify the DynData-retired regular and graph workflow gates`

Verification:
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q`
  - `56 passed, 2 warnings in 55.11s`
- `rg -n "56 passed, 2 warnings" projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gates-pytest.log projects/dymad_migrate/analysis/2026-03-30-model-runtime-parity-gates.md`
  - confirmed baseline and current summaries in both artifacts

Session-type: autonomous
Duration: 28 minutes
Task-selected: Verify the DynData-retired regular and graph workflow gates
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 - Added the post-checkpoint DynData retirement execution queue

Captured the next technical tasks after checkpoint and `DataInterface` stopped
constructing `DynData` directly.

Artifacts added:
- `projects/dymad_migrate/plans/2026-03-30-post-checkpoint-dyndata-retirement-queue.md`

Artifacts updated:
- `projects/dymad_migrate/TASKS.md`

Findings:
- the remaining retirement blockers are now concentrated in prediction helpers, model-base runtime reconstruction, recipe signatures, the remaining trainer families, and a small number of utility/public-export seams
- deletion should not be attempted yet; the right next move is to shrink the runtime contract in `models/prediction.py` and `models/model_base.py`
- public export removal and `io/data.py` deletion should be treated as end-state cleanup, not forcing moves

Task status:
- added the next execution queue for post-checkpoint `DynData` retirement

Verification:
- `rg -n "\\bDynData\\b" modules/dymad_migrate/src/dymad -g '*.py'`
  - reviewed remaining hotspots for queue decomposition
- `git diff --check -- projects/dymad_migrate`
  - no output

### 2026-03-30 - Removed direct DynData construction from checkpoint utilities and DataInterface

Completed the next retirement execution task after the first typed trainer-family migration.

Code changes:
- updated `modules/dymad_migrate/src/dymad/io/checkpoint.py` so regular and graph checkpoint prediction payloads are built from typed series/model contexts before crossing the temporary legacy runtime seam
- removed direct `DynData` construction and `DynData.collate` use from migrated `DataInterface` setup paths by switching to `TrajectoryManager.process_all(typed=True)`
- narrowed the remaining compatibility boundary in `checkpoint.py` to the explicit `DynDataAdapter` hop used by the learned encoder path
- updated `DataInterface.apply_obs(...)` to use typed trainer-batch accessors instead of legacy field access

Artifacts added:
- `projects/dymad_migrate/analysis/2026-03-30-checkpoint-datainterface-typed-boundary-verification.md`

Findings:
- `checkpoint.py` no longer directly imports or constructs `DynData` on the migrated regular and graph prediction paths
- `DataInterface` now consumes typed trajectory-manager outputs instead of reconstructing legacy runtime batches locally
- the remaining compatibility use in this file is explicit and deletion-stage only: `DynDataAdapter` still exists solely to satisfy the learned encoder interface

Task status:
- completed `Remove direct DynData construction from checkpoint utilities and DataInterface`

Verification:
- `rg -n "DynData\\(|DynData\\.collate|from dymad\\.io\\.data import DynData|from dymad\\.io import DynData" modules/dymad_migrate/src/dymad/io/checkpoint.py`
  - no output
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_slice_integration.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py tests/test_assert_di.py -q`
  - `7 passed, 2 warnings in 0.69s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_kp.py tests/test_workflow_ltg.py -q`
  - `27 passed, 2 warnings in 33.20s`

### 2026-03-30 - Migrated the first trainer family to typed batches

Completed the next retirement execution task after typed dataloader emission.

Code changes:
- added `modules/dymad_migrate/src/dymad/training/batch_adapter.py` as the narrow training-side batch normalization seam
- updated `modules/dymad_migrate/src/dymad/training/ls_update.py` so linear-feature and evaluation helpers accept typed trainer batches
- updated `modules/dymad_migrate/src/dymad/training/opt_linear.py` so the linear trainer accepts typed batches directly
- updated `modules/dymad_migrate/src/dymad/training/driver.py` so pure `Linear` phases request typed loaders while keeping legacy trajectory datasets for prediction-criterion evaluation
- added focused coverage in `modules/dymad_migrate/tests/test_linear_typed_batch_driver.py`

Artifacts added:
- `projects/dymad_migrate/analysis/2026-03-30-linear-trainer-typed-batch-verification.md`

Findings:
- the first trainer family now consumes typed regular and graph batches without widening the compatibility boundary into unrelated modules
- enabling typed loaders only for pure `Linear` phases is the correct intermediate cut; mixed stacks should remain legacy until their trainer consumers migrate
- keeping dataset objects legacy while moving only the dataloader batches preserves prediction-criterion evaluation without blocking the retirement queue

Task status:
- completed `Replace trainer batch consumption in the first optimizer family`

Verification:
- `python -m compileall modules/dymad_migrate/src/dymad/training/batch_adapter.py modules/dymad_migrate/src/dymad/training/ls_update.py modules/dymad_migrate/src/dymad/training/opt_linear.py modules/dymad_migrate/src/dymad/training/driver.py modules/dymad_migrate/tests/test_linear_typed_batch_driver.py`
  - completed without error
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_linear_typed_batch_driver.py tests/test_typed_trainer_batches.py -q`
  - `4 passed, 2 warnings in 0.72s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_ltg.py -q`
  - `31 passed, 2 warnings in 33.72s`

### 2026-03-30 - Added typed trainer-batch emission in TrajectoryManager

Completed the first retirement execution step after the planning queue closed.

Code changes:
- added `modules/dymad_migrate/src/dymad/core/trainer_batch.py` with `RegularTrainerBatch` and `GraphTrainerBatch`
- updated `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` so `process_data(...)`, `process_all(...)`, and `create_dataloaders(...)` support `typed=True`
- preserved the legacy default path while storing typed datasets in parallel so the new batch path can be exercised safely
- added focused coverage in `modules/dymad_migrate/tests/test_typed_trainer_batches.py`

Artifacts added:
- `projects/dymad_migrate/analysis/2026-03-30-typed-trainer-batch-emission-verification.md`

Findings:
- regular and graph trajectory managers can now emit typed trainer batches without `DynData.collate` on the new path
- graph typed batching no longer needs the legacy pre-collated `batch_size=1` workaround on that path
- the next real blocker is trainer consumption, not dataloader emission

Task status:
- completed `Make TrajectoryManager emit typed batches on the new path`

Verification:
- `python -m compileall modules/dymad_migrate/src/dymad/core/trainer_batch.py modules/dymad_migrate/src/dymad/io/trajectory_manager.py modules/dymad_migrate/tests/test_typed_trainer_batches.py`
  - completed without error
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_typed_trainer_batches.py tests/test_regular_series_adapter.py tests/test_graph_series_adapter.py -q`
  - `6 passed, 2 warnings in 0.75s`

### 2026-03-30 - Started the DynData retirement queue

Persisted the retirement baseline and the first execution contract after the
model-runtime slice closed.

Artifacts added:
- `projects/dymad_migrate/architecture/dyndata-retirement-inventory.md`
- `projects/dymad_migrate/architecture/dyndata-batch-contract-design.md`

Artifacts updated:
- `projects/dymad_migrate/plans/2026-03-30-dyndata-retirement-centered-path.md`

Findings:
- `DynData` still appears in 18 production-source files and 103 textual references
  across `modules/dymad_migrate/src/dymad`
- the main deletion bottleneck is no longer public prediction entrypoints; it is the
  batch boundary in `trajectory_manager.py`, `DataInterface`, and trainer consumers
- the narrowest first typed-batch execution target is `opt_linear` plus `ls_update`,
  after `TrajectoryManager` stops emitting `DynData`

Task status:
- completed `Inventory the remaining DynData dependency surface after Phase 1`
- completed `Define the phased DynData retirement plan and cutoff rules`
- completed `Add a no-new-DynData dependency policy to the project record`
- completed `Define the first dataloader/batch replacement targets for post-runtime retirement`

Verification:
- `rg -n "\\bDynData\\b" modules/dymad_migrate/src/dymad -g '*.py'`
  - `18` files, `103` textual references
- `git diff --check -- projects/dymad_migrate`
  - no output

### 2026-03-30 — Finished the last two model-runtime tasks

Completed the remaining runtime queue before the planned `DynData` retirement shift.

Code changes:
- added `modules/dymad_migrate/src/dymad/models/runtime_view.py` as the narrow helper-facing runtime adapter
- updated `modules/dymad_migrate/src/dymad/models/components.py` so encoder, decoder, feature, and graph composer helpers read through the runtime-view adapter instead of directly indexing `DynData`
- aligned `modules/dymad_migrate/src/dymad/models/model_base.py` signatures with the broader runtime payload type
- added focused helper coverage in `modules/dymad_migrate/tests/test_component_runtime_view.py`

Artifacts added:
- `projects/dymad_migrate/analysis/2026-03-30-model-runtime-parity-gates.md`

Findings:
- helper-level `DynData` field access in `components.py` can be removed without regressing the current regular/graph workflow gates
- the selected runtime parity gates match the current reference baseline exactly:
  - `modules/dymad_migrate`: `56 passed, 2 warnings in 61.80s`
  - `modules/dymad_ref`: `56 passed, 2 warnings in 61.77s`
- the model-runtime seam now has enough evidence to mark it `verified` in the migration scoreboard

Task status:
- completed `Split model helper/components away from direct DynData field access`
- completed `Record regular and graph prediction parity gates for the typed model-runtime boundary`

Verification:
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_component_runtime_view.py tests/test_model_context_adapter.py -q`
  - `4 passed, 2 warnings in 0.66s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q`
  - `56 passed, 2 warnings in 61.80s`
- `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q`
  - `56 passed, 2 warnings in 61.77s`

### 2026-03-30 — Re-centered the post-runtime plan on DynData retirement

Recorded a new sequencing decision for the case where spectral-analysis and the broader
training architecture are both deferred.

Decision:
- after the remaining two runtime tasks, the next major focus can be `DynData` retirement
- this is viable only as a data-object replacement campaign, not as a full training redesign

Scope rule:
- narrow edits across model, prediction, training, checkpoint, and dataloader are allowed
- broader training-architecture work, spectral-analysis, and model-spec migration stay deferred

Artifacts added:
- `projects/dymad_migrate/plans/2026-03-30-dyndata-retirement-centered-path.md`
- a new `DynData retirement execution tasks` section in `projects/dymad_migrate/TASKS.md`

### 2026-03-30 — Routed the first graph checkpoint prediction path through typed model context

Completed the graph-side twin of the regular runtime task.

Code changes:
- updated `modules/dymad_migrate/src/dymad/io/checkpoint.py` so the public single-graph prediction path now builds transformed typed graph series, materializes `GraphModelContext`, and crosses the temporary compatibility boundary through `to_legacy_runtime()`
- added focused graph routing coverage in `modules/dymad_migrate/tests/test_regular_slice_integration.py`
- kept nested batched graph edge-index payloads (`list[list[edge_index]]`) on the legacy path for now so the first graph slice stays narrow and workflow-safe

Findings:
- the current graph workflow gates (`ltg`, `ltga`) are satisfied with a typed context boundary on the single-graph public path
- graph runtime needs a dedicated node-wise transform step before context construction; the regular batch path is not reusable as-is
- preserving the nested-list graph fallback is the right temporary compromise: it avoids widening this slice while still migrating the workflow-critical public path

Task status:
- completed `Route one graph prediction path through the typed model context`

Verification:
- `python -m compileall modules/dymad_migrate/src/dymad/io/checkpoint.py modules/dymad_migrate/tests/test_regular_slice_integration.py`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_slice_integration.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py -q`
  - `6 passed, 2 warnings in 0.72s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q`
  - `30 passed, 2 warnings in 37.92s`

Immediate next task:
- split model helper/components away from direct `DynData` field access

### 2026-03-30 — Routed the first regular checkpoint prediction path through typed model context

Completed the next model-runtime task after the boundary/adapters landed.

Code changes:
- updated `modules/dymad_migrate/src/dymad/io/checkpoint.py` so the non-graph `predict_fn(...)` path now builds a typed regular series batch, materializes `RegularModelContext`, and crosses the temporary compatibility boundary through `to_legacy_runtime()`
- added a focused regression in `modules/dymad_migrate/tests/test_regular_slice_integration.py` that proves the checkpoint-backed regular prediction path now routes through `RegularModelContext`
- removed the now-unused direct regular `DynData` assembly helper from `checkpoint.py`

Findings:
- the regular checkpoint path can move to typed runtime context without changing the existing workflow gate
- the import-cycle risk is at `checkpoint -> core -> model_context -> io`; the correct fix is lazy legacy imports inside `model_context.py`, not widening package-level imports
- the compatibility boundary is still narrow: only `RegularModelContext.to_legacy_runtime()` constructs the legacy runtime payload for this path

Task status:
- completed `Route one regular prediction path through the typed model context`

Verification:
- `python -m compileall modules/dymad_migrate/src/dymad/core/model_context.py modules/dymad_migrate/src/dymad/io/checkpoint.py modules/dymad_migrate/tests/test_regular_slice_integration.py`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_slice_integration.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py -q`
  - `5 passed, 2 warnings in 0.60s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py -q`
  - `15 passed, 2 warnings in 12.94s`

Immediate next task:
- route one graph prediction path through the typed model context

### 2026-03-30 — Designed the typed model-runtime boundary and landed the first model-context adapter

Completed the first two tasks in the post-data/transform module queue.

Artifacts added:
- `projects/dymad_migrate/architecture/model-runtime-boundary-design.md`
- `modules/dymad_migrate/src/dymad/core/model_context.py`
- `modules/dymad_migrate/tests/test_model_context_adapter.py`

Code updates:
- exported the new runtime-context surface from `modules/dymad_migrate/src/dymad/core/__init__.py`
- tightened `modules/dymad_migrate/src/dymad/io/series_adapter.py` so fixed-topology graph edge payloads round-trip through the temporary legacy adapter without shape loss

Findings:
- the right next runtime seam is `typed series batch -> typed model context -> temporary DynData adapter -> legacy model internals`
- graph runtime needs two distinct views at once:
  - a batch-major flattened initial-state view for public prediction entrypoints
  - an aggregated single-graph legacy view for existing graph helper internals
- the graph adapter verification exposed a real fixed-edge payload round-trip bug, and the narrow compatibility adapter is the correct place to absorb it for now

Task status:
- completed `Design the typed model-runtime boundary after data/transform`
- completed `Introduce a typed model context adapter for regular and graph series`

Verification:
- `python -m compileall modules/dymad_migrate/src/dymad/io/series_adapter.py modules/dymad_migrate/src/dymad/core/model_context.py modules/dymad_migrate/tests/test_model_context_adapter.py`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_context_adapter.py -q`
  - `2 passed, 2 warnings in 0.66s`

Immediate next tasks:
- route one regular prediction path through the typed model context
- then route one graph prediction path through the typed model context

### 2026-03-30 — Selected model runtime / prediction as the next module after data/transform

Recorded the next module boundary after the completed Phase 1 data/transform migration.

Decision:
- the next active module migration is `model runtime / prediction`
- `DynData` retirement remains a separate planning queue, not the active execution queue

Why:
- prediction is the narrowest remaining layer that still depends directly on `DynData`
- it sits between the completed typed data/transform work and the later training redesign
- it establishes one typed execution path before broader trainer changes

Artifacts added:
- `projects/dymad_migrate/plans/2026-03-30-model-runtime-next-module-and-dyndata-retirement.md`
- new task sections in `projects/dymad_migrate/TASKS.md` for:
  - model runtime / prediction migration
  - `DynData` retirement planning

Immediate next tasks:
- design the typed model-runtime boundary
- introduce typed model-context adapters for regular and graph series
- route one regular and one graph prediction path through the typed model context

### 2026-03-30 — Finished the explicit NDR adapter boundary and removed hidden checkpoint/load transform construction

Completed the remaining Phase 1 data/transform boundary work for:

- explicit NDR adapters under the Torch-first transform contract
- central transform construction for typed and checkpoint/load paths
- narrow graph edge-field compatibility wrappers where the legacy per-step edge contract still matters

Code changes:
- added `modules/dymad_migrate/src/dymad/core/transform_builder.py` as the single transform-construction/export boundary
- added `NDRTransformModuleAdapter` in `modules/dymad_migrate/src/dymad/core/transform_module.py`
- updated `modules/dymad_migrate/src/dymad/core/torch_transforms.py` so `ComposeTransform` aggregates invertibility and gradient metadata from child stages
- updated `modules/dymad_migrate/src/dymad/io/checkpoint.py` to build typed transform modules through the new boundary instead of direct hidden legacy reconstruction
- updated `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` so graph/regular typed pipelines use builder-constructed modules and graph edge fields use explicit legacy adapters only at the typed compatibility boundary
- added `modules/dymad_migrate/tests/test_transform_builder.py` for NDR wrapper parity and metadata assertions

Task status:
- completed `Wrap NDR transforms behind explicit Torch/autodiff adapters`
- completed `Remove hidden legacy transform construction from loaders/checkpoint paths`
- completed `Record data/transform migration verification gates and update the scoreboard`

Findings:
- the right boundary for NDR in Phase 1 is not a native Torch rewrite; it is a typed adapter with explicit `supports_gradients="false"` and `invertibility="approximate"`
- graph `edge_weight` cannot share the same native tensor-field contract as `state` or `control`; it must preserve the legacy per-step `[E, 1]` transform contract behind a narrow adapter to avoid changing scaling semantics
- checkpoint/load paths now have one central transform-construction boundary instead of scattered `make_transform(...)` calls

Verification:
- `git diff --check -- projects/dymad_migrate modules/dymad_migrate` ->
  - no output
- `python -m compileall /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/core /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io/checkpoint.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io/trajectory_manager.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_transform_builder.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_regular_slice_integration.py` ->
  - completed without error
- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_transform_builder.py tests/test_regular_slice_integration.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py tests/test_assert_trajmgr_graph.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q` ->
  - `19 passed, 1268 warnings in 1.23s`

Added verification note:
- `projects/dymad_migrate/analysis/2026-03-30-data-transform-boundary-verification.md`

### 2026-03-30 — Verified graph transform routing on the typed pipeline and finished the built-in native transform family

Completed the remaining Phase 1 work for graph-compatible transform routing and the
built-in native non-NDR transform family.

Code changes:
- added `LegacyTransformModuleAdapter` in `modules/dymad_migrate/src/dymad/core/transform_module.py` so fitted legacy transforms can run behind the new typed pipeline while downstream modules still depend on legacy state dicts
- added native `LiftTransform` support for built-in `poly` and `mixed` lift families in `modules/dymad_migrate/src/dymad/core/torch_transforms.py`
- updated `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` so graph preprocessing now routes node/control/parameter/edge transforms through `_build_graph_transform_pipeline()`
- fixed graph reload handling so optional identity-transform metadata with `None` state does not break `set_transforms(...)`
- extended `modules/dymad_migrate/tests/test_torch_transform_modules.py` with focused native lift equivalence tests

Task status:
- completed `Port stateless and fitted core transforms to native Torch implementations`
- completed `Migrate graph-compatible transform application onto the new pipeline`
- left `Wrap NDR transforms behind explicit Torch/autodiff adapters` open
- left `Remove hidden legacy transform construction from loaders/checkpoint paths` open

Findings:
- the legacy graph transform contract applies node/control transforms as a list of per-node `[T, F]` sequences, not as one `[T, N, F]` tensor; the graph adapter now preserves that contract at the compatibility boundary
- built-in `Lift` behavior needed for current non-NDR workflows (`poly` and `mixed`) is now covered by native Torch tests
- custom callable lift functions are not part of the new native contract yet; they remain outside the Phase 1 verification scope and do not block current migration tasks

Verification:
- `git -C /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate diff --check` ->
  - no output
- `python -m compileall /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io/trajectory_manager.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_torch_transform_modules.py` ->
  - completed without error
- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trajmgr_graph.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q` ->
  - `12 passed, 1268 warnings in 0.86s`
- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trans_lift.py -q` ->
  - `6 passed, 2 warnings in 0.67s`

Added verification note:
- `projects/dymad_migrate/analysis/2026-03-30-graph-transform-pipeline-and-native-lift-verification.md`

### 2026-03-30 — Made trajectory preprocessing typed-first for both regular and graph paths

Completed the next Phase 1 step: `TrajectoryManager` preprocessing now treats typed
series objects as the design center for both regular and graph data.

Code changes:
- expanded `modules/dymad_migrate/src/dymad/io/series_adapter.py` so graph series can round-trip to and from `DynData`
- updated `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` so `TrajectoryManagerGraph._transform_by_index(...)` now builds typed graph series first and only then adapts back to `DynData`
- added `TrajectoryManagerGraph.create_graph_series_dataset(...)` as the public typed graph seam
- added focused graph adapter coverage in `modules/dymad_migrate/tests/test_graph_series_adapter.py`

Task status:
- completed `Replace DynData as the design center of trajectory preprocessing`
- completed `Add graph-series data specialization on the new typed contract`
- left `Migrate graph-compatible transform application onto the new pipeline` open because graph preprocessing still uses the legacy transform stack internally

Verification:
- `git -C /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate diff --check` ->
  - no output
- `python -m compileall /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/io /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_graph_series_adapter.py` ->
  - completed without error
- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_series_adapter.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q` ->
  - `9 passed, 2 warnings in 0.59s`

Added verification note:
- `projects/dymad_migrate/analysis/2026-03-30-typed-first-trajectory-manager-verification.md`

### 2026-03-30 — Landed the first Phase 1 data/transform foundations

Completed the first concrete foundation step of the module-first data/transform migration.

Code changes:
- added typed graph data primitives in `modules/dymad_migrate/src/dymad/core/graph_series.py`
- exported the expanded core contract from `modules/dymad_migrate/src/dymad/core/__init__.py`
- added the canonical Torch-first transform contract in `modules/dymad_migrate/src/dymad/core/transform_module.py`
- added initial Torch-native non-NDR transforms in `modules/dymad_migrate/src/dymad/core/torch_transforms.py`
- added focused verification coverage in:
  - `modules/dymad_migrate/tests/test_graph_series_core.py`
  - `modules/dymad_migrate/tests/test_torch_transform_modules.py`

Task status:
- completed the scope-freeze task
- completed the typed regular/graph data-contract task
- completed the Torch-first transform protocol/pipeline task
- left the broader native-transform port task open because `lift` and graph preprocessing adoption are not migrated yet

Verification:
- `git -C /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate diff --check` ->
  - no output
- `python -m compileall /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/src/dymad/core /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_graph_series_core.py /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate/tests/test_torch_transform_modules.py` ->
  - completed without error
- `cd /Users/daninghuang/Repos/openakari-codex/modules/dymad_migrate && PYTHONPATH=src pytest tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q` ->
  - `5 passed, 2 warnings in 0.75s`

Added verification note:
- `projects/dymad_migrate/analysis/2026-03-30-phase1-foundations-verification.md`

### 2026-03-30 — Re-scoped the next migration program to data/transform modules first

Recorded a scope shift away from immediate full vertical-slice work and toward module-first migration of:

- data semantics and batching
- trajectory preprocessing
- data transforms
- graph data handling
- NDR transforms

Key conclusions:
- this is feasible now without first redesigning the full model/training stack
- regular and graph data can move to typed Torch-first objects with downstream modules treated as adapter consumers
- common transforms can become native Torch modules now
- NDR should use explicit wrapped Torch/autodiff adapters as an intermediate step instead of blocking on fully native implementations

Added the module-first plan at `projects/dymad_migrate/plans/2026-03-30-data-transform-module-first-migration.md`.

Added the new task queue in `projects/dymad_migrate/TASKS.md` under `## Data/transform module-first migration tasks`.

### 2026-03-30 — Verified the regular working slice

Completed the dedicated regular-slice milestone queue.

Code changes:
- added `modules/dymad_migrate/src/dymad/core/transform_pipeline.py`
- routed the regular preprocessing path through the typed transform pipeline in `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`
- routed the non-graph checkpoint prediction path through the same typed seam in `modules/dymad_migrate/src/dymad/io/checkpoint.py`
- preserved metadata when adapting `DynData` back to typed regular series in `modules/dymad_migrate/src/dymad/io/series_adapter.py`

New verification artifacts:
- `modules/dymad_migrate/tests/test_regular_slice_integration.py`
- `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md`
- `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_migrate-pytest.log`
- `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_ref-pytest.log`

Findings:
- the regular transform seam is now active on the default regular preprocessing path
- the regular checkpoint prediction seam now builds a typed regular batch before constructing the legacy runtime payload
- the regular-only parity gate passed in both packages:
  - `modules/dymad_migrate`: `25 passed, 2 warnings in 14.30s`
  - `modules/dymad_ref`: `25 passed, 2 warnings in 13.05s`
- the focused migrated-slice seam suite passed: `7 passed, 2 warnings in 0.67s`

Exact commands run:
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_series_adapter.py tests/test_regular_slice_integration.py tests/test_public_load_model_boundary.py tests/test_load_model_compat.py tests/test_checkpoint_e2e_layering.py -q`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py tests/test_workflow_lti.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_migrate-pytest.log`
- `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py tests/test_workflow_lti.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_ref-pytest.log`

### 2026-03-30 — Added a dedicated regular-slice milestone queue

Added a short dedicated queue for the next intermediate milestone: a regular working slice.

The new queue narrows the next work to:
- typed regular-series transforms
- regular checkpoint prediction through the typed seam
- one end-to-end regular-slice integration test
- a clean regular-only parity gate in both packages
- milestone promotion (or explicit blocker recording) in the scoreboard

Rationale:
- the current anti-drift work made the boundary and the first data seam real
- the next risk is diffusing effort into graph/model-spec/training work before the regular slice is actually complete

### 2026-03-30 — Completed anti-drift tasks and landed first real migration seams

Completed the anti-drift task set added after the status review.

Added project artifacts:
- `projects/dymad_migrate/architecture/migration-scoreboard.md`
- `projects/dymad_migrate/plans/2026-03-30-first-slice-reconciliation.md`
- `projects/dymad_migrate/analysis/2026-03-30-lti-split-parity-verification.md`

Added/updated migration code:
- `modules/dymad_migrate/src/dymad/core/series.py`
- `modules/dymad_migrate/src/dymad/io/series_adapter.py`
- `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`
- `modules/dymad_migrate/src/dymad/io/checkpoint.py`
- `modules/dymad_migrate/src/dymad/exec/workflow.py`
- `modules/dymad_migrate/tests/test_public_load_model_boundary.py`
- `modules/dymad_migrate/tests/test_regular_series_adapter.py`
- `modules/dymad_migrate/docs/checkpoint-e2e-layering.md`

Main outcomes:
- kept the first real vertical slice as data-boundary-first rather than re-baselining the project to checkpoint-first
- made the public `dymad.io.checkpoint.load_model(...)` path route through `facade/store/exec`
- landed the first typed regular-series seam and used it in the regular trajectory preprocessing path before adapting back to legacy `DynData`
- split one clean parity-critical workflow gate (`test_workflow_lti.py`) between `dymad_ref` and `dymad_migrate`

Important note:
- a broad 7-file workflow rerun in `dymad_migrate` during this session is not authoritative parity evidence because overlapping long-running runs touched the same fixed test output directories; the clean split-parity baseline for this session is the `lti` gate recorded in `2026-03-30-lti-split-parity-verification.md`

Verification:
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py tests/test_checkpoint_e2e_layering.py tests/test_regular_series_adapter.py -q` ->
  - `6 passed, 2 warnings in 0.47s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py -q` ->
  - `15 passed, 2 warnings in 14.12s`
- `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py -q` ->
  - `15 passed, 2 warnings in 14.33s`

### 2026-03-30 — Added anti-drift follow-up tasks

Extended the DyMAD migration queue with explicit anti-drift tasks after the status review.

Added tasks for:
- a plan-to-code migration scoreboard so design progress and code progress stay visibly aligned
- the first actual data-boundary implementation seam for regular trajectories
- split parity reporting between `dymad_ref` and `dymad_migrate`
- a workflow-level proof that the default public entrypoint traverses the migrated boundary after `load_model(...)` is rerouted

Rationale:
- the current project risk is no longer lack of architectural intent
- it is design/code divergence and ambiguous evidence about what is implemented versus only specified

### 2026-03-30 — Reviewed post-Akari migration status and recorded direction gaps

Reviewed whether the current `dymad_migrate` implementation is matching the recorded migration plan after the recent Akari-driven project setup and boundary tasks.

Added:
- `projects/dymad_migrate/analysis/2026-03-30-status-review.md`

Main findings:
- the project is directionally aligned with the intended layered architecture
- the implemented code path is checkpoint-first, while the recorded first vertical slice is still data-boundary-first
- the new `facade/store/exec` boundary is real and tested, but workflow callers still default to legacy `load_model(...)`
- the migration package itself currently passes the selected workflow files, so the boundary proof-of-concept has not regressed the active parity surface

Follow-up tasks added to `projects/dymad_migrate/TASKS.md`:
- resolve first-slice drift (re-baseline vs. implement the actual data-boundary slice next)
- route the public `load_model(...)` path through the compatibility boundary

Verification:
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py tests/test_load_model_compat.py tests/test_checkpoint_e2e_layering.py -q` ->
  - `4 passed, 2 warnings in 0.80s`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_ker_auto.py tests/test_workflow_ker_ctrl.py tests/test_workflow_sa_lti.py -q` ->
  - `74 passed, 7 warnings in 77.91s`

### 2026-03-30 — Oriented project and adjudicated policy-adjusted parity status

Ran `/orient dymad_migrate`, found no open tasks in `projects/dymad_migrate/TASKS.md`, generated a mission-gap task for parity adjudication, and completed it.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short` -> no output).
- Scoped orient context reviewed project README/TASKS, project knowledge, project decisions, `APPROVAL_QUEUE.md`, active-project budget/ledger files, scheduler metrics, and blocked-external tags.
- No pending approval-queue entries; one external blocker tag exists in `projects/akari/TASKS.md` dated `2026-03-26` (4 days old, not stale).
- Mission gap analysis generated one new task because parity-preservation Done-when had no open adjudication task after policy formalization.
- Efficiency summary from the last 10 sessions (`.scheduler/metrics/sessions.jsonl`):
  - findings/$: `n/a` (`0/0`, zero-cost sessions)
  - genuine waste: `2/10` (`20%`, flagged)
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler non-zero findings rate: `0/10` (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"ac3821c245f5c802","taskId":"026088fe8e52","taskText":"Adjudicate parity-critical gate status using the flake-aware NDR policy","project":"dymad_migrate","agentId":"work-session-mnd998f3",...}}`

Scope classification:
- `ROUTINE` with `consumes_resources: false` (no LLM/API calls, external APIs, GPU compute, or long-running detached jobs).

Changes:
- Added `projects/dymad_migrate/analysis/2026-03-30-parity-policy-adjudication.md` to recompute parity status under the recorded flake-aware NDR policy with explicit arithmetic provenance.
- Updated `projects/dymad_migrate/TASKS.md`:
  - added and completed `Adjudicate parity-critical gate status using the flake-aware NDR policy`
  - added follow-up task from compound-fast discovery: `Design a deterministic replacement for the flake-managed test_ndr[0] parity exception`
- Updated `## Open questions`:
  - removed three stale resolved questions (parity-workflow scope, blocker-test identification, first vertical-slice selection)
  - added unresolved deterministic NDR-gate question.

Verification:
- `rg -n "FAILED tests/test_assert_trans_ndr.py::test_ndr\\[0\\]|1 failed, 105 passed" projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-pytest.log` ->
  - confirms the aggregate gate's single failing case and summary.
- `python - <<'PY' ...` against `projects/dymad_migrate/analysis/2026-03-30-ndr-test-idx0-reruns0-repeat.log` ->
  - `{'runs': 30, 'fails': 3, 'recon': 2, 'reload': 1}`
- `rg -n "^## Findings|^## Decision|3/30|10/10|currently satisfied" projects/dymad_migrate/analysis/2026-03-30-parity-policy-adjudication.md` ->
  - confirms policy-adjusted arithmetic and decision text.

Compound (fast): 1 action.
- Task discovery: created one follow-up task for deterministic parity-gate replacement from residual-risk findings.
- Fleet spot-check: no recent `triggerSource:\"fleet\"` sessions in `.scheduler/metrics/sessions.jsonl`.

Session-type: autonomous
Duration: 30
Task-selected: Adjudicate parity-critical gate status using the flake-aware NDR policy
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 2
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and designed spectral-analysis adapter boundary

Ran `/orient dymad_migrate`, selected `Design the spectral-analysis adapter boundary`, and completed the remaining open architecture-design task in `TASKS.md`.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short --branch` -> `## main...origin/main`).
- Scoped orient context reviewed project README/TASKS, project knowledge, project decisions, `APPROVAL_QUEUE.md`, active-project budget/ledger files, and scheduler session metrics.
- No pending approval-queue entries and no stale external blockers (`projects/akari/TASKS.md` had one external blocker dated `2026-03-26`, 4 days old).
- Mission gap check for this project's README Done-when conditions found no additional missing-task gaps.
- Efficiency summary from the last 10 sessions (`.scheduler/metrics/sessions.jsonl`):
  - findings/$: `n/a` (`0/0`, zero-cost sessions)
  - genuine waste: `0/10` (`0%`)
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler non-zero findings rate: `0/10` (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"76bff49ecf711091","taskId":"9d5e0bfd4968","taskText":"Design the spectral-analysis adapter boundary","project":"dymad_migrate","agentId":"work-session-mnd2tl3z",...}}`

Scope classification:
- `ROUTINE` with `consumes_resources: false` (no LLM/API calls, external APIs, GPU compute, or long-running detached jobs).

Changes:
- Added `projects/dymad_migrate/architecture/spectral-analysis-design.md` defining:
  - which `sako` components remain pure core analysis (`SAKO`, `RALowRank`, eig/residual kernels)
  - which parts move to adapter layers (snapshot/model-context adaptation and compatibility surface)
  - how SA parity is checked against `tests/test_workflow_sa_lti.py` using a `--reruns=0` gate tied to the prior rerun diagnosis.
- Updated `projects/dymad_migrate/TASKS.md`:
  - marked `Design the spectral-analysis adapter boundary` complete with evidence and verification command.

Verification:
- `rg -n '^## Purpose|^## Boundary ownership|^## Parity strategy for .*test_workflow_sa_lti.py|^### Core ownership|^### Adapter ownership|tests/test_workflow_sa_lti.py|SAKO|RALowRank' projects/dymad_migrate/architecture/spectral-analysis-design.md` ->
  - required sections and parity/test references present.

Compound (fast): no actions.
- Session-learning check: the relevant non-obvious coupling facts were already captured in `projects/dymad_migrate/architecture/spectral-analysis-design.md`.
- Task discovery check: no new implied follow-up task beyond the completed spectral-boundary design task.
- Fleet spot-check: no recent `triggerSource:"fleet"` sessions.

Session-type: autonomous
Duration: 31
Task-selected: Design the spectral-analysis adapter boundary
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and verified MCP-layered checkpoint end-to-end path

Ran `/orient dymad_migrate`, selected `Expose one verified end-to-end checkpoint path matching MCP layering`, and completed the remaining mission-gap implementation/verification artifact for the checkpoint boundary flow.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short --branch` -> `## main...origin/main`).
- Scoped orient context reviewed project README/TASKS, project knowledge, project decisions, `APPROVAL_QUEUE.md`, active-project budget/ledger files, and scheduler session metrics.
- No pending approval-queue entries and no stale external blockers.
- Mission gap check for this project's README Done-when conditions found no additional missing-task gaps.
- Efficiency summary from the last 10 sessions (`.scheduler/metrics/sessions.jsonl`):
  - findings/$: `n/a` (`0/0`, zero-cost sessions)
  - genuine waste: `0/10` (`0%`)
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler non-zero findings rate: `0/10` (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"1e07b224fa7765eb","taskId":"12e4a3d4f5f8","taskText":"Expose one verified end-to-end checkpoint path matching MCP layering","project":"dymad_migrate","agentId":"work-session-mnd0of81",...}}`

Scope classification:
- `STRUCTURAL (verifiable)` with `consumes_resources: false` (no LLM/external API calls, GPU compute, or long-running detached compute).

Changes:
- Added `modules/dymad_migrate/tests/test_checkpoint_e2e_layering.py` to validate one complete checkpoint path from `exec` planning through facade/store handle resolution to compatibility materialization.
- Added `modules/dymad_migrate/docs/checkpoint-e2e-layering.md` mapping the DyMAD checkpoint path to the reference MCP layering contract in `modules/mcp_test/ARCHITECTURE_SUMMARY.md`.
- Updated `projects/dymad_migrate/TASKS.md`:
  - marked `Expose one verified end-to-end checkpoint path matching MCP layering` complete with evidence and verification command.

Verification:
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_checkpoint_e2e_layering.py tests/test_boundary_skeleton.py tests/test_load_model_compat.py -q` ->
  - `tests/test_checkpoint_e2e_layering.py::test_checkpoint_e2e_path_routes_facade_store_exec PASSED`
  - `tests/test_boundary_skeleton.py::test_checkpoint_prediction_handle_flow PASSED`
  - `tests/test_boundary_skeleton.py::test_handles_reject_invalid_shapes PASSED`
  - `tests/test_load_model_compat.py::test_load_model_compat_routes_via_boundary PASSED`
  - `4 passed, 2 warnings in 0.64s`

Session-type: autonomous
Duration: 29
Task-selected: Expose one verified end-to-end checkpoint path matching MCP layering
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and formalized flake-aware NDR parity policy

Ran `/orient dymad_migrate`, selected `Define flake-aware parity policy for test_assert_trans_ndr.py::test_ndr[0]`, and converted the prior diagnosis into an explicit parity-gate rule.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short --branch` -> `## main...origin/main`).
- Scoped orient context reviewed `README.md`, `TASKS.md`, project `knowledge/`, project `decisions/`, `APPROVAL_QUEUE.md`, and active-project budget/ledger files.
- No pending approval-queue items; no stale external blockers (`[blocked-by: external: ...]` found once in `projects/akari/TASKS.md` dated `2026-03-26`, 4 days old).
- Mission gap check for README Done-when criteria found no new gap tasks.
- Efficiency summary from the last 10 sessions (`.scheduler/metrics/sessions.jsonl`):
  - findings/$: `n/a` (`0/0`, zero-cost sessions)
  - genuine waste: `0/10` (`0%`)
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler non-zero findings rate: `0/7` scheduler sessions (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"3f473601ba288f25","taskId":"905a34480aab","taskText":"Define flake-aware parity policy for test_assert_trans_ndr.py::test_ndr[0]","project":"dymad_migrate","agentId":"work-session-mncyj99x",...}}`

Scope classification:
- `ROUTINE` with `consumes_resources: false` (no LLM/API calls, GPU compute, or long-running detached jobs).

Decision:
- Adopt a flake-adjudication exception only for `tests/test_assert_trans_ndr.py::test_ndr[0]`:
  - flake-managed pass if failures are `<=4/30` and only known near-threshold assertion types appear
  - hard blocker if failures are `>=5/30` or any other failure type appears

Changes:
- Added `projects/dymad_migrate/analysis/2026-03-30-ndr-flake-policy.md` with policy context, thresholds, commands, and consequences.
- Updated `projects/dymad_migrate/knowledge/parity-critical-workflows.md`:
  - status/date metadata
  - section `3a` documenting the exact flake-aware gate policy and policy source links.
- Updated `projects/dymad_migrate/TASKS.md`:
  - marked `Define flake-aware parity policy for test_assert_trans_ndr.py::test_ndr[0]` complete
  - added evidence and corrected runnable verification command.
- Updated this README `## Open questions`:
  - removed the resolved NDR flake-policy question.

Verification:
- `rg -n 'Special gate policy for .*test_assert_trans_ndr.py::test_ndr\\[0\\]|<= 4/30|>= 5/30|2026-03-30-ndr-flake-policy.md' projects/dymad_migrate/knowledge/parity-critical-workflows.md projects/dymad_migrate/analysis/2026-03-30-ndr-flake-policy.md projects/dymad_migrate/TASKS.md` ->
  - policy thresholds and links present in `knowledge` and `analysis` files
  - task evidence/verification entry present in `TASKS.md`
- `git diff --check -- projects/dymad_migrate` -> no output

Compound (fast): no actions.
- Session-learning check: no convention/skill update needed beyond project-local policy codification.
- Task discovery check: no additional implied task beyond the now-completed policy task.
- Fleet spot-check: no recent `triggerSource:"fleet"` sessions.

Session-type: autonomous
Duration: 42
Task-selected: Define flake-aware parity policy for `test_assert_trans_ndr.py::test_ndr[0]`
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and diagnosed NDR parity-gate flake mode

Ran `/orient dymad_migrate`, selected `Diagnose test_assert_trans_ndr.py::test_ndr[0] parity-gate failure mode`, and completed a reproducibility diagnosis with explicit gate classification.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short --branch` -> `## main...origin/main`).
- Scoped orient context reviewed project README/TASKS, knowledge, decisions, approvals, active-project budget/ledger files, and scheduler metrics.
- Mission gap check for `dymad_migrate` found no new gaps (each README Done-when condition already had an open or completed task path).
- Efficiency summary from the last 10 sessions (`.scheduler/metrics/sessions.jsonl`):
  - findings/$: `n/a` (`cost_sum=0`)
  - genuine waste: `0/10` (`0%`)
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler `work-cycle` non-zero findings rate: `0/10` (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"7cb4fcb392505437","taskId":"af9cc77512bc","taskText":"Diagnose test_assert_trans_ndr.py::test_ndr[0] parity-gate failure mode","project":"dymad_migrate","agentId":"work-session-mncwe3bi",...}}`

Scope classification:
- `ROUTINE` with `consumes_resources: false` (no LLM API calls, external API calls, GPU compute, or long-running detached jobs).

Changes:
- Added `projects/dymad_migrate/analysis/2026-03-30-ndr-idx0-parity-diagnosis.md` with root-cause findings and gate decision.
- Added exact command logs:
  - `projects/dymad_migrate/analysis/2026-03-30-ndr-test-idx0-reruns0-repeat.log`
  - `projects/dymad_migrate/analysis/2026-03-30-ndr-isomap-ratio-probe.log`
- Added reproducibility script:
  - `projects/dymad_migrate/analysis/2026-03-30-ndr-isomap-ratio-probe.py`
- Updated `projects/dymad_migrate/TASKS.md`:
  - marked `Diagnose test_assert_trans_ndr.py::test_ndr[0] parity-gate failure mode` complete with evidence/verification
  - added follow-up task `Define flake-aware parity policy for test_assert_trans_ndr.py::test_ndr[0]`
- Updated `## Open questions` to replace the resolved deterministic-vs-flaky question with the remaining policy question.

Verification:
- `cd modules/dymad_ref && PYTHONPATH=src bash -lc 'for i in {1..30}; do echo \"===== RUN $i =====\"; pytest \"tests/test_assert_trans_ndr.py::test_ndr[0]\" --reruns=0 -q; ec=$?; echo \"EXIT_CODE=$ec\"; done'` ->
  - `27` passed, `3` failed (`3/30 = 10.0%`)
  - failure mode counts: `2` recon-threshold failures, `1` reload-transform threshold failure
- `cd modules/dymad_ref && PYTHONPATH=src python /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-ndr-isomap-ratio-probe.py` ->
  - recon range: `[1.634900138167055e-05, 2.95024235412379e-05]`, failures `0/30`
  - reload-transform range: `[2.778685203437485e-14, 1.097809665838523e-13]`, failures `3/30`
  - reload-inverse range: `[9.725003936830169e-16, 2.6112987052518792e-15]`, failures `0/30`
- Classification result in diagnosis: treat this case as **flake-managed** for parity gating until explicit policy is formalized.

Compound (fast): 1 action.
- Added follow-up task `Define flake-aware parity policy for test_assert_trans_ndr.py::test_ndr[0]` from diagnosis findings.
- Fleet spot-check result: no recent `triggerSource:"fleet"` sessions in the last 5 metrics entries.

Session-type: autonomous
Duration: 52
Task-selected: Diagnose `test_assert_trans_ndr.py::test_ndr[0]` parity-gate failure mode
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and quantified parity-critical gate outcomes

Ran `/orient dymad_migrate`, generated a mission-gap findings task for parity verification, selected it, and completed a quantified blocker/milestone gate run against `modules/dymad_ref/`.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short --branch` -> `## main...origin/main`).
- Scoped orient context reviewed project README/TASKS/knowledge/decisions and active-project budget/ledger state (`dymad_migrate` has no `budget.yaml` or `ledger.yaml`; `pca_vs_ttd` has a budget file and empty ledger).
- Mission gap check added one task: `Quantify parity-critical workflow gate outcomes for the current migration baseline`.
- Efficiency summary from the last 10 sessions (`.scheduler/metrics/sessions.jsonl`):
  - findings/$: `n/a` (`cost_sum=0`)
  - genuine waste: `0/10` (`0%`)
  - orient overhead: `n/a` (no sessions with `numTurns > 10` and non-null `orientTurns`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler `work-cycle` non-zero findings rate: `0/10` (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{\"ok\":true,\"claim\":{\"claimId\":\"4bc91afa3935b48b\",\"taskId\":\"088fea451712\",\"taskText\":\"Quantify parity-critical workflow gate outcomes for the current migration baseline\",\"project\":\"dymad_migrate\",\"agentId\":\"work-session-mncu8xf1\",...}}`

Scope classification:
- `ROUTINE` with `consumes_resources: false` (no LLM API calls, external API calls, GPU compute, or long-running detached jobs).

Changes:
- Added `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-outcomes.md` with blocker/milestone pass/fail counts, failure arithmetic provenance, and parity-stability decision.
- Added `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-pytest.log` containing exact pytest output.
- Updated `projects/dymad_migrate/TASKS.md`:
  - marked `Quantify parity-critical workflow gate outcomes for the current migration baseline` complete with evidence/verification
  - added follow-up task `Diagnose test_assert_trans_ndr.py::test_ndr[0] parity-gate failure mode` from compound-fast task discovery
- Updated this README `## Open questions` with the unresolved NDR parity-failure classification question.

Verification:
- `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_dm.py tests/test_assert_trajmgr_graph.py tests/test_assert_graph.py tests/test_assert_transform.py tests/test_assert_trans_mode.py tests/test_assert_trans_lift.py tests/test_assert_trans_ndr.py tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_sa_lti.py tests/test_assert_resolvent.py tests/test_assert_spectrum.py tests/test_workflow_sample.py -q` ->
  - `FAILED tests/test_assert_trans_ndr.py::test_ndr[0] - AssertionError: Isomap recon. error`
  - `1 failed, 105 passed, 1269 warnings, 2 rerun in 61.90s`

Compound (fast): 1 action.
- Added task `Diagnose test_assert_trans_ndr.py::test_ndr[0] parity-gate failure mode` to `projects/dymad_migrate/TASKS.md` from the failed blocker finding in `2026-03-30-parity-critical-gate-outcomes.md`.
- Fleet spot-check result: no recent `triggerSource:\"fleet\"` sessions in `.scheduler/metrics/sessions.jsonl`.

Session-type: autonomous
Duration: 43
Task-selected: Quantify parity-critical workflow gate outcomes for the current migration baseline
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and diagnosed SA rerun/warning behavior

Ran `/orient dymad_migrate`, selected `Diagnose test_workflow_sa_lti.py::test_sa[4] rerun and runtime warnings`, and completed a provenance-backed diagnosis note with exact command outputs.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short` produced no output).
- Scoped orient context reviewed project README/TASKS, decisions, and parity knowledge; `projects/dymad_migrate/` has no `budget.yaml` or `ledger.yaml`.
- Efficiency summary from the last 10 sessions:
  - findings/$: `n/a` (`cost_sum=0`)
  - genuine waste: `0/10` (`0%`)
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler `work-cycle` non-zero findings rate: `0/10` (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"8b852aa2291b502e","taskId":"a5e1ae7ed181","taskText":"Diagnose test_workflow_sa_lti.py::test_sa[4] rerun and runtime warnings","project":"dymad_migrate","agentId":"work-session-mncs3rge",...}}`

Scope classification:
- `ROUTINE` with `consumes_resources: false` (no LLM API calls, external API calls, GPU compute, or long-running detached jobs).

Changes:
- Added `projects/dymad_migrate/analysis/2026-03-30-sa-lti-rerun-warning-diagnosis.md` with cause classification and parity-stability decision.
- Added exact command logs:
  - `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns-default.log`
  - `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns0.log`
  - `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns0-repeat.log`
- Updated `projects/dymad_migrate/TASKS.md` to mark the SA rerun/warning diagnosis task complete with evidence/verification.

Verification:
- `cd modules/dymad_ref && PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[4]' -vv` ->
  - observed `RERUN` entries and final `FAILED ... FileNotFoundError` in single-case rerun mode, plus `RuntimeWarning` at `src/dymad/sako/sako.py:151`.
- `cd modules/dymad_ref && for i in {1..20}; do PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[4]' --reruns=0 -q; echo \"EXIT_CODE=$?\"; done` ->
  - `20/20` successful exits, with `RuntimeWarning` entries in `12/20` runs (`60%`) recorded in the persisted repeat log.

Session-type: autonomous
Duration: 55
Task-selected: Diagnose `test_workflow_sa_lti.py::test_sa[4]` rerun and runtime warnings
Task-completed: yes
Approvals-created: 0
Files-changed: 6
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and verified parity-critical load-model workflows

Ran `/orient dymad_migrate`, selected `Verify parity-critical load_model workflows after boundary adapter landing`, and completed the parity verification note with exact command output and residual-gap assessment.

Orient and selection highlights:
- Repository state was clean at session start (`git status` -> `nothing to commit, working tree clean`).
- Scoped orient context reviewed `projects/dymad_migrate/README.md`, `TASKS.md`, project decisions, and parity knowledge, plus active-project budget/ledger files.
- Efficiency summary from the last 10 sessions:
  - findings/$: `n/a` (`cost_sum=0`)
  - genuine waste: `0/10` (`0%`)
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler `work-cycle` non-zero findings rate: `0/10` (`0%`) -> findings-first gate enabled
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"6102a113896c1b88","taskId":"58d94ffe16bd","taskText":"Verify parity-critical load_model workflows after boundary adapter landing","project":"dymad_migrate","agentId":"work-session-mncpyljg",...}}`

Scope classification:
- `ROUTINE` with `consumes_resources: false` (no LLM API calls, external API calls, GPU compute, or long-running detached jobs).

Changes:
- Added `projects/dymad_migrate/analysis/2026-03-30-load-model-parity-verification.md` documenting pass/fail outcomes for the required workflow files, exact command, and residual parity gaps.
- Added `projects/dymad_migrate/analysis/2026-03-30-load-model-parity-pytest.log` containing exact pytest output for the parity command.
- Updated `projects/dymad_migrate/TASKS.md` to mark `Verify parity-critical load_model workflows after boundary adapter landing` complete with evidence and verification command.
- Added one open question in this README for SA warning/rerun behavior classification (`test_workflow_sa_lti.py::test_sa[4]`).

Verification:
- `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_ker_auto.py tests/test_workflow_ker_ctrl.py tests/test_workflow_sa_lti.py -q` ->
  - `============== 74 passed, 7 warnings, 1 rerun in 66.03s (0:01:06) ==============`
  - `tests/test_workflow_sa_lti.py::test_sa[4] RERUN`
  - `tests/test_workflow_sa_lti.py::test_sa[4] PASSED`

Compound (fast): 1 action.
- Added follow-up task `Diagnose test_workflow_sa_lti.py::test_sa[4] rerun and runtime warnings` to `projects/dymad_migrate/TASKS.md`.
- Fleet spot-check result: no recent `triggerSource:"fleet"` sessions in `.scheduler/metrics/sessions.jsonl`.

Session-type: autonomous
Duration: 47
Task-selected: Verify parity-critical `load_model` workflows after boundary adapter landing
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 2
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and implemented checkpoint compatibility boundary adapter

Ran `/orient dymad_migrate`, selected `Implement checkpoint compatibility through facade/store/exec boundary`, and landed the first compatibility adapter that materializes through `exec` after facade/store registration.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short` produced no output).
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"0482d9b4857ac977","taskId":"a0116a04a5e4","taskText":"Implement checkpoint compatibility through facade/store/exec boundary","project":"dymad_migrate","agentId":"work-session-mncntfli",...}}`
- Efficiency summary from last 10 sessions:
  - findings/$: `n/a` (`cost_sum=0`)
  - genuine waste: `0/10`
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler `work-cycle` non-zero findings rate: `0/10` (findings-first gate enabled)
- External work status: no pending external approval-queue items; no stale `[blocked-by: external: ...]` tags (only 2026-03-26 observed, 4 days old).

Scope classification:
- `STRUCTURAL (verifiable)` with `consumes_resources: false` (no LLM API calls, external APIs, GPU compute, or long-running jobs).

Changes:
- Added `modules/dymad_migrate/src/dymad/io/load_model_compat.py` with `load_model_compat(...)` and `BoundaryLoadTrace` to route checkpoint compatibility loading through `facade/store/exec`.
- Extended `modules/dymad_migrate/src/dymad/exec/workflow.py` with `materialize_checkpoint_prediction(...)` to load model artifacts from facade/store-planned handles.
- Extended `modules/dymad_migrate/src/dymad/facade/operations.py` with `get_checkpoint(...)` to support exec-side materialization.
- Updated `modules/dymad_migrate/src/dymad/io/__init__.py` exports for `load_model_compat` and `BoundaryLoadTrace`.
- Added `modules/dymad_migrate/tests/test_load_model_compat.py` for compatibility-boundary routing verification.
- Updated `projects/dymad_migrate/TASKS.md` to mark `Implement checkpoint compatibility through facade/store/exec boundary` complete with evidence/verification.

Verification:
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py tests/test_load_model_compat.py -q` ->
  - `tests/test_boundary_skeleton.py::test_checkpoint_prediction_handle_flow PASSED`
  - `tests/test_boundary_skeleton.py::test_handles_reject_invalid_shapes PASSED`
  - `tests/test_load_model_compat.py::test_load_model_compat_routes_via_boundary PASSED`
  - `3 passed, 2 warnings in 0.80s`

Compound (fast): no actions. (Fleet spot-check: no recent `"triggerSource":"fleet"` entries in `.scheduler/metrics/sessions.jsonl`.)

Session-type: autonomous
Duration: 42
Task-selected: Implement checkpoint compatibility through facade/store/exec boundary
Task-completed: yes
Approvals-created: 0
Files-changed: 7
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project, completed checkpoint facade design, and generated mission-gap tasks

Ran `/orient dymad_migrate`, selected `Design checkpoint/load-model compatibility as the first facade boundary`, completed the design artifact, and expanded task supply with mission-gap tasks tied to README Done-when criteria.

Orient and selection highlights:
- Repository state was clean at session start (`git status --short` produced no output).
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"67f42b133eb4afd1","taskId":"12b64fe5b302","taskText":"Design checkpoint/load-model compatibility as the first facade boundary","project":"dymad_migrate","agentId":"work-session-mnclo9p4",...}}`
- Efficiency summary from last 10 sessions:
  - findings/$: `n/a` (`cost_sum=0`)
  - genuine waste: `0/10`
  - orient overhead: `n/a` (no sessions with `numTurns > 10`)
  - avg cost/session: `0.0`
  - avg turns/session: `1.0`
  - rolling scheduler `work-cycle` non-zero findings rate: `0/10` (findings-first gate enabled)
- Mission gap analysis for project Done-when conditions identified missing explicit tasks for implementation/parity/e2e proof; added three `## Mission gap tasks` entries in `TASKS.md`.

Scope classification:
- `ROUTINE` with `consumes_resources: false` (documentation/design only; no LLM API calls, external APIs, GPU jobs, or long-running compute).

Changes:
- Added `projects/dymad_migrate/architecture/checkpoint-facade-design.md` defining:
  - legacy `load_model` parity-critical API shapes and call-site findings
  - `core` / `facade` / `store` / `exec` ownership split for checkpoint compatibility
  - staged shim migration sequence and parity verification gates
- Updated `projects/dymad_migrate/TASKS.md`:
  - marked `Design checkpoint/load-model compatibility as the first facade boundary` complete with evidence and verification command
  - added three mission-gap tasks for boundary implementation, parity verification, and one verified e2e MCP-aligned path

Verification:
- `rg -n "^## Legacy findings to preserve|^## Compatibility surface to keep|^## Boundary ownership|^## First shim design|^## Migration sequence|test_workflow_lti.py:167|test_workflow_sa_lti.py:106|core -> facade -> store -> exec|src/dymad/exec/workflow.py:17-40" projects/dymad_migrate/architecture/checkpoint-facade-design.md` ->
  - `16:\`core -> facade -> store -> exec\` layers.`
  - `23:## Legacy findings to preserve`
  - `44:   - \`tests/test_workflow_lti.py:167\``
  - `50:   - \`tests/test_workflow_sa_lti.py:106\``
  - `52:## Compatibility surface to keep`
  - `93:## Boundary ownership`
  - `122:## First shim design`
  - `158:(\`src/dymad/exec/workflow.py:17-40\`).`
  - `163:## Migration sequence`
- `git diff --check -- projects/dymad_migrate` -> no output

Compound (fast): no actions. (Fleet spot-check: no recent `"triggerSource":"fleet"` entries in `.scheduler/metrics/sessions.jsonl`.)

Session-type: autonomous
Duration: 36
Task-selected: Design checkpoint/load-model compatibility as the first facade boundary
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Oriented project and prototyped facade/store/exec skeleton

Ran `/orient dymad_migrate`, selected `Prototype the facade/store/exec skeleton without moving core math yet`, and completed the first non-invasive boundary prototype in the migration target module.

Orient and selection highlights:
- Repository state was clean for project files at start; only the `modules/dymad_migrate` submodule working tree changed during this session.
- Task claim succeeded:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...` ->
  - `{"ok":true,"claim":{"claimId":"9809aa47d6471a9e","taskId":"34f07f8dcda3","taskText":"Prototype the facade/store/exec skeleton without moving core math yet","project":"dymad_migrate","agentId":"work-session-mncjj3sj",...}}`
- Scope classification: `STRUCTURAL (verifiable)` with `consumes_resources: false` (no LLM/external API usage, no GPU jobs, no long-running compute).

Changes:
- Added new module skeleton packages in `modules/dymad_migrate/src/dymad/`:
  - `facade/` (typed `chk_*` and `pred_*` handles + boundary operations)
  - `store/` (in-memory object store for checkpoint/prediction request records)
  - `exec/` (composition root and compatibility executor planning flow)
- Added `modules/dymad_migrate/tests/test_boundary_skeleton.py` covering the typed handle flow and handle-shape validation.
- Added `projects/dymad_migrate/plans/2026-03-30-facade-store-exec-skeleton.md` with current-state discovery and the first documented typed handle flow.
- Updated `projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md` to clarify that full facade/store/exec integration remains out of scope for the data-boundary slice while the minimal boundary skeleton now exists.
- Updated `projects/dymad_migrate/TASKS.md` to mark the facade/store/exec skeleton task complete with evidence and verification.

Verification:
- `find modules/dymad_migrate/src/dymad -maxdepth 2 -type d | rg '/(facade|store|exec)$' | sort` ->
  - `modules/dymad_migrate/src/dymad/exec`
  - `modules/dymad_migrate/src/dymad/facade`
  - `modules/dymad_migrate/src/dymad/store`
- `rg -n "^## Current-state discovery|^## Typed handle flow|Status: completed|compatibility" projects/dymad_migrate/plans/2026-03-30-facade-store-exec-skeleton.md` ->
  - `4:Status: completed`
  - `11:## Current-state discovery (captured this session)`
  - `26:  - compatibility executor that plans a checkpoint prediction request without running core math`
  - `33:4. plan output records \`entrypoint=\"dymad.io.checkpoint.load_model\"\` for checkpoint compatibility mapping`
- `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py -q` ->
  - `tests/test_boundary_skeleton.py::test_checkpoint_prediction_handle_flow PASSED`
  - `tests/test_boundary_skeleton.py::test_handles_reject_invalid_shapes PASSED`
  - `2 passed`

Session-type: autonomous
Duration: 34
Task-selected: Prototype the `facade`/`store`/`exec` skeleton without moving core math
Task-completed: yes
Approvals-created: 0
Files-changed: 15
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-30 — Designed first slice, transform layer, model specs, and training split

Completed the next four pending architecture tasks by turning the current discovery work into concrete migration design artifacts.

Added:
- `projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md`
- `projects/dymad_migrate/architecture/transform-layer-design.md`
- `projects/dymad_migrate/architecture/model-spec-design.md`
- `projects/dymad_migrate/architecture/training-layer-design.md`

Key decisions captured in these designs:
- the first vertical slice stays at the data boundary and uses compatibility adapters instead of jumping directly to model or MCP work
- transforms become field-aware fitted `nn.Module`-style pipeline stages over typed series/batches
- predefined names like `LDM`, `KBF`, and `DKBF` survive as builders over typed `ModelSpec` objects
- training is split into `CVDriver -> TrainerRun -> PhasePipeline -> Phase`, with `RunState` decomposed into checkpointable state, phase context, and execution services

Updated `projects/dymad_migrate/TASKS.md` to record these four tasks as complete with evidence and verification commands.

Verification:
- `rg -n "^## Slice name|^## In scope|trajectory_manager.py:159|checkpoint.py:64|test_assert_trajmgr.py|test_workflow_lti.py" projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md` ->
  - `7:## Slice name`
  - `23:## In scope`
  - `28:- modules/dymad_ref/src/dymad/io/trajectory_manager.py:159`
  - `32:- modules/dymad_ref/src/dymad/io/checkpoint.py:64`
  - `66:cd modules/dymad_ref && pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py -q`
  - `67:cd modules/dymad_ref && pytest tests/test_workflow_lti.py -q`
- `rg -n "^## Proposed base protocol|^## Transform spec and compatibility model|^## First transform families to port|TrajectoryManager|checkpoint.py:64" projects/dymad_migrate/architecture/transform-layer-design.md` ->
  - `35:## Proposed base protocol`
  - `67:## Transform spec and compatibility model`
  - `104:## First transform families to port`
  - `28:- transform fitting and transform-state reuse are wired directly into TrajectoryManager`
  - `31:- modules/dymad_ref/src/dymad/io/checkpoint.py:64`
- `rg -n "^## Proposed typed spec family|^## Predefined model compatibility|^## Rollout separation|models/collections.py:8|models/helpers.py:155|models/prediction.py:97" projects/dymad_migrate/architecture/model-spec-design.md` ->
  - `36:## Proposed typed spec family`
  - `96:## Predefined model compatibility`
  - `109:## Rollout separation`
  - `25:- modules/dymad_ref/src/dymad/models/collections.py:8`
  - `26:- modules/dymad_ref/src/dymad/models/helpers.py:155`
  - `27:- modules/dymad_ref/src/dymad/models/prediction.py:97`
- `rg -n "^## Required hierarchy|^## State split|^## Legacy-to-target mapping|training/helper.py:9|training/stacked_opt.py:26|training/opt_base.py:19" projects/dymad_migrate/architecture/training-layer-design.md` ->
  - `27:## Required hierarchy`
  - `71:## State split`
  - `128:## Legacy-to-target mapping`
  - `24:- modules/dymad_ref/src/dymad/training/helper.py:9`
  - `27:- modules/dymad_ref/src/dymad/training/stacked_opt.py:26`
  - `28:- modules/dymad_ref/src/dymad/training/opt_base.py:19`
- `git diff --check -- projects/dymad_migrate` -> no output

### 2026-03-30 — Oriented project and completed first data-layer design task

Ran `/orient dymad_migrate`, selected the highest-priority unblocked architecture task, and completed the first data-layer design artifact.

Orient and selection highlights:
- Repository was clean at session start (`git status` -> `nothing to commit, working tree clean`).
- Task claim API was unavailable:
  - `curl -sS -X POST http://localhost:8420/api/tasks/claim ...`
  - `curl: (7) Failed to connect to localhost port 8420 after 0 ms: Couldn't connect to server`
- Selected task: `Design the first core data abstractions replacing DynData`.
- Scope classification: `ROUTINE` (`consumes_resources: false`) - documentation/design only (no LLM API calls, external APIs, GPU compute, or long-running jobs).

Changes:
- Added `projects/dymad_migrate/architecture/data-layer-design.md` with:
  - initial semantic series types (`RegularSeries`, `GraphSeries`, `LatentSeries`, `DerivedSeries`)
  - first storage/layout specializations (`UniformStepRegularSeries`, `VariableStepRegularSeries`, `FixedGraphSeries`, `VariableEdgeGraphSeries`)
  - exact phased migration call sites in legacy code (`trajectory_manager.py`, `training/driver.py`, `io/checkpoint.py`, `models/model_base.py`)
- Updated `projects/dymad_migrate/TASKS.md`:
  - marked `Design the first core data abstractions replacing DynData` complete with evidence and verification command.
- Updated `projects/dymad_migrate/README.md` open questions with unresolved graph-control/params typing and variable-edge storage strategy decisions.

Verification:
- `rg -n "^## Initial semantic series types|^## First storage/layout specializations|^## Exact legacy call sites to migrate first|trajectory_manager.py:469|training/driver.py:262|checkpoint.py:135" projects/dymad_migrate/architecture/data-layer-design.md` ->
  - `28:## Initial semantic series types`
  - `88:## First storage/layout specializations`
  - `174:## Exact legacy call sites to migrate first`
  - `180:1. modules/dymad_ref/src/dymad/io/trajectory_manager.py:469`
  - `194:5. modules/dymad_ref/src/dymad/training/driver.py:262`
  - `202:6. modules/dymad_ref/src/dymad/io/checkpoint.py:135`
- `git diff --check -- projects/dymad_migrate` -> no output

Compound (fast): no actions. (Fleet spot-check: no recent `"triggerSource":"fleet"` entries in `.scheduler/metrics/sessions.jsonl`.)

Session-type: autonomous
Duration: 28
Task-selected: Design the first `core` data abstractions replacing `DynData`
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-29 — Legacy discovery, parity classification, and initial ADRs

Completed the first real migration-discovery pass against `modules/dymad_ref/` and persisted the results into project memory instead of leaving them as session-only reasoning.

Added:
- `projects/dymad_migrate/architecture/current-state.md`
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `projects/dymad_migrate/architecture/migration-matrix.md`
- `projects/dymad_migrate/decisions/0001-module-roles-and-write-scope.md`
- `projects/dymad_migrate/decisions/0002-discovery-first-vertical-slice-migration.md`
- `projects/dymad_migrate/decisions/0003-mcp-boundary-above-facade-and-exec.md`

Refined `projects/dymad_migrate/TASKS.md` from those findings: marked the first discovery tasks complete, confirmed the write-scope policy as complete, and added follow-up design tasks for checkpoint/facade compatibility and spectral-analysis adapters.

Key findings:
- The largest responsibility concentrations are `io/trajectory_manager.py` (`904` lines), `training/opt_base.py` (`695`), `transform/base.py` (`649`), `utils/sampling.py` (`628`), and several `~580`-line numerics / spectral-analysis files.
- The strongest first migration seam is the data boundary (`DynData` + `TrajectoryManager`), because it sits upstream of regular, graph, and training workflows.
- `load_model(...)` is a workflow-critical compatibility surface and should become an early facade target.
- `sako` should migrate as analysis adapters over cleaner core outputs, not as a preserved tangle of `io` + `models` + `numerics` + plotting imports.

Verification:
- `find modules/dymad_ref/src/dymad -maxdepth 2 -type d | sort` ->
  - `modules/dymad_ref/src/dymad`
  - `modules/dymad_ref/src/dymad/io`
  - `modules/dymad_ref/src/dymad/losses`
  - `modules/dymad_ref/src/dymad/models`
  - `modules/dymad_ref/src/dymad/modules`
  - `modules/dymad_ref/src/dymad/numerics`
  - `modules/dymad_ref/src/dymad/sako`
  - `modules/dymad_ref/src/dymad/training`
  - `modules/dymad_ref/src/dymad/transform`
  - `modules/dymad_ref/src/dymad/utils`
- `wc -l modules/dymad_ref/src/dymad/**/*.py 2>/dev/null | sort -nr | sed -n '1,10p'` ->
  - `13885 total`
  - `904 modules/dymad_ref/src/dymad/io/trajectory_manager.py`
  - `695 modules/dymad_ref/src/dymad/training/opt_base.py`
  - `649 modules/dymad_ref/src/dymad/transform/base.py`
  - `628 modules/dymad_ref/src/dymad/utils/sampling.py`
  - `583 modules/dymad_ref/src/dymad/numerics/dm.py`
  - `582 modules/dymad_ref/src/dymad/numerics/linalg.py`
  - `581 modules/dymad_ref/src/dymad/sako/base.py`
  - `549 modules/dymad_ref/src/dymad/utils/plot.py`
  - `523 modules/dymad_ref/src/dymad/io/data.py`
- `git diff --check -- projects/dymad_migrate` -> no output

### 2026-03-29 — Project scaffolded for DyMAD migration

Created the Akari-side project scaffold for the DyMAD migration so future sessions can orient on persistent project memory rather than relying on conversation context or module-local notes alone.

Recorded the initial project mission, completion criteria, module-role policy, first migration plan, and a bounded task queue. The initial scaffold treats `modules/dymad_ref/` as frozen reference input, `modules/dymad_migrate/` as the only writable implementation target, and `modules/mcp_test/` as a read-only architecture example for the future MCP boundary.

Verification:
- `git diff --check -- projects/dymad_migrate/README.md projects/dymad_migrate/TASKS.md projects/dymad_migrate/plans/2026-03-29-initial-migration-plan.md` -> no output

Sources:
- User request
- `modules/dymad_migrate/tasks/refactor_target_architecture.md`
- `modules/mcp_test/ARCHITECTURE_SUMMARY.md`
- `modules/registry.yaml`

## Open questions

- For graph series, should `control`/`params` be node-wise only, global only, or union-typed with explicit validation rules?
- For variable-edge graph series, should the first implementation keep nested/jagged backing for parity or normalize immediately to packed edge tables?
- Should checkpoint fallback path behavior (`name.pt -> name/name.pt`) remain part of the stable compatibility API, or become compatibility-mode only?
- Should `predict_fn(..., ret_dat=True)` remain public and stable, or move behind an explicit facade debug/inspection API?
- Should `tests/test_assert_trans_ndr.py::test_ndr[0]` be made deterministic (seeded fixture or threshold redesign) so parity gating no longer needs a flake-policy exception?
- Should SA parity gating disable reruns (or adjust fixture/data lifecycle) for single-case diagnostics to avoid rerun-induced `FileNotFoundError` noise from the legacy test harness?
- Should SA snapshots persist `P0/P1` explicitly in store for reproducibility, or derive them lazily from checkpoint/data handles at execution time?
- Should the long-term SA public surface remain class-style (`SpectralAnalysis(...)`) or shift to explicit facade operations that return typed result handles?
