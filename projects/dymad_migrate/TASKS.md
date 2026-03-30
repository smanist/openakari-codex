# DyMAD Migration — Tasks

- [x] Inventory the legacy package structure and subsystem boundaries [requires-frontier] [skill: diagnose]
  Why: Codex cannot migrate subsystem-by-subsystem until the current package is mapped into stable conceptual units with clear ownership and coupling hotspots.
  Done when: `projects/dymad_migrate/architecture/current-state.md` lists the major legacy subsystems, their responsibilities, key dependencies, and the files/modules that implement them in `modules/dymad_ref/`.
  Priority: high
  Evidence: Added `projects/dymad_migrate/architecture/current-state.md` with subsystem definitions, hotspot files, and migration-order recommendations derived from `modules/dymad_ref/src/dymad/`.
  Verification: `find modules/dymad_ref/src/dymad -maxdepth 2 -type d | sort` and `wc -l modules/dymad_ref/src/dymad/**/*.py 2>/dev/null | sort -nr | sed -n '1,10p'`

- [x] Define the parity-critical workflows and regression gates [requires-frontier] [skill: analyze]
  Why: The migration needs an explicit answer to "what must not break" before structural work begins, otherwise architectural cleanup will drift away from real user-facing behavior.
  Done when: `projects/dymad_migrate/knowledge/parity-critical-workflows.md` identifies the initial must-preserve workflows, the corresponding tests/examples/scripts in `modules/dymad_ref/` and `modules/dymad_migrate/`, and the verification command(s) for each.
  Priority: high
  Evidence: Added `projects/dymad_migrate/knowledge/parity-critical-workflows.md` classifying regular-series, graph-series, transform, training, spectral-analysis, and sampling workflows as blocker/milestone/informative.
  Verification: `sed -n '1,220p' modules/dymad_ref/tests/README.md` and targeted reads of `modules/dymad_ref/tests/test_workflow_*.py`

- [x] Create the legacy-to-target migration matrix [requires-frontier] [skill: orient]
  Why: The architecture contract is clear about the target shape, but the mapping from current modules to future `core` / `facade` / `store` / `exec` ownership still needs to be made explicit.
  Done when: `projects/dymad_migrate/architecture/migration-matrix.md` maps each major legacy subsystem to its intended target layer, notes whether it migrates as-is, splits, or becomes a compatibility adapter, and identifies unresolved ownership conflicts.
  Priority: high
  Evidence: Added `projects/dymad_migrate/architecture/migration-matrix.md` with layer mapping for `io`, `transform`, `models`, `training`, `sako`, and utility subsystems plus unresolved conflicts.
  Verification: `sed -n '1,240p' modules/dymad_migrate/tasks/refactor_target_architecture.md`

- [x] Persist module-role and write-scope policy for autonomous sessions [fleet-eligible] [skill: govern]
  Why: Future Akari/Codex sessions need an unambiguous, repo-local statement that `dymad_ref` and `mcp_test` are read-only while `dymad_migrate` is the only writable code target.
  Done when: The project README and initial plan both explicitly state the read-only/writeable module policy and no open task in this project instructs Codex to modify `modules/dymad_ref/` or `modules/mcp_test/`.
  Priority: high
  Evidence: Recorded the policy in `projects/dymad_migrate/README.md`, `projects/dymad_migrate/plans/2026-03-29-initial-migration-plan.md`, and `projects/dymad_migrate/decisions/0001-module-roles-and-write-scope.md`.
  Verification: `sed -n '1,120p' projects/dymad_migrate/README.md` and `sed -n '1,120p' projects/dymad_migrate/plans/2026-03-29-initial-migration-plan.md`

- [x] Design the first `core` data abstractions replacing `DynData` [requires-frontier] [skill: multi]
  Why: The current catch-all data object is a central architectural bottleneck, and the migration contract explicitly calls for a smaller typed family with selective fast paths.
  Done when: `projects/dymad_migrate/architecture/data-layer-design.md` specifies the initial semantic series types, the first storage/layout specializations to implement, and the exact legacy call sites that will migrate first.
  Priority: high
  Evidence: `projects/dymad_migrate/architecture/data-layer-design.md` defines `RegularSeries`/`GraphSeries`/`LatentSeries`/`DerivedSeries`, the first four layout specializations, and a phased migration order with concrete legacy file:line call sites.
  Verification: `rg -n \"^## Initial semantic series types|^## First storage/layout specializations|^## Exact legacy call sites to migrate first|trajectory_manager.py:469|training/driver.py:262|checkpoint.py:135\" projects/dymad_migrate/architecture/data-layer-design.md`

- [x] Identify the first vertical migration slice [requires-frontier] [skill: orient]
  Why: The project should validate the new architecture on one end-to-end slice before broad refactors create cross-cutting churn.
  Done when: `projects/dymad_migrate/plans/` contains a follow-up slice plan naming the first end-to-end slice, the legacy entrypoints it replaces or wraps, the tests/examples used for parity, and the implementation sequence.
  Priority: high
  Evidence: Added `projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md` selecting the data-boundary slice, naming exact legacy entrypoints, and specifying in-scope parity gates.
  Verification: `rg -n "^## Slice name|^## In scope|trajectory_manager.py:159|checkpoint.py:64|test_assert_trajmgr.py|test_workflow_lti.py" projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md`

