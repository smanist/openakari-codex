# Diagnosis: Codex Work-Cycle Sessions Record 0 Turns and Empty Output

Date: 2026-03-25
Project: akari
Type: self-observation diagnosis

## Problem

Recent `work-cycle` sessions running on the `codex` backend produce an operational record with `Turns: 0` and an empty `## output` section, even when the post-session verifier reports non-zero file/commit activity. This breaks the system’s ability to self-observe via session logs and makes any JSONL-derived metrics suspect.

## Evidence (operational)

- Work-cycle log shows `Turns: 0` and no output:
  - `.scheduler/logs/work-cycle-2026-03-24T21-53-48-340Z.log`
- Another Codex work-cycle run recorded as an error:
  - `.scheduler/logs/work-cycle-2026-03-24T21-49-20-196Z.log` (`codex exited with code null`)
- Metrics row exists but reports `numTurns: 0`:
  - `.scheduler/metrics/sessions.jsonl` (currently 1 row) records `backend:"codex"` with `numTurns:0` and `stdout` effectively empty for the run.

## Evidence (code)

- The executor log format uses the agent result fields directly:
  - `infra/scheduler/src/executor.ts` writes `Turns: ${agentResult.numTurns}` and `## output\n${agentResult.text}`.
- The Codex backend’s stream parser currently assumes Claude-SDK-shaped messages:
  - `infra/scheduler/src/backend.ts` → `parseCodexMessage()` returns an assistant message only when `msg.type === "assistant" && msg.message?.content`.
  - `BaseCodexBackend.spawnCodex()` only increments turns on `msg.type === "assistant"` and only captures text from `msg.message.content` text blocks.
- The unified agent wrapper does not fall back to incrementally-tracked turns when the backend result lacks them:
  - `infra/scheduler/src/agent.ts` tracks turns via `incrementSessionTurns(sessionId)` on each `msg.type === "assistant"`, but the returned `AgentResult.numTurns` is taken from the backend’s `QueryResult.numTurns` (`r.numTurns ?? 0`).

## Evidence (confirmed Codex CLI stream schema)

On this deployment (`codex-cli 0.110.0`), `codex exec --json` emits *thread/turn/item* events rather than Claude-SDK-shaped `{type:"assistant", message:{content:[...]}}` lines. Representative lines include:

- `{"type":"thread.started","thread_id":"..."}`
- `{"type":"item.completed","item":{"type":"agent_message","text":"OK"}}`
- `{"type":"item.started","item":{"type":"command_execution","command":"/bin/zsh -lc ls",...}}`
- `{"type":"item.completed","item":{"type":"command_execution",...}}`

A sanitized sample is recorded at `infra/scheduler/src/__fixtures__/codex-cli-json-stream.sample.jsonl`.

## Likely root cause

The Codex CLI `--json` stream schema is not being parsed correctly by `parseCodexMessage()` / `spawnCodex()` for this deployment, so:

1. “assistant” events are not recognized (no `msg.message.content`), leading to `numTurns` staying at 0, and
2. the final “result” payload does not populate `result`/`output_text` as expected (or is never seen), leaving `text` empty.

Separately, even if the system were able to increment turns in-memory, `agent.ts` currently returns the backend-reported turn count rather than the in-memory counter, so the persisted `Turns:` field can still be wrong when a backend doesn’t report turns reliably.

## Fix (immediate)

1. Capture the actual Codex CLI `--json` line schema in a fixture:
   - Run a minimal `codex exec --json ...` and save 10–30 representative lines (assistant, tool, result) under `infra/scheduler/src/__fixtures__/` (or similar).
2. Update `parseCodexMessage()` / `spawnCodex()` to support that schema and to accumulate assistant text (append, don’t overwrite).
3. Make `agent.ts` fall back to the incrementally-tracked session turn count when `r.numTurns` is missing/zero.
4. Add a regression test that feeds the fixture lines through the parser and asserts non-empty `text` + `numTurns > 0`.

## Follow-ups

- Add a lightweight health check that flags `work-cycle` logs with `Turns: 0` and empty output as “instrumentation invalid”, so downstream analyses don’t treat them as meaningful sessions.
- Once fixed, create a baseline note for M1–M5 in `projects/akari/analysis/` using ≥10 non-idle sessions (per `projects/akari/plans/2026-03-24-self-improvement-measurement-local.md`).
