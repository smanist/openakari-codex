# 0002: Discovery-first migration with compatibility adapters

Date: 2026-03-29
Status: accepted

## Context

The target architecture contract is broad and touches data abstractions, transforms, model specs, training workflows, and future MCP exposure. A direct rewrite would create high risk of parity drift, while purely local edits inside the legacy structure would preserve existing coupling.

The legacy package also has multiple workflow-level tests that cross package boundaries, so migration needs to be guided by explicit parity gates rather than by directory-level refactors alone.

## Decision

The migration will proceed in this order:

1. discover and document the current subsystem boundaries
2. define parity-critical workflows and regression gates
3. map legacy subsystems to target layers
4. choose one vertical slice
5. migrate with compatibility adapters and shims where needed

The migration will not start with a big-bang rewrite.

## Consequences

- Early work focuses on current-state mapping and parity classification rather than immediate code movement.
- Compatibility adapters are an intended tool, not a temporary failure of ambition.
- Completion of a vertical slice matters more than broad but shallow partial refactors.