- [x] Design the transform migration contract for PyTorch-first fitted modules [requires-frontier] [skill: multi]
  Why: The target architecture depends on transforms becoming composable fitted `nn.Module` objects, but the compatibility path from current SciPy/NumPy-heavy code needs to be explicit before implementation.
  Done when: `projects/dymad_migrate/architecture/transform-layer-design.md` defines the base transform protocol, wrapper strategy for external numerical routines, and the first transform families to port.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/architecture/transform-layer-design.md` defining `TransformModule`, field-aware pipelines, transform specs, compatibility adapters, and the first transform families to port.
  Verification: `rg -n "^## Proposed base protocol|^## Transform spec and compatibility model|^## First transform families to port|TrajectoryManager|checkpoint.py:64" projects/dymad_migrate/architecture/transform-layer-design.md`

- [x] Design the typed model-spec compatibility layer [requires-frontier] [skill: multi]
  Why: The target contract replaces string maps with typed model specs, but migration needs a clear adapter path for current predefined names such as `LDM`, `KBF`, and related variants.
  Done when: `projects/dymad_migrate/architecture/model-spec-design.md` defines the proposed spec objects, compatibility adapters, and the minimal predefined-model factory surface required for the first milestone.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/architecture/model-spec-design.md` defining the `ModelSpec` family, rollout separation, predefined-model adapters, and the first migration entrypoints from `models/collections.py`, `helpers.py`, and `prediction.py`.
  Verification: `rg -n "^## Proposed typed spec family|^## Predefined model compatibility|^## Rollout separation|models/collections.py:8|models/helpers.py:155|models/prediction.py:97" projects/dymad_migrate/architecture/model-spec-design.md`

- [x] Design the training split from orchestration to phase primitives [requires-frontier] [skill: multi]
  Why: Training orchestration currently mixes too many concerns; the migration contract expects a cleaner split between data preparation, phase execution, state tracking, and execution control.
  Done when: `projects/dymad_migrate/architecture/training-layer-design.md` documents the target training components, their responsibilities, and the first legacy entrypoints to extract.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/architecture/training-layer-design.md` defining `CVDriver -> TrainerRun -> PhasePipeline -> Phase`, the `TrainerState`/`PhaseContext` split, and first legacy migration targets.
  Verification: `rg -n "^## Required hierarchy|^## State split|^## Legacy-to-target mapping|training/helper.py:9|training/stacked_opt.py:26|training/opt_base.py:19" projects/dymad_migrate/architecture/training-layer-design.md`

- [x] Prototype the facade/store/exec skeleton without moving core math yet [requires-frontier] [skill: execute]
  Why: The MCP-facing architecture should be validated early at the boundary level, but without polluting the core numerical work before the data/model seams are understood.
  Done when: `modules/dymad_migrate/` contains a minimal non-invasive skeleton for `facade`, `store`, and `exec`, plus at least one typed handle flow documented against the project plan without changing the numerical behavior of existing core modules.
  Priority: medium
  Evidence: Added `modules/dymad_migrate/src/dymad/facade/`, `modules/dymad_migrate/src/dymad/store/`, and `modules/dymad_migrate/src/dymad/exec/` with a typed-handle checkpoint-to-prediction request flow, plus plan documentation at `projects/dymad_migrate/plans/2026-03-30-facade-store-exec-skeleton.md`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py -q`

- [x] Design checkpoint/load-model compatibility as the first facade boundary [requires-frontier] [skill: multi]
  Why: Workflow tests repeatedly depend on `load_model(...)` plus prediction, so checkpoint/model loading is the most practical compatibility surface to preserve while introducing typed facade concepts.
  Done when: `projects/dymad_migrate/architecture/checkpoint-facade-design.md` describes how current checkpoint loading maps to typed facade/store responsibilities, including which legacy API shapes must remain available through shims.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/architecture/checkpoint-facade-design.md` with legacy `load_model` call-shape findings, compatibility API-shape requirements, ownership split across `core/facade/store/exec`, and staged shim migration gates tied to workflow tests.
  Verification: `rg -n "^## Legacy findings to preserve|^## Compatibility surface to keep|^## Boundary ownership|^## First shim design|^## Migration sequence|test_workflow_lti.py:167|test_workflow_sa_lti.py:106|core -> facade -> store -> exec|src/dymad/exec/workflow.py:17-40" projects/dymad_migrate/architecture/checkpoint-facade-design.md`

- [x] Design the spectral-analysis adapter boundary [requires-frontier] [skill: multi]
  Why: `sako` is a distinctive DyMAD capability but currently couples model loading, numerics, and plotting; migration needs an explicit adapter design rather than preserving that entanglement accidentally.
  Done when: `projects/dymad_migrate/architecture/spectral-analysis-design.md` specifies which pieces of `sako` remain pure core analysis, which pieces become adapters, and how parity is checked against `test_workflow_sa_lti.py`.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/architecture/spectral-analysis-design.md` defining legacy SA workflow coupling, explicit `core` vs adapter ownership, typed `SpectralSnapshot`/adapter contracts, and a parity gate strategy anchored to `tests/test_workflow_sa_lti.py`.
  Verification: `rg -n '^## Purpose|^## Boundary ownership|^## Parity strategy for .*test_workflow_sa_lti.py|^### Core ownership|^### Adapter ownership|tests/test_workflow_sa_lti.py|SAKO|RALowRank' projects/dymad_migrate/architecture/spectral-analysis-design.md`

