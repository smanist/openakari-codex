# Claude/Cursor removal and model-only interface

Date: 2026-03-25
Project: akari
Status: completed

## Goal

Remove Claude- and Cursor-specific runtime surfaces from the live repo and make model selection the only user-facing execution choice, while keeping internal runtime routing for `codex`, `openai`, and `opencode`.

## Scope

1. Remove public backend selection from the scheduler CLI, Slack control flow, and persisted job schema.
2. Migrate legacy persisted `backend` and backend-preference state on load.
3. Delete Claude/Cursor runtime code, team-session wiring, and Anthropic SDK usage.
4. Collapse skill discovery to `.agents/skills/` and stop reading `.claude/plans/`.
5. Remove deprecated repo clutter: `CLAUDE.md`, `.claude/`, `.cursor/`.
6. Update live docs to present `AGENTS.md` and model-only routing as the current architecture.

## Verification plan

1. `cd infra/scheduler && npx tsc --noEmit`
2. `cd infra/scheduler && npm test`
3. Confirm no live imports remain from `@anthropic-ai/claude-agent-sdk`.
4. Confirm scheduler skill discovery works with only `.agents/skills/`.
5. Confirm event-agent plan discovery works from repo-native `plans/` roots.
