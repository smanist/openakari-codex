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

## Log

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

- Which legacy workflows are strict parity requirements for the first migration milestone, and which can be deferred behind compatibility shims?
- Which existing tests in `modules/dymad_ref/tests/` should be treated as migration blockers versus informative regression coverage?
- What is the first vertical slice that yields both architectural validation and practical user value: data abstractions, transforms, typed model specs, or training orchestration?
- For graph series, should `control`/`params` be node-wise only, global only, or union-typed with explicit validation rules?
- For variable-edge graph series, should the first implementation keep nested/jagged backing for parity or normalize immediately to packed edge tables?
- Should checkpoint fallback path behavior (`name.pt -> name/name.pt`) remain part of the stable compatibility API, or become compatibility-mode only?
- Should `predict_fn(..., ret_dat=True)` remain public and stable, or move behind an explicit facade debug/inspection API?
- Should the SA workflow warning/rerun behavior in `test_workflow_sa_lti.py::test_sa[4]` be treated as acceptable baseline noise or as a migration stability bug to isolate?