- [x] Diagnose `test_workflow_sa_lti.py::test_sa[4]` rerun and runtime warnings [requires-frontier] [skill: diagnose]
  Why: 2026-03-30 parity verification passed all required workflow files but `test_sa[4]` reran once and emitted `RuntimeWarning` values in `src/dymad/sako/sako.py:151`; migration should classify whether this is acceptable baseline noise or a stability bug before deeper spectral-boundary work.
  Done when: `projects/dymad_migrate/analysis/` contains a diagnosis note that (1) reproduces the rerun/warnings with exact command output, (2) identifies likely cause category (numerical instability, test nondeterminism, or expected behavior), and (3) states whether follow-up code changes are required before marking spectral parity stable.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-sa-lti-rerun-warning-diagnosis.md` plus exact command logs at `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns-default.log`, `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns0.log`, and `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns0-repeat.log`.
  Verification: `cd modules/dymad_ref && PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[4]' -vv && PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[4]' -vv --reruns=0`

## Mission gap tasks

- [x] Resolve the drift between the recorded first vertical slice and the implemented checkpoint-first skeleton [requires-frontier] [skill: orient] [zero-resource]
  Why: `projects/dymad_migrate/analysis/2026-03-30-status-review.md` found that the recorded first slice is still the data-boundary migration, while implementation has advanced on a checkpoint-first boundary shim instead.
  Done when: A dated plan/decision note either (a) re-baselines the first vertical slice to checkpoint-first with rationale, or (b) preserves the current data-boundary-first plan and decomposes the next implementation tasks needed to actually start that slice.
  Priority: high
  Evidence: Added `projects/dymad_migrate/plans/2026-03-30-first-slice-reconciliation.md`, which keeps the data-boundary slice as the first real vertical slice and treats the checkpoint-first work as enabling boundary infrastructure.
  Verification: `rg -n "^## Decision|^## Reconciled interpretation|^## Immediate implementation order|Keep the recorded first vertical slice as the data-boundary slice" projects/dymad_migrate/plans/2026-03-30-first-slice-reconciliation.md`

- [x] Route the public `load_model(...)` workflow through the compatibility boundary [requires-frontier] [skill: execute]
  Why: The status review found that `load_model_compat(...)` is real and tested, but real workflow callers still use the legacy `dymad.io.checkpoint.load_model(...)` path, so the new boundary is not yet the default surface exercised by workflow parity tests.
  Done when: `modules/dymad_migrate/src/dymad/io/load_model(...)` or an equivalent public shim routes through `facade/store/exec`, and at least one existing workflow test proves the boundary path is actually exercised.
  Priority: high
  Evidence: Public `load_model(...)` in `modules/dymad_migrate/src/dymad/io/checkpoint.py` now delegates to `load_model_compat(...)`, while execution materialization uses `_load_model_legacy(...)`; `tests/test_public_load_model_boundary.py` proves the public path traverses the boundary and `tests/test_workflow_lti.py` passes through the default public entrypoint.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py tests/test_checkpoint_e2e_layering.py tests/test_regular_series_adapter.py -q` and `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py -q`

- [x] Create a plan-to-code migration scoreboard for anti-drift checks [fleet-eligible] [skill: persist] [zero-resource]
  Why: The status review found that design artifacts are advancing faster than implementation, so future sessions need one file that states which planned seams are still design-only versus implemented and verified.
  Done when: `projects/dymad_migrate/architecture/migration-scoreboard.md` maps each major planned seam (`data`, `transform`, `model-spec`, `training`, `checkpoint-facade`, `spectral-analysis`) to (a) design artifact, (b) code artifact if any, (c) verification artifact if any, and (d) status (`design-only`, `prototype`, `adopted`, or `verified`).
  Priority: high
  Evidence: Added `projects/dymad_migrate/architecture/migration-scoreboard.md` with explicit seam-by-seam mappings, code artifacts, verification artifacts, and status values.
  Verification: `rg -n "^## Scoreboard|^\\| `data` |^\\| `checkpoint-facade` |^\\| `spectral-analysis` |design-only|prototype|verified" projects/dymad_migrate/architecture/migration-scoreboard.md`

- [x] Implement the first real data-boundary seam for regular trajectories [requires-frontier] [skill: execute]
  Why: The recorded first vertical slice is still data-boundary-first, but no typed data seam has landed in code yet; this is the clearest next step to prevent the migration from remaining checkpoint-only.
  Done when: `modules/dymad_migrate/` contains an initial regular-series abstraction plus one adapter path for regular trajectory preprocessing, and a focused test proves one legacy `TrajectoryManager`-style path can emit/use that seam without changing downstream numerical behavior.
  Priority: high
  Evidence: Added `modules/dymad_migrate/src/dymad/core/series.py` plus `modules/dymad_migrate/src/dymad/io/series_adapter.py`, and `TrajectoryManager._transform_by_index(...)` now emits typed regular series internally before adapting back to `DynData`; `tests/test_regular_series_adapter.py` verifies a regular preprocessing path round-trips through the seam.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_series_adapter.py -q`

- [x] Split parity reporting into reference-oracle status and migration-package status [requires-frontier] [skill: analyze] [zero-resource]
  Why: Current parity notes mix evidence from `modules/dymad_ref/` and `modules/dymad_migrate/`, which makes it harder to tell whether a claim is about the oracle baseline or the migrated implementation.
  Done when: A dated analysis note records the same selected workflow gate for both packages separately, with explicit command provenance and a short comparison section, and `projects/dymad_migrate/knowledge/parity-critical-workflows.md` points to this split verification convention.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-lti-split-parity-verification.md` and two separate logs for `tests/test_workflow_lti.py` in `dymad_ref` and `dymad_migrate`, and updated `projects/dymad_migrate/knowledge/parity-critical-workflows.md` with the split-verification convention.
  Verification: `rg -n "^## Selected gate|dymad_ref: PASS|dymad_migrate: PASS|invalid broad-run evidence" projects/dymad_migrate/analysis/2026-03-30-lti-split-parity-verification.md` and `rg -n "15 passed, 2 warnings" projects/dymad_migrate/analysis/2026-03-30-lti-parity-dymad_ref-pytest.log projects/dymad_migrate/analysis/2026-03-30-lti-parity-dymad_migrate-pytest.log`

