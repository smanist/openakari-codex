# 0003: MCP boundary stays above facade and exec

Date: 2026-03-29
Status: accepted

## Context

The target architecture contract and the `mcp_test` reference module both describe the same layering principle:

- pure implementation lives in `core`
- typed boundary logic lives in `facade`
- workflow execution lives in `exec`
- MCP publication sits above those layers

The migration is explicitly motivated in part by future MCP exposure. That creates pressure to add tool-shaped interfaces early, which risks leaking handle/storage/JSON concerns into the numerical code.

## Decision

DyMAD will adopt the same boundary rule as the reference architecture:

- `core` remains free of MCP, handle, storage, and agent-specific code
- `facade` is the stable typed boundary over `core`
- `exec` owns higher-level workflow planning/execution concerns
- MCP publication will consume `facade`/`exec` and will not call core internals directly

## Consequences

- Any early MCP prototype should be built as a boundary skeleton over `dymad_migrate`, not by instrumenting numerical modules directly.
- Future handle types and persistence logic belong to facade/store layers rather than to data/model/numerics internals.
- Refactor proposals that add MCP-shaped payloads to core objects should be rejected unless this decision is superseded.
