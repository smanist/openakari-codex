# DyMAD Migration Done-When Closure Adjudication

Date: 2026-03-31
Status: completed

## Purpose

Evaluate whether the project `Done when` criteria in `projects/dymad_migrate/README.md` are fully satisfied after the `DynData` retirement work, and record an explicit status decision with command-level provenance.

## Done-when condition mapping

The project `Done when` statement requires all three conditions:

1. `modules/dymad_migrate/` documents and implements agreed `core` / `facade` / `store` / `exec` boundaries.
2. Selected parity-critical workflows are preserved against `modules/dymad_ref/`.
3. At least one verified end-to-end path matches the MCP layering pattern described in `modules/mcp_test/ARCHITECTURE_SUMMARY.md`.

### 1) Layer boundaries documented and implemented

Documented evidence:
- `modules/dymad_migrate/tasks/refactor_target_architecture.md`
- `projects/dymad_migrate/architecture/migration-scoreboard.md`

Implementation evidence:
- `modules/dymad_migrate/src/dymad/core`
- `modules/dymad_migrate/src/dymad/facade`
- `modules/dymad_migrate/src/dymad/store`
- `modules/dymad_migrate/src/dymad/exec`

Verification command:

```bash
ls -d modules/dymad_migrate/src/dymad/{core,facade,store,exec}
```

Observed output:
- all 4 layer directories exist.

Condition verdict: satisfied.

### 2) Parity-critical workflows preserved against reference

Existing policy and parity records:
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `projects/dymad_migrate/analysis/2026-03-30-parity-policy-adjudication.md`
- `projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gate-verification.md`

Fresh verification commands (same selected gates in both packages):

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py -q
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py -q
```

Observed output:
- `modules/dymad_migrate`: `26 passed, 2 warnings in 20.08s`
- `modules/dymad_ref`: `26 passed, 2 warnings in 19.96s`

Condition verdict: satisfied for the selected blocker workflow gates with package-to-package parity on this checkpoint.

### 3) Verified end-to-end path matches MCP layering pattern

Reference layering source:
- `modules/mcp_test/ARCHITECTURE_SUMMARY.md` (`core -> FacadeOperations -> DemoTools -> FastMCP` and MCP boundary above core implementation)

Migration-side end-to-end boundary tests:
- `modules/dymad_migrate/tests/test_checkpoint_e2e_layering.py::test_checkpoint_e2e_path_routes_facade_store_exec`
- `modules/dymad_migrate/tests/test_public_load_model_boundary.py::test_public_load_model_routes_via_boundary`

Verification command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_checkpoint_e2e_layering.py tests/test_public_load_model_boundary.py -q
```

Observed output:
- `2 passed, 2 warnings in 0.71s`

Condition verdict: satisfied (one end-to-end checkpoint/public-load path is verified through the layered boundary).

## Scoreboard asymmetry check

From `projects/dymad_migrate/architecture/migration-scoreboard.md`:
- total seams listed: `6`
- seams at `design-only`: `3` (`model-spec`, `training`, `spectral-analysis`)
- seams at `verified`: `3` (`data`, `transform`, `checkpoint-facade`) plus `model-runtime` verified as an additional mature seam in the same scoreboard

Interpretation:
- The project is not uniformly mature across all planned seams.
- This asymmetry does not block the README done-when criteria above, but it does justify follow-up execution tasks so the remaining design-only seams are not stranded.

## Decision

`README.md` project status decision: **remain `active`**.

Rationale:
- All three explicit done-when criteria are currently satisfiable from documented artifacts plus fresh command-level verification.
- However, remaining design-only seams are still open migration work; keeping the project active is the safer operational state until those seams move from design to code.

Follow-up requirement:
- Add explicit execution tasks for `model-spec`, `training`, and `spectral-analysis` seam implementation to avoid queue depletion and drift.
