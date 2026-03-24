# Codex-First / OpenAI-Fallback Migration

Date: 2026-03-24
Project: akari
Status: proposed

## Goal

Redirect openakari toward a Codex-first operating model: use local Codex whenever possible, and use OpenAI API calls only where local execution is insufficient.

## Plan

1. Add a first-class `codex` backend to `infra/scheduler/src/backend.ts`, `infra/scheduler/src/types.ts`, and `infra/scheduler/src/cli.ts` rather than reusing `opencode`.
2. Refactor `infra/scheduler/src/agent.ts` so backend adapters, not the shared spawn path, own system prompt and tool configuration.
3. Audit deep-work and Slack/chat flows to classify each Claude-only capability as:
   - preserved on Codex
   - degraded on Codex
   - API fallback only
4. Keep `opencode` isolated as the GLM-5 fleet backend unless empirical results justify replacing it.
5. Rewrite top-level docs so `AGENTS.md` and `.agents/skills/` are primary, while Claude references become compatibility notes instead of defaults.
6. After the backend refactor lands, evaluate whether `auto` should prefer `codex` before `claude`, or whether local Codex should become the explicit recommended default and `auto` remain backward-compatible.

## Success criteria

- Scheduler jobs can run through a `codex` backend without Claude preset leakage.
- Work-session prompts and tool configuration are backend-specific rather than globally Claude-shaped.
- Deep-work/chat limitations on Codex are documented explicitly, with API fallback rules where needed.
- Public docs present a coherent Codex-first / OpenAI-fallback story.

## Notes

This plan deliberately separates "make Codex work" from "rewrite every interface around Codex." The first is mostly backend refactoring. The second requires explicit decisions about supervision parity, fleet economics, and documentation defaults.