- [x] Prove one public workflow now traverses the default migrated boundary path [requires-frontier] [skill: execute]
  Why: After rerouting `load_model(...)`, the project should have one regression test that verifies a real public workflow reaches `facade/store/exec` without relying on the explicit `load_model_compat(...)` test-only path.
  Done when: At least one existing workflow test or a new focused integration test asserts that the default public entrypoint traverses the boundary path, and the test passes in `modules/dymad_migrate`.
  Priority: medium
  Evidence: Added `modules/dymad_migrate/tests/test_public_load_model_boundary.py`, which calls the default public `dymad.io.load_model(...)` path and asserts the boundary traversal; `modules/dymad_migrate/tests/test_workflow_lti.py` also passes through the same default public entrypoint after the reroute.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_public_load_model_boundary.py -q` and `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py -q`

## Regular working slice tasks

- [x] Implement the minimal regular-series transform pipeline [requires-frontier] [skill: execute]
  Why: The regular data seam now exists, but the working slice is not real until transform application moves onto typed regular-series objects instead of stopping at legacy NumPy-list transforms.
  Done when: `modules/dymad_migrate/` includes a minimal regular-series transform pipeline covering the current regular `transform_x` / `transform_u` path, and a focused equivalence test compares its output to the current legacy regular transform path for at least one representative case.
  Priority: high
  Evidence: Added `modules/dymad_migrate/src/dymad/core/transform_pipeline.py` and routed regular preprocessing through it in `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`; added parity-focused equivalence coverage in `modules/dymad_migrate/tests/test_regular_series_adapter.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_series_adapter.py -q`

- [x] Route regular checkpoint prediction through typed regular-series payloads [requires-frontier] [skill: execute]
  Why: A regular working slice is not complete until checkpoint-time prediction uses the typed regular-series seam rather than reconstructing only legacy `DynData` objects in the regular branch.
  Done when: the non-graph `predict_fn(...)` path in `modules/dymad_migrate/src/dymad/io/checkpoint.py` builds or consumes `RegularSeries` via the adapter layer before legacy model prediction, and focused tests preserve current caller-visible behavior.
  Priority: high
  Evidence: Updated `modules/dymad_migrate/src/dymad/io/checkpoint.py` so the non-graph compatibility path builds a typed regular batch and applies `RegularSeriesTransformPipeline` before constructing the legacy runtime payload.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_slice_integration.py::test_regular_checkpoint_prediction_uses_typed_series -q`

- [x] Add one end-to-end regular-slice integration test [requires-frontier] [skill: execute]
  Why: The current focused tests verify the boundary and the data seam separately; the slice milestone needs one test that proves they work together on a real regular workflow path.
  Done when: a new automated test exercises regular trajectory preprocessing plus public checkpoint loading/prediction and asserts the typed regular-series seam is touched inside the flow.
  Priority: high
  Evidence: Added `modules/dymad_migrate/tests/test_regular_slice_integration.py`, which verifies both regular preprocessing and public checkpoint prediction touch the typed transform seam in one flow.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_slice_integration.py::test_regular_slice_integration_touches_typed_transform_seam -q`

- [x] Record the clean regular-slice parity gate in both packages [requires-frontier] [skill: analyze] [zero-resource]
  Why: The slice should be signed off against a clean regular-only gate before graph and spectral noise re-enter the picture.
  Done when: a dated analysis note records clean serial outcomes for `tests/test_assert_trajmgr.py`, `tests/test_assert_transform.py`, and `tests/test_workflow_lti.py` in both `modules/dymad_ref` and `modules/dymad_migrate`, with exact command provenance and any residual gap notes.
  Priority: high
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md` and persisted exact pytest output at `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_migrate-pytest.log` and `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_ref-pytest.log`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py tests/test_workflow_lti.py -q` and `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py tests/test_workflow_lti.py -q`

- [x] Promote the regular slice from prototype to milestone status (or record the blocker) [requires-frontier] [skill: govern] [zero-resource]
  Why: The scoreboard currently marks `data` as `prototype`; the project needs an explicit closure step that either upgrades the regular slice status or records exactly why it cannot yet be upgraded.
  Done when: `projects/dymad_migrate/architecture/migration-scoreboard.md` and `projects/dymad_migrate/README.md` are updated to mark the regular slice as `adopted`/`verified` or to record the remaining blocker with concrete evidence.
  Priority: high
  Evidence: Updated `projects/dymad_migrate/architecture/migration-scoreboard.md` so the regular `data` and `transform` seams are now marked `verified`, with the regular-slice parity note as the verification artifact.
  Verification: `rg -n \"\\| `data` |.*`verified`|\\| `transform` |.*`verified`\" projects/dymad_migrate/architecture/migration-scoreboard.md`

## Data/transform module-first migration tasks

