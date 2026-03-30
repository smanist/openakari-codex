# Data/Transform Module-First Migration

Date: 2026-03-30
Status: proposed
Project: dymad_migrate

## Goal

Migrate the data and transform subsystems first, module by module, while minimizing immediate changes to model/training/analysis modules.

This means:

- new data types and data transforms become the new internal contract
- downstream modules adapt through thin boundary shims only where necessary
- backward compatibility with the old public API is not a primary goal

## Feasibility statement

This is feasible now, with one important constraint:

- most regular/graph data handling can move to a new typed Torch-first core with limited downstream disruption
- most standard transforms can become Torch-native and autodiff-friendly
- NDR-family transforms should not block the migration, but some will need wrapped or approximate gradient contracts before a fully native Torch implementation exists

So the right target is:

- Torch-native data layer
- Torch-native transform interface
- Torch-native implementations for stateless/fitted transforms first
- wrapped CPU-backed autodiff adapters for NDR transforms as an intermediate step

## Scope rules

1. Prioritize `core` data and transform modules over training/model refactors.
2. Allow breaking API changes at the data/transform boundary.
3. Keep downstream changes thin and localized.
4. Do not require graph and NDR to be feature-complete before regular data lands.
5. Do not force a full training-stack redesign to validate the data/transform migration.

## Target module sequence

1. Data semantics and batch/layout types
2. Data loading and preprocessing boundary
3. Transform protocol and pipeline
4. Stateless/fitted Torch-native transforms
5. Graph-series data specialization
6. Wrapped NDR transforms with explicit gradient contracts
7. Downstream adapters for checkpoint/training/model consumers

## Exit condition for this program slice

The module-first data/transform migration is successful when:

1. `DynData` is no longer the design center
2. regular and graph data flow through typed series/batch objects
3. transform composition uses a Torch-first pipeline
4. non-NDR transforms needed by core workflows are Torch-native
5. NDR transforms are behind explicit wrapped adapters with clear gradient support status
6. downstream modules consume the new data/transform contract through narrow adapters instead of legacy-global assumptions
