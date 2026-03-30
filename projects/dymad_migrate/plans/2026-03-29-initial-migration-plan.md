# Initial DyMAD Migration Plan

Date: 2026-03-29
Status: active
Project: dymad_migrate

## Goal

Establish the first reliable Akari workstream for DyMAD migration: persistent memory, bounded task decomposition, and a concrete sequence for turning the target-architecture contract into verified subsystem-by-subsystem work.

## Working assumptions

- `modules/dymad_ref/` is a frozen, read-only behavioral oracle.
- `modules/dymad_migrate/` is the only writable implementation target for this migration.
- `modules/mcp_test/` is a read-only architecture reference for the future `core -> facade -> exec -> mcp_server` layering pattern.
- The existing target-architecture contract in `modules/dymad_migrate/tasks/refactor_target_architecture.md` is the current design source of truth unless later superseded by project-local decisions.

## What knowledge this plan should produce

This plan is not just a refactor checklist. It should produce:
- a stable current-state map of the legacy package
- an explicit definition of parity-critical user workflows
- a migration matrix from legacy subsystems to target layers
- a first validated vertical slice proving the architecture works on real DyMAD behavior

## Phases

### Phase 0 — Orientation and policy capture

Deliverables:
- project README
- task queue
- this plan
- explicit write-scope policy

Why first:
- Akari cannot reliably drive multi-session migration without project-local memory.

### Phase 1 — Legacy discovery

Deliverables:
- `architecture/current-state.md`
- `knowledge/parity-critical-workflows.md`
- `architecture/migration-matrix.md`

Questions to answer:
- What are the real legacy subsystems, not just directory names?
- Which workflows/tests/examples are migration blockers?
- Where are the coupling hotspots that will resist layer extraction?

### Phase 2 — Design the first seams

Deliverables:
- `architecture/data-layer-design.md`
- `architecture/transform-layer-design.md`
- `architecture/model-spec-design.md`
- `architecture/training-layer-design.md`

Questions to answer:
- What is the minimum viable replacement for `DynData`?
- Which transform families need wrappers before pure PyTorch ports?
- Which current predefined model names must keep working through adapters?
- How should training split into reusable phase primitives and orchestration?

### Phase 3 — Validate the boundary architecture

Deliverables:
- minimal `facade` / `store` / `exec` skeleton in `modules/dymad_migrate/`
- one typed handle flow documented and tested

Questions to answer:
- Can DyMAD adopt the MCP-ready layering pattern without contaminating `core`?
- What concrete handle types and persistence rules are actually needed first?

### Phase 4 — First vertical migration slice

Deliverables:
- a follow-up slice plan
- implementation of one end-to-end migrated slice
- parity verification against selected reference behaviors

Selection criteria for the first slice:
- architecturally meaningful
- bounded enough to finish
- covered by existing tests/examples
- exercises the new architecture more than one isolated helper function would

## Recommended first-session execution order

1. Inventory `modules/dymad_ref/src/dymad/` and group files into real subsystems.
2. Inventory `modules/dymad_ref/tests/`, `examples/`, and `scripts/` to identify parity-critical workflows.
3. Write `current-state.md` and `parity-critical-workflows.md` before proposing implementation moves.
4. Build the migration matrix from those findings.
5. Only then decide the first vertical slice.

## Out of scope for the first milestone

- large-scale training runs
- broad MCP tool exposure
- migration of every example/script
- replacing all stringly-typed APIs at once
- implementing the full combinatorial family of data-layout specializations

## Risks

- The architecture contract is broad enough that implementation could fragment without a migration matrix.
- Legacy tests may encode behavior that is accidental rather than required; parity needs explicit classification.
- Early facade/store work could become speculative if done before the first data/model seams are understood.

## Immediate next tasks

- Inventory the legacy package structure and subsystem boundaries.
- Define the parity-critical workflows and regression gates.
- Create the legacy-to-target migration matrix.
