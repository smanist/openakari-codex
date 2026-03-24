# Feasibility Assessment: Codex-First, OpenAI-Only-When-Needed

Date: 2026-03-24
Project: akari
Type: architecture assessment

## Question

Can openakari redirect its execution interfaces so that local Codex is used whenever possible, with OpenAI API usage reserved for cases where a local Codex path is not sufficient?

## Findings

### 1. Codex is supported as an interactive repo runtime, but not as a scheduler backend

- `AGENTS.md` is now the Codex-facing operating manual, and `.agents/skills/` is a first-class skill tree.
- Scheduler execution backends remain `claude`, `cursor`, `opencode`, and `auto` in `infra/scheduler/src/backend.ts`, `infra/scheduler/src/cli.ts`, and `infra/scheduler/src/types.ts`.
- Result: Codex works for human-invoked sessions in this repo, but not yet as a scheduler-native backend.

### 2. The unified spawn path is still shaped around Claude SDK assumptions

- `infra/scheduler/src/agent.ts` injects `systemPrompt: { type: "preset", preset: "claude_code" }` and `tools: { type: "preset", preset: "claude_code" }` for all spawned sessions.
- `infra/scheduler/src/sdk.ts` is a thin wrapper over `@anthropic-ai/claude-agent-sdk`.
- `infra/scheduler/src/team-session.ts` and parts of `infra/scheduler/src/backend.ts` import Anthropic SDK types directly.
- `decisions/0010-unified-agent-architecture.md` explicitly records the unified architecture around Claude presets.
- Result: adding a Codex/OpenAI backend is feasible, but the spawn layer must be de-Claude-ified first.

### 3. Non-Claude execution is already proven in limited form

- `infra/scheduler/src/backend.ts` already abstracts over three backends.
- `cursor` and `opencode` use CLI adapters rather than the Anthropic SDK.
- `infra/scheduler/src/event-agents.ts` already embeds skill content into prompts for weaker backends that may not support the Skill tool.
- Result: the repo already has the right architectural direction for backend plurality. This lowers migration risk.

### 4. The current `opencode` backend is not a Codex/OpenAI substitute

- `infra/scheduler/src/backend.ts` hardcodes the `opencode` backend to `glm5/zai-org/GLM-5-FP8`.
- `infra/scheduler/src/opencode-db.ts` assumes opencode-local session accounting and GLM-5 pricing.
- Fleet documentation and metrics also treat `opencode` as GLM-5-specific execution.
- Result: switching to `opencode` does not satisfy the goal. A real Codex/OpenAI path needs its own backend contract.

### 5. Deep-work and chat supervision contain Claude-only capabilities

- `infra/scheduler/src/event-agents.ts` auto-approves plan mode by calling `streamInput(...)` on a Claude-style live session handle.
- `infra/scheduler/reference-implementations/slack/chat/chat.ts` only forwards live human messages into an active session when `handle.backend === "claude"` and `streamInput` exists.
- Result: work-session execution is the easiest migration target. Deep-work/chat parity will need either equivalent Codex session controls or an explicit degraded mode.

### 6. Docs and mental model are still Claude-first

- Root docs still present `CLAUDE.md` as the primary operating manual in `README.md` and `docs/getting-started.md`.
- `infra/scheduler/README.md` still describes the scheduler as invoking `claude -p` in its architecture section and backend summary.
- Result: even if the code path is migrated, public/docs alignment work is required to make OpenAI-first usage legible.

### 7. OpenAI API use is already compatible with budget instrumentation

- `infra/budget-verify/verify.py` maps `llm_api_calls` to providers including `openai`.
- `infra/budget-verify/README.md` already documents gateway-routed OpenAI usage.
- Result: API-based OpenAI fallbacks are not blocked by the repo's budget/governance layer.

## Assessment

## Verdict

Yes, this migration is feasible.

The shortest correct statement is:

- local Codex first for human-driven and scheduler-driven work sessions: feasible after moderate scheduler refactoring
- OpenAI API as selective fallback: feasible now at the budget/accounting layer, but not yet unified with scheduler session control
- full replacement of Claude-shaped interfaces across work sessions, deep work, chat, and subagents: feasible, but not a one-step swap

## Why this is not a trivial swap

The biggest blockers are not model quality. They are interface contracts:

1. The shared spawn path currently assumes Claude preset prompts/tools.
2. Deep-work/chat supervision assumes Claude live-session message injection.
3. The repo's docs and decisions still teach users to think in Claude-first terms.
4. The only existing non-Claude "local backend" is GLM-5 via opencode, which is materially different from Codex.

## Recommended target architecture

1. Add a true `codex` backend for scheduler sessions instead of overloading `opencode`.
2. Move system-prompt/tool configuration out of `spawnAgent()` and into backend-owned adapters.
3. Keep `opencode` as the cheap fleet backend unless and until Codex proves superior on that workload.
4. Treat OpenAI API usage as a separate fallback path for cases where local Codex lacks required supervision, model access, or reliability.
5. Update docs so `AGENTS.md` + `.agents/skills/` become the primary path, while Claude support remains a compatibility option rather than the mental default.

## Migration difficulty by surface

| Surface | Difficulty | Notes |
|---|---|---|
| Human-driven repo use in Codex | low | already works today |
| Scheduler work-session backend | medium | needs new backend plus spawn-path cleanup |
| Deep work / live supervision | medium-high | depends on message injection parity |
| Slack/chat path | high | currently optimized around Claude live session control |
| Budget/accounting for OpenAI API | low | already structurally supported |
| Documentation/governance cleanup | medium | many Claude-first references remain |

## Recommendation

Pursue the migration, but do it in phases:

1. make Codex a first-class scheduler backend
2. remove Claude-specific prompt/tool assumptions from the shared spawn layer
3. explicitly classify which supervision features require API fallback
4. only then rewrite the docs and defaults to make Codex/OpenAI the primary interface

Do not treat `opencode` as "good enough OpenAI." It is currently a separate GLM-5 execution path with different capability and accounting assumptions.
