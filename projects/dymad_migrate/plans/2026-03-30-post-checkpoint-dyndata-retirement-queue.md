# Post-Checkpoint DynData Retirement Queue

Date: 2026-03-30
Status: active
Depends on:
- `projects/dymad_migrate/plans/2026-03-30-dyndata-retirement-centered-path.md`
- `projects/dymad_migrate/architecture/dyndata-retirement-inventory.md`
- `projects/dymad_migrate/analysis/2026-03-30-checkpoint-datainterface-typed-boundary-verification.md`

## Purpose

Define the concrete execution queue after checkpoint utilities and `DataInterface`
stop directly constructing `DynData`.

This is not the formal gate-verification task. It is the technical queue that should
run next if the project wants to keep pushing retirement directly.

## Current state

Already migrated:

- typed regular and graph series
- typed transform pipeline and transform builder
- typed model-context boundary for regular and graph checkpoint prediction
- typed trainer-batch emission from `TrajectoryManager`
- first typed trainer family (`opt_linear` + `ls_update`)
- checkpoint and `DataInterface` moved off direct `DynData` construction on migrated paths

Still keeping `DynData` alive:

- prediction helpers in `models/prediction.py`
- internal runtime reconstruction in `models/model_base.py`
- recipe signatures in `models/recipes.py` and `models/recipes_corr.py`
- remaining trainer families in `training/opt_node.py`, `training/opt_weak_form.py`, and parts of `training/opt_base.py`
- utility consumers such as `sako/base.py`
- public export and reverse adapters in `io/__init__.py`, `io/series_adapter.py`, and `core/model_context.py`

## Execution order

1. Replace `models/prediction.py` direct `DynData` construction with typed runtime payloads
2. Replace `model_base` legacy runtime reconstruction with typed runtime contracts
3. Migrate recipe modules off `DynData` type signatures
4. Migrate `opt_node` to typed trainer batches
5. Migrate `opt_weak_form` and shared `opt_base` truth handling off `DynData`
6. Migrate remaining utility consumers such as `sako/base.py`
7. Remove public `DynData` export and reverse adapters when only staged deletion seams remain
8. Delete `io/data.py` once production-path references reach zero

## Rationale for this order

- prediction and `model_base` are the narrowest remaining runtime bottlenecks
- recipe modules should follow immediately so model-facing signatures stop advertising `DynData`
- trainer migration should continue after the runtime contract is cleaner, which reduces duplicate adapter logic
- utility cleanup should happen after the main model/trainer paths define the replacement patterns
- public export removal and file deletion are last because they should be mechanical consequences, not early forcing moves

## Working assumptions

- temporary compatibility adapters are still acceptable if they shrink the remaining `DynData` surface
- no new production path should add fresh `DynData` imports
- the delete step should only happen when `rg -n "\\bDynData\\b" modules/dymad_migrate/src/dymad -g '*.py'` is nearly clean and the remaining matches are all in files deleted in the same change set

## Expected checkpoint before deletion

Before deleting `io/data.py`, the remaining production-path references should be limited to:

- explicit deletion-staging shims
- compatibility adapters scheduled for removal in the same change set
- no public exports

## Not in scope

- training-architecture redesign
- spectral-analysis migration
- full model-spec migration
