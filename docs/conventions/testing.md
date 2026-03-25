# Testing

Guidelines for modifying `infra/` code.

## Principles

- Prefer the most local test first (unit/integration near the change).
- Don’t “fix unrelated failures” as part of a change; file a task instead.
- Record verification commands + outputs in the relevant project log.

## Common commands

- For scheduler code: run the relevant `vitest` subset from `infra/scheduler/`.
- For Python tooling under `infra/`: run the focused `pytest` targets.

