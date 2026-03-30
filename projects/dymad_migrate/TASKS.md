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
