# 0001: Module roles and write scope

Date: 2026-03-29
Status: accepted

## Context

The DyMAD migration now lives inside an Akari repo that contains three related modules:

- `modules/dymad_ref/`
- `modules/dymad_migrate/`
- `modules/mcp_test/`

Autonomous and semi-autonomous sessions need an explicit, persistent rule for which modules are writable and which exist only as references. Without that rule, future sessions risk editing the behavioral oracle or the architecture example instead of the migration target.

## Decision

- `modules/dymad_ref/` is the frozen reference package and is read-only during migration work.
- `modules/mcp_test/` is a read-only architecture reference for the MCP-ready layering pattern.
- `modules/dymad_migrate/` is the only writable implementation target for the migration.

Any change proposal that would modify `modules/dymad_ref/` or `modules/mcp_test/` should be treated as a separate explicit decision, not as routine migration work.

## Consequences

- Akari/Codex sessions can assume a stable behavioral oracle.
- Task descriptions and plans should only assign code changes under `modules/dymad_migrate/`.
- Discovery notes may cite `dymad_ref` and `mcp_test`, but implementation tasks should not target them.