- [x] Freeze the new data/transform scope and drop backward-compatibility as a primary constraint [requires-frontier] [skill: orient] [zero-resource]
  Why: The migration strategy has changed from compatibility-heavy vertical slicing to module-first replacement for data and transforms; that change needs to be explicit so future sessions do not drift back into shims-first work.
  Done when: a short analysis note records the scope decision, states that old public API compatibility is no longer a primary requirement for data/transform modules, and lists the downstream modules that should be treated as adapter consumers for now.
  Priority: high
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-data-transform-scope-freeze.md` and the module-first program plan at `projects/dymad_migrate/plans/2026-03-30-data-transform-module-first-migration.md`.
  Verification: `rg -n "^# Data/Transform Scope Freeze|backward compatibility is not a primary requirement|adapter consumers for now" projects/dymad_migrate/analysis/2026-03-30-data-transform-scope-freeze.md`

- [x] Define the final typed data contract for regular and graph series [requires-frontier] [skill: execute]
  Why: `RegularSeries` exists, but the full data migration needs the complete semantic contract before loaders and transforms can be rewritten decisively.
  Done when: `modules/dymad_migrate/src/dymad/core/` includes the agreed regular/graph series and batch/layout types needed for current data workflows, with explicit semantics for time layout, raggedness, device/dtype moves, slicing, batching, and graph edge variation.
  Priority: high
  Evidence: Added `modules/dymad_migrate/src/dymad/core/graph_series.py`, exported the graph series types from `modules/dymad_migrate/src/dymad/core/__init__.py`, and added focused coverage in `modules/dymad_migrate/tests/test_graph_series_core.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_graph_series_core.py -q`

- [x] Replace `DynData` as the design center of trajectory preprocessing [requires-frontier] [skill: execute]
  Why: The migration does not really start until `TrajectoryManager` and related preprocessing code build typed series objects directly instead of treating them as a side seam next to `DynData`.
  Done when: regular and graph preprocessing paths in `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` construct typed data objects first and adapt to legacy runtime objects only at explicitly marked downstream boundaries.
  Priority: high
  Evidence: Extended `modules/dymad_migrate/src/dymad/io/series_adapter.py` with graph adapters, updated `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` so `TrajectoryManagerGraph._transform_by_index(...)` now routes through `_transform_graph_series_by_index(...)`, and added `modules/dymad_migrate/tests/test_graph_series_adapter.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_series_adapter.py tests/test_graph_series_adapter.py -q`

- [x] Introduce a Torch-first transform module protocol and pipeline as the only new transform contract [requires-frontier] [skill: execute]
  Why: The legacy list-of-NumPy-array transform API will keep leaking across modules unless the new protocol becomes the sole target for new work.
  Done when: `modules/dymad_migrate/src/dymad/core/` exposes the canonical Torch-first transform base and pipeline interfaces, and new transform work is routed through that interface rather than `dymad.transform.base.Transform`.
  Priority: high
  Evidence: Added `modules/dymad_migrate/src/dymad/core/transform_module.py` and `modules/dymad_migrate/src/dymad/core/torch_transforms.py`, exported the new interfaces via `modules/dymad_migrate/src/dymad/core/__init__.py`, and verified them in `modules/dymad_migrate/tests/test_torch_transform_modules.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_torch_transform_modules.py -q`

- [x] Port stateless and fitted core transforms to native Torch implementations [requires-frontier] [skill: execute]
  Why: The core data migration cannot rely on autodiff-enabled transforms until the common transform families are native Torch modules.
  Done when: identity, scaler, delay embedding, lift/add-one, compose, and any other regular-workflow-critical non-NDR transforms used by current blocker workflows have Torch-native implementations plus focused equivalence tests against the legacy behavior where still useful.
  Priority: high
  Evidence: Added `LiftTransform` plus the Torch-native transform family in `modules/dymad_migrate/src/dymad/core/torch_transforms.py`, exported the surface in `modules/dymad_migrate/src/dymad/core/__init__.py`, and added focused equivalence coverage in `modules/dymad_migrate/tests/test_torch_transform_modules.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trans_lift.py tests/test_torch_transform_modules.py -q`

- [x] Add graph-series data specialization on the new typed contract [requires-frontier] [skill: execute]
  Why: The target data layer explicitly includes graph data; postponing graph entirely would leave `DynData` alive as the only serious graph abstraction.
  Done when: fixed-graph and variable-edge graph series/batch types exist on the new core data contract, and the graph trajectory-preparation path can emit them before any downstream legacy adaptation.
  Priority: high
  Evidence: Added the graph core types in `modules/dymad_migrate/src/dymad/core/graph_series.py`, added graph round-trip adapters in `modules/dymad_migrate/src/dymad/io/series_adapter.py`, and exposed `TrajectoryManagerGraph.create_graph_series_dataset(...)` plus `_transform_graph_series_by_index(...)` in `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_graph_series_adapter.py tests/test_graph_series_core.py -q`

- [x] Migrate graph-compatible transform application onto the new pipeline [requires-frontier] [skill: execute]
  Why: Data migration is incomplete if graph preprocessing still depends on the old transform stack and shape conventions.
  Done when: the graph preprocessing path applies state/control/edge transforms through the new transform pipeline with typed graph-series objects, covering at least the currently exercised graph transform families outside NDR.
  Priority: high
  Evidence: Updated `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` so graph preprocessing now routes through `_build_graph_transform_pipeline()`, added `LegacyTransformModuleAdapter` in `modules/dymad_migrate/src/dymad/core/transform_module.py`, and verified parity against the exercised graph workflow tests in `modules/dymad_migrate/tests/test_assert_trajmgr_graph.py` and `modules/dymad_migrate/tests/test_graph_series_adapter.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trajmgr_graph.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q`

- [x] Wrap NDR transforms behind explicit Torch/autodiff adapters [requires-frontier] [skill: execute]
  Why: NDR is part of the data-transform surface area, but exact pure-Torch replacements are not required to move the architecture forward; explicit wrapped adapters are the practical intermediate target.
  Done when: `DiffMap`, `DiffMapVB`, `Isomap` (and any other live NDR transforms) are exposed through the new transform protocol with explicit gradient-support metadata and documented CPU/wrapper behavior, even if their internals still call external numerics.
  Priority: high
  Evidence: Added `modules/dymad_migrate/src/dymad/core/transform_builder.py` plus `NDRTransformModuleAdapter` in `modules/dymad_migrate/src/dymad/core/transform_module.py`, exported the new boundary from `modules/dymad_migrate/src/dymad/core/__init__.py`, and added explicit NDR wrapper coverage in `modules/dymad_migrate/tests/test_transform_builder.py`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_transform_builder.py -q`

