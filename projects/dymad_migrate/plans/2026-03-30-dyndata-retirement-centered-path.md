# DynData Retirement Centered Path

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/plans/2026-03-30-model-runtime-next-module-and-dyndata-retirement.md`
- `projects/dymad_migrate/architecture/model-runtime-boundary-design.md`
- `projects/dymad_migrate/architecture/training-layer-design.md`
- `projects/dymad_migrate/architecture/migration-scoreboard.md`

## Decision

Yes: after the remaining two runtime tasks are finished, the project can center on
retiring `DynData` before taking the broader training, spectral-analysis, or model-spec
module migrations.

## Constraint

This is only viable if the work is framed as a data-object replacement campaign, not as
a full training-architecture rewrite.

Allowed:
- narrow edits across model, prediction, training, checkpoint, dataloader
- replacing `DynData`-typed signatures with typed series/model-context/batch objects
- temporary compatibility adapters where a call path cannot be removed in one step

Not in scope:
- full `PhasePipeline` / `TrainerRun` / `CVDriver` migration
- full typed model-spec builder migration
- spectral-analysis adapter work

## Why this is viable now

1. typed regular and graph series already exist
2. public regular and graph checkpoint prediction paths already cross a typed runtime boundary
3. the remaining `DynData` pressure is now concentrated in a finite set of call sites:
   model helpers, model signatures, prediction helpers, training batch consumers,
   checkpoint utilities, and dataloader collation

## Recommended order

### Phase 0 — finish the active runtime queue

1. split model helper/components away from direct `DynData` reads
2. record regular and graph runtime parity gates

### Phase 1 — make retirement explicit

3. inventory all remaining `DynData` dependency sites
4. record a no-new-`DynData` policy
5. define exact cutoff rules for deleting adapters and deleting `io/data.py`

### Phase 2 — replace batch/data-carrier boundaries

6. define typed trainer/dataloader batch contracts for regular and graph data
7. make `TrajectoryManager` and dataloaders emit typed batches on the new path
8. keep temporary trainer adapters only where a trainer still expects the old payload

### Phase 3 — replace model/prediction consumption

9. move model helper/component readers off direct `DynData` indexing
10. update `model_base` and prediction helpers to consume typed runtime payloads
11. remove direct `DynData` construction from checkpoint and `DataInterface`

### Phase 4 — replace trainer consumption

12. update `opt_node`, `opt_linear`, `opt_weak_form`, `ls_update`, and `opt_base`
    to consume typed batches or typed runtime/model contexts
13. verify regular and graph workflow parity on the typed batch path

### Phase 5 — delete the legacy object

14. remove `DynData` from public exports
15. delete reverse adapters still targeting `DynData` if no call sites remain
16. delete `modules/dymad_migrate/src/dymad/io/data.py`

## Practical implication

The next major focus after the last two runtime tasks should be:

- `DynData` retirement execution

not:

- training architecture
- spectral-analysis
- model-spec

## Success condition

`DynData` is retired when:

- no production path in `modules/dymad_migrate/src/dymad/` imports it except temporary
  deletion-staging shims, and those shims are empty or removable
- dataloaders, prediction, checkpoint, and trainer code operate on typed batches or typed
  model contexts
- the selected regular and graph workflow gates still pass
