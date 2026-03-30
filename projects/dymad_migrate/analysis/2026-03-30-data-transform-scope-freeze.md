# Data/Transform Scope Freeze

Date: 2026-03-30
Status: complete

## Decision

The DyMAD migration will treat data and transforms as the next primary replacement program.

For these modules:

- backward compatibility with the old public API is no longer a primary requirement
- the new Torch-first typed contract is the target
- downstream modules should be treated as temporary adapter consumers

## Immediate consequences

The new design center should be:

- typed regular and graph series objects
- explicit series/batch layout types
- Torch-first transform modules and pipelines

The old design center should not be extended:

- `DynData`
- NumPy-list transform interfaces
- hidden `make_transform(...)` reconstruction in downstream entrypoints

## Downstream modules to treat as adapter consumers for now

- `modules/dymad_migrate/src/dymad/io/checkpoint.py`
- `modules/dymad_migrate/src/dymad/training/driver.py`
- `modules/dymad_migrate/src/dymad/models/model_base.py`
- `modules/dymad_migrate/src/dymad/models/prediction.py`

## Rationale

- data and transforms are the most upstream shared contracts in the package
- replacing them first reduces repeated shape/type assumptions elsewhere
- standard transforms can be migrated to Torch-native implementations now
- NDR can proceed behind explicit wrapped adapters without blocking the architectural migration