- [x] Remove hidden legacy transform construction from loaders/checkpoint paths [requires-frontier] [skill: execute]
  Why: Even with new data types and new transforms, the migration will drift if checkpoint/load/model paths keep reconstructing the old transform stack directly.
  Done when: loader/checkpoint/preprocessing entrypoints build transforms through the new transform protocol and only use legacy transform objects behind narrow, temporary adapters if still needed.
  Priority: high
  Evidence: Added the explicit transform-builder boundary in `modules/dymad_migrate/src/dymad/core/transform_builder.py`, routed checkpoint loading through it in `modules/dymad_migrate/src/dymad/io/checkpoint.py`, updated `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` so typed regular/graph preprocessing uses builder-constructed modules, and kept graph edge-field legacy handling behind narrow typed adapters only.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_slice_integration.py tests/test_load_model_compat.py tests/test_public_load_model_boundary.py tests/test_assert_trajmgr_graph.py tests/test_graph_series_adapter.py tests/test_graph_series_core.py tests/test_torch_transform_modules.py -q`

- [x] Record data/transform migration verification gates and update the scoreboard [requires-frontier] [skill: analyze] [zero-resource]
  Why: The module-first migration needs its own sign-off criteria separate from the prior compatibility-heavy slice.
  Done when: a dated analysis note records the exact regular/graph/transform/NDR verification commands for the new module-first data/transform migration, and `projects/dymad_migrate/architecture/migration-scoreboard.md` is updated to reflect the new data/transform module status.
  Priority: high
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-data-transform-boundary-verification.md` and updated `projects/dymad_migrate/architecture/migration-scoreboard.md` to reflect the centralized transform-builder boundary plus explicit NDR and graph-edge adapter status.
  Verification: `rg -n \"^# Data/Transform Boundary Verification|^## Findings|19 passed, 1268 warnings\" projects/dymad_migrate/analysis/2026-03-30-data-transform-boundary-verification.md` and `rg -n \"transform_builder.py|NDR stages are explicit non-differentiable adapters|checkpoint hydration now constructs transforms through the central typed builder\" projects/dymad_migrate/architecture/migration-scoreboard.md`

- [ ] Design a deterministic replacement for the flake-managed `test_ndr[0]` parity exception [requires-frontier] [skill: diagnose] [zero-resource]
  Why: Compound follow-up from `projects/dymad_migrate/analysis/2026-03-30-parity-policy-adjudication.md` — parity is currently policy-satisfied, but remains risk-bound to a `<=4/30` flake threshold.
  Done when: A diagnosis/design note evaluates at least two deterministic alternatives (for example seeded fixture strategy, threshold redesign, or migration-side deterministic parity probe), chooses one recommended path, and updates `projects/dymad_migrate/knowledge/parity-critical-workflows.md` with either a replacement gate or an explicit deferred-decision rationale.
  Priority: medium

- [x] Adjudicate parity-critical gate status using the flake-aware NDR policy [requires-frontier] [skill: analyze] [zero-resource]
  Why: Mission gap - README Done-when requires preserving selected parity-critical workflows, but the latest aggregate gate note (`2026-03-30-parity-critical-gate-outcomes.md`) predates policy-based adjudication and still records parity as unstable.
  Done when: A dated analysis note in `projects/dymad_migrate/analysis/` recomputes blocker/milestone gate status using the policy from `knowledge/parity-critical-workflows.md` section `3a`, includes explicit arithmetic/provenance from existing logs, and records whether the parity-preservation Done-when condition is currently satisfied or still blocked.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-parity-policy-adjudication.md` with policy-adjusted blocker arithmetic (`3/30` flake adjudication against `<=4/30`) and an explicit parity Done-when status decision.
  Verification: `rg -n \"^# Parity Gate Adjudication Under the Flake-Aware NDR Policy|^## Findings|^## Decision|3/30|10/10|currently satisfied\" projects/dymad_migrate/analysis/2026-03-30-parity-policy-adjudication.md`

- [x] Implement checkpoint compatibility through facade/store/exec boundary [requires-frontier] [skill: execute]
  Why: Mission gap - no implementation task yet for README Done-when condition "`modules/dymad_migrate/` documents and implements the agreed `core` / `facade` / `store` / `exec` boundaries" (per ADR 0049).
  Done when: `modules/dymad_migrate/src/dymad/io/load_model_compat.py` (or equivalent boundary adapter location) routes checkpoint registration through `facade`/`store`, materialization through `exec`, and `modules/dymad_migrate/tests/test_boundary_skeleton.py` plus a new compatibility-focused test both pass.
  Priority: medium
  Evidence: Added `modules/dymad_migrate/src/dymad/io/load_model_compat.py`, extended `modules/dymad_migrate/src/dymad/exec/workflow.py` with `materialize_checkpoint_prediction(...)`, and added `modules/dymad_migrate/tests/test_load_model_compat.py` to verify the adapter plans via `facade/store` and materializes via `exec`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py tests/test_load_model_compat.py -q`

- [x] Verify parity-critical `load_model` workflows after boundary adapter landing [requires-frontier] [skill: analyze]
  Why: Mission gap - no explicit verification task yet for README Done-when condition "preserves the selected parity-critical legacy workflows against `modules/dymad_ref/`" (per ADR 0049).
  Done when: A migration analysis note records pass/fail outcomes for `test_workflow_lti.py`, `test_workflow_kp.py`, `test_workflow_ltg.py`, `test_workflow_ltga.py`, `test_workflow_ker_auto.py`, `test_workflow_ker_ctrl.py`, and `test_workflow_sa_lti.py`, with exact command output and any residual parity gaps.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-load-model-parity-verification.md` with file-level pass/fail outcomes and residual parity-gap notes, and persisted exact pytest output at `projects/dymad_migrate/analysis/2026-03-30-load-model-parity-pytest.log`.
  Verification: `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_ker_auto.py tests/test_workflow_ker_ctrl.py tests/test_workflow_sa_lti.py -q`

