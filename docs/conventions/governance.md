# Governance

This repo runs autonomous research sessions. Governance exists to keep work aligned, safe, and verifiable.

Canonical operating rules live in `AGENTS.md`. This file summarizes the most-used governance rules so they can be injected as lightweight context.

## Project priority and task selection

- Prefer projects with higher `Priority:` in `projects/*/README.md`.
- Prefer tasks that are:
  - unblocked (no `[blocked-by: ...]` tag),
  - mechanically verifiable (has a concrete **Done when**),
  - aligned with the project mission.

## Approval gates

Write an entry to `APPROVAL_QUEUE.md` (and follow the instruction there) before executing:

- Resource decisions (increase `budget.yaml` limits, extend deadlines).
- Governance changes (changes that alter what requires approval or how resources are allocated).
- Tool access requests (new APIs/tools/model access not configured).
- Production PRs to any production module (see `AGENTS.md` for definitions).

If the item is session-blocking per `AGENTS.md`, stop work after writing the approval request.

## “Repo is permanent” rule

- Facts discovered during a session should be recorded in-repo immediately (logs, tasks, decisions, analysis notes).
- If it isn’t in the repo, assume it will be forgotten.

