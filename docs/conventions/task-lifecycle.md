# Task lifecycle

Tasks live in `projects/*/TASKS.md`.

## Required fields (per task)

- An imperative task line with a checkbox.
- `Done when:` a mechanically verifiable completion condition.
- Prefer also including `Why:` and `Priority:`.

## Tags

Use tags to coordinate across autonomous sessions:

- `[in-progress: YYYY-MM-DD]` — prevents duplicate pickup.
- `[blocked-by: ...]` — only for blockers outside the agent’s control (approval, external dependencies).
- `[blocked-by: external: ...]` — external team work with uncertain timeline; include a date in the tag.
- `[approval-needed]` / `[approved: YYYY-MM-DD]` — approval gate coordination.
- `[zero-resource]` — safe when budget is exhausted; no external calls.

Routing metadata (if used):

- `[fleet-eligible]` — should be executable by fleet workers.
- `[requires-frontier]` — requires higher reasoning capacity.
- Legacy alias: `[requires-opus]` (accepted for backward compatibility; prefer `[requires-frontier]`).
- `[skill: <type>]` — routing by dominant capability.

## Partial completion rule

Do not mark `[x]` with “(partial)”. Split tasks or update the open task with remaining work.