- [x] Expose one verified end-to-end checkpoint path matching MCP layering [requires-frontier] [skill: execute]
  Why: Mission gap - no open task yet for README Done-when condition "exposes at least one verified end-to-end path that matches the MCP layering pattern" (per ADR 0049).
  Done when: `modules/dymad_migrate` includes one runnable path from facade handle registration through exec planning/materialization for checkpoint prediction, validated by an automated test and documented against `modules/mcp_test/ARCHITECTURE_SUMMARY.md`.
  Priority: medium
  Evidence: Added `modules/dymad_migrate/tests/test_checkpoint_e2e_layering.py` to verify the end-to-end compatibility flow order (`exec -> facade -> store -> materialize`) and added `modules/dymad_migrate/docs/checkpoint-e2e-layering.md` mapping the DyMAD path to the reference layering in `modules/mcp_test/ARCHITECTURE_SUMMARY.md`.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_checkpoint_e2e_layering.py tests/test_boundary_skeleton.py tests/test_load_model_compat.py -q`

- [x] Diagnose `test_assert_trans_ndr.py::test_ndr[0]` parity-gate failure mode [requires-frontier] [skill: diagnose]
  Why: `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-outcomes.md` recorded a blocker-class failure (`Isomap recon. error`) while milestone workflows still passed; migration needs to classify whether this is deterministic baseline drift or run-to-run numerical instability before parity sign-off.
  Done when: A diagnosis note in `projects/dymad_migrate/analysis/` reproduces `test_assert_trans_ndr.py::test_ndr[0]` across repeated runs with exact outputs, reports failure frequency and normalized-error range, and states whether parity gating should treat this as a hard blocker or a flake-managed condition.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-ndr-idx0-parity-diagnosis.md` with repeated-run failure arithmetic (`3/30`), normalized-error ranges, and flake-managed gate classification, plus exact logs at `projects/dymad_migrate/analysis/2026-03-30-ndr-test-idx0-reruns0-repeat.log` and `projects/dymad_migrate/analysis/2026-03-30-ndr-isomap-ratio-probe.log`.
  Verification: `cd modules/dymad_ref && PYTHONPATH=src bash -lc 'for i in {1..30}; do echo \"===== RUN $i =====\"; pytest \"tests/test_assert_trans_ndr.py::test_ndr[0]\" --reruns=0 -q; ec=$?; echo \"EXIT_CODE=$ec\"; done'` and `cd modules/dymad_ref && PYTHONPATH=src python /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-ndr-isomap-ratio-probe.py`

