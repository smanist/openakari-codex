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
