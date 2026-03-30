# DyMAD Migration Status Review After Akari-Driven Project Setup

Date: 2026-03-30
Status: completed
Related task: review current status after Akari modifications

## Scope

Review whether `modules/dymad_migrate/` is actually moving in the direction recorded by the project plan and architecture notes, rather than only accumulating migration documentation.

## Evidence reviewed

- Project plan and task history:
  - `projects/dymad_migrate/plans/2026-03-29-initial-migration-plan.md`
  - `projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md`
  - `projects/dymad_migrate/plans/2026-03-30-facade-store-exec-skeleton.md`
  - `projects/dymad_migrate/TASKS.md`
- Implemented migration boundary files:
  - `modules/dymad_migrate/src/dymad/facade/handles.py`
  - `modules/dymad_migrate/src/dymad/facade/operations.py`
  - `modules/dymad_migrate/src/dymad/store/object_store.py`
  - `modules/dymad_migrate/src/dymad/exec/context.py`
  - `modules/dymad_migrate/src/dymad/exec/workflow.py`
  - `modules/dymad_migrate/src/dymad/io/load_model_compat.py`
- Legacy-shape hotspots still present in the migration package:
  - `modules/dymad_migrate/src/dymad/io/checkpoint.py`
  - `modules/dymad_migrate/src/dymad/io/trajectory_manager.py`
  - `modules/dymad_migrate/src/dymad/io/data.py`
  - `modules/dymad_migrate/src/dymad/transform/base.py`
  - `modules/dymad_migrate/src/dymad/training/opt_base.py`
- Current test runs executed during this review:
  - `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py tests/test_load_model_compat.py tests/test_checkpoint_e2e_layering.py -q`
    - result: `4 passed, 2 warnings in 0.80s`
  - `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_ker_auto.py tests/test_workflow_ker_ctrl.py tests/test_workflow_sa_lti.py -q`
    - result: `74 passed, 7 warnings in 77.91s`

## Findings

### 1. Direction is broadly correct, but implementation is checkpoint-first while the recorded first vertical slice is data-boundary-first

The migration plan chose the first vertical slice as:

- `Series` + transform pipeline + checkpoint-compatible prediction adapter
- source: `projects/dymad_migrate/plans/2026-03-30-first-vertical-slice.md`

The implementation that actually landed is the checkpoint boundary skeleton:

- typed handles + in-memory store + executor planning/materialization
- source: `modules/dymad_migrate/src/dymad/facade/`, `store/`, `exec/`, and `io/load_model_compat.py`

But the planned typed seam objects from the design docs do not yet exist in the codebase:

- no `RegularSeries`, `GraphSeries`, `LatentSeries`, `DerivedSeries`
- no `TransformModule` or `TransformPipeline`
- no `ModelSpec`
- no `TrainerRun` / `PhasePipeline`

Interpretation:

- this is still directionally aligned with the layered architecture
- but it is not yet the recorded first vertical slice
- unless explicitly re-baselined, future sessions may think the data-boundary slice already started when it has not

### 2. The new boundary path is verified, but it is not yet the default workflow path

The compatibility path exists at:

- `modules/dymad_migrate/src/dymad/io/load_model_compat.py`

However the migration package still exports the legacy public path directly:

- `modules/dymad_migrate/src/dymad/io/__init__.py` exports `load_model`
- `modules/dymad_migrate/src/dymad/io/checkpoint.py` still owns the real `load_model(...)`

And the workflow tests still call `load_model(...)`, not `load_model_compat(...)`:

- `tests/test_workflow_lti.py:167`
- `tests/test_workflow_kp.py:163`
- `tests/test_workflow_ltg.py:161`
- `tests/test_workflow_ltga.py:140`
- `tests/test_workflow_ker_auto.py:140`
- `tests/test_workflow_ker_ctrl.py:133`
- `tests/test_workflow_sa_lti.py:106`

Interpretation:

- the boundary work is real and tested
- but current workflow parity does not yet prove that real callers are traversing the new boundary by default
- the current state is a verified parallel shim, not yet a migrated public surface

### 3. The migration package is still overwhelmingly legacy-shaped

The biggest files in `modules/dymad_migrate/src/dymad/` are still the same legacy hotspots:

- `io/trajectory_manager.py` (`904` lines)
- `training/opt_base.py` (`695` lines)
- `transform/base.py` (`649` lines)
- `utils/sampling.py` (`628` lines)
- `sako/base.py` (`581` lines)
- `io/data.py` (`523` lines)
- `io/checkpoint.py` (`401` lines)

During this review, `diff -u` between `modules/dymad_ref/src/dymad/io/trajectory_manager.py` and `modules/dymad_migrate/src/dymad/io/trajectory_manager.py` produced no diff, and the same was true for `io/checkpoint.py`.

Interpretation:

- Akari has improved planning, memory, and boundary discipline
- but the actual subsystem-by-subsystem migration has barely started inside the core legacy hotspots
- that is acceptable for this stage, but it should be described accurately as pre-migration plus one boundary skeleton

### 4. Verification status is stronger than the earlier analysis notes suggested

Some earlier project analysis focused on parity commands run against `modules/dymad_ref/`.
That is useful for reference-oracle status, but not sufficient to establish current migrated-package parity.

This review reran the migration-package workflow files directly in `modules/dymad_migrate/` and they all passed:

- `74 passed, 7 warnings in 77.91s`

Residual warning risk remains:

- `src/dymad/sako/sako.py:151` runtime warnings in `test_workflow_sa_lti.py::test_sa[4]`
- Torch JIT deprecation warnings

Interpretation:

- the current migration package is stable enough to keep moving
- parity evidence should now distinguish clearly between reference-package verification and migration-package verification

## Assessment

The project is heading in the right architectural direction, but only partially.

What is working:

1. Akari modifications materially improved project memory, task decomposition, and design continuity.
2. The `facade/store/exec` skeleton is a valid first boundary experiment and does not appear to have regressed current workflow behavior.
3. The migration package itself currently passes both the new boundary tests and the selected workflow tests.

What is not yet true:

1. The recorded first vertical slice has not actually been implemented as planned.
2. The new boundary path is not yet the default user-facing `load_model(...)` path.
3. The main architectural bottlenecks (`DynData`, `TrajectoryManager`, transforms, training state split) remain almost entirely legacy.

Bottom line:

- Yes, it is moving in the right direction.
- No, it has not yet crossed into real subsystem migration.
- The current state is best described as: strong project scaffolding + valid checkpoint-boundary proof-of-concept + preserved workflow parity, but not yet the planned data-boundary slice migration.

## Recommended next moves

1. Resolve the first-slice drift explicitly: either re-baseline the first vertical slice to checkpoint-first, or make the next implementation task the actual data-boundary slice (`Series` + transforms).
2. Route public `dymad.io.load_model(...)` through the compatibility boundary, or introduce a clearly designated migrated entrypoint and update at least one workflow to exercise it.
3. Keep parity reporting split into:
   - reference-oracle status (`modules/dymad_ref`)
   - migration-package status (`modules/dymad_migrate`)