- [x] Define flake-aware parity policy for `test_assert_trans_ndr.py::test_ndr[0]` [requires-frontier] [skill: analyze]
  Why: The completed diagnosis classified `test_ndr[0]` as flake-managed (`3/30` isolated-run failures, unseeded fixture), so the parity gate needs an explicit policy instead of single-run hard-block semantics.
  Done when: A short policy note updates `projects/dymad_migrate/knowledge/parity-critical-workflows.md` (or a linked analysis note) with the exact gating rule for this case (for example repeated-run threshold or deterministic fixture requirement), and `projects/dymad_migrate/TASKS.md` references the chosen rule as the parity-check standard.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-ndr-flake-policy.md` with explicit adjudication thresholds (`<=4/30` flake-managed, `>=5/30` blocker) and failure-type constraints, and updated `projects/dymad_migrate/knowledge/parity-critical-workflows.md` section `3a` to make this the recorded parity standard.
  Verification: `rg -n 'Special gate policy for .*test_assert_trans_ndr.py::test_ndr\\[0\\]|<= 4/30|>= 5/30|2026-03-30-ndr-flake-policy.md' projects/dymad_migrate/knowledge/parity-critical-workflows.md projects/dymad_migrate/analysis/2026-03-30-ndr-flake-policy.md projects/dymad_migrate/TASKS.md`

- [x] Quantify parity-critical workflow gate outcomes for the current migration baseline [requires-frontier] [skill: analyze]
  Why: Mission gap - no open task currently verifies the README Done-when condition "preserves the selected parity-critical legacy workflows against `modules/dymad_ref/`" after recent boundary-adapter changes (per ADR 0049).
  Done when: `projects/dymad_migrate/analysis/` contains a dated note with blocker/milestone parity-gate pass/fail counts from `projects/dymad_migrate/knowledge/parity-critical-workflows.md`, exact verification command(s), and a concise decision on whether parity is currently stable.
  Priority: medium
  Evidence: Added `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-outcomes.md` and persisted exact test output at `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-pytest.log`.
  Verification: `cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_dm.py tests/test_assert_trajmgr_graph.py tests/test_assert_graph.py tests/test_assert_transform.py tests/test_assert_trans_mode.py tests/test_assert_trans_lift.py tests/test_assert_trans_ndr.py tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_sa_lti.py tests/test_assert_resolvent.py tests/test_assert_spectrum.py tests/test_workflow_sample.py -q`

## Model runtime / prediction migration tasks

- [x] Design the typed model-runtime boundary after data/transform [requires-frontier] [skill: multi] [zero-resource]
  Why: The next highest-leverage module after data/transform is the model runtime / prediction layer, because it is the narrowest remaining boundary that still depends directly on `DynData`.
  Done when: `projects/dymad_migrate/architecture/model-runtime-boundary-design.md` defines the typed model input/context objects for regular and graph prediction, lists the exact legacy entrypoints to migrate first, and states which compatibility adapters remain temporary.
  Priority: high
  Evidence: Added `projects/dymad_migrate/architecture/model-runtime-boundary-design.md` to define the typed `RegularModelContext` / `GraphModelContext` boundary, the exact `checkpoint.py` prediction paths to migrate first, and the temporary `typed context -> DynData` compatibility rule.
  Verification: `rg -n "^# DyMAD Model Runtime Boundary Design|^## Legacy bottlenecks|^## First exact migration targets|^## Verification gates" projects/dymad_migrate/architecture/model-runtime-boundary-design.md`

- [x] Introduce a typed model context adapter for regular and graph series [requires-frontier] [skill: execute]
  Why: Prediction and model helpers need one stable typed input object before `DynData` can be removed from model-facing signatures.
  Done when: `modules/dymad_migrate/` contains typed model-context adapters built from `RegularSeries` / `GraphSeries`, and focused tests prove they preserve the current information needed by legacy model helpers.
  Priority: high
  Evidence: Added `modules/dymad_migrate/src/dymad/core/model_context.py`, exported it from `modules/dymad_migrate/src/dymad/core/__init__.py`, added helper-preservation coverage in `modules/dymad_migrate/tests/test_model_context_adapter.py`, and tightened `modules/dymad_migrate/src/dymad/io/series_adapter.py` so fixed-topology graph edge payloads round-trip cleanly through the temporary legacy adapter.
  Verification: `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_model_context_adapter.py -q`

- [ ] Route one regular prediction path through the typed model context [requires-frontier] [skill: execute]
  Why: The next module migration should establish one real regular execution path that consumes typed model context instead of depending on raw `DynData` assembly.
  Done when: one public regular prediction path in `modules/dymad_migrate/src/dymad/models/` or checkpoint-backed prediction consumes typed model context before any legacy adapter boundary, with regression coverage against the current workflow gate.
  Priority: high

- [ ] Route one graph prediction path through the typed model context [requires-frontier] [skill: execute]
  Why: Graph prediction is one of the main reasons `DynData` survives; the next module migration should prove the typed context also works for graph execution.
  Done when: one public graph prediction path in `modules/dymad_migrate/src/dymad/models/` or checkpoint-backed prediction consumes typed graph model context before any legacy adapter boundary, with regression coverage against the current graph workflow gate.
  Priority: high

- [ ] Split model helper/components away from direct `DynData` field access [requires-frontier] [skill: execute]
  Why: Helper-level field accessors in `models/components.py` are a major source of `DynData` coupling and need to be moved behind typed context readers before broader model/runtime cleanup.
  Done when: the first targeted helper/component family reads from typed model context or a narrow compatibility adapter rather than directly indexing `DynData` fields, and the affected prediction tests still pass.
  Priority: high

- [ ] Record regular and graph prediction parity gates for the typed model-runtime boundary [requires-frontier] [skill: analyze] [zero-resource]
  Why: The next module migration should be signed off with explicit regular and graph prediction evidence before training migration starts.
  Done when: a dated analysis note records the exact regular and graph prediction verification commands for the typed model-runtime boundary and compares the selected gates against `dymad_ref` where relevant.
  Priority: high

## DynData retirement planning tasks

- [ ] Inventory the remaining `DynData` dependency surface after Phase 1 [requires-frontier] [skill: diagnose] [zero-resource]
  Why: `DynData` retirement should be managed as a separate queue, and the first requirement is a precise inventory of which files and call paths still depend on it.
  Done when: `projects/dymad_migrate/architecture/dyndata-retirement-inventory.md` lists the remaining dependencies across model runtime, training, checkpoint, dataloader, and analysis paths with file references and dependency categories.
  Priority: high

- [ ] Define the phased `DynData` retirement plan and cutoff rules [requires-frontier] [skill: multi] [zero-resource]
  Why: Retirement spans multiple modules; the project needs an explicit phase order and deletion criteria so sessions do not remove adapters too early or leave dead compatibility seams indefinitely.
  Done when: `projects/dymad_migrate/plans/` contains a dated `DynData` retirement plan with phases, no-new-dependency rule, adapter deletion criteria, and the verification gates required before each phase.
  Priority: high

- [ ] Add a no-new-`DynData` dependency policy to the project record [fleet-eligible] [skill: govern] [zero-resource]
  Why: Retirement will drift if new code keeps reintroducing fresh `DynData` dependencies while the old ones are being reduced.
  Done when: the project README and/or a decision note explicitly states that new code must target typed series/model-context objects and may only touch `DynData` at shrinking compatibility boundaries.
  Priority: medium

- [ ] Define the first dataloader/batch replacement targets for post-runtime retirement [requires-frontier] [skill: multi] [zero-resource]
  Why: Even after model runtime migration, `DynData` will remain alive until batch collation and trainer inputs stop depending on it.
  Done when: a short design note identifies the first `RegularSeriesBatch` / `GraphSeriesBatch` replacements for dataloader and trainer consumption, with concrete legacy call sites named.
  Priority: medium
