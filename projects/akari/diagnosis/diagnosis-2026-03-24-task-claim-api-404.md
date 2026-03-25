# Diagnosis: Task-Claim API Returns 404 Despite Source Support

Date: 2026-03-24
Project: akari
Type: self-observation diagnosis

## Problem

The autonomous work-cycle SOP recommends coordinating via task claiming (`POST /api/tasks/claim`). In this repo state, the running scheduler control API returns 404 (`{"error":"not found"}`), so sessions cannot reliably claim tasks to avoid duplicate pickup.

This is a self-observation failure: the system's coordination mechanism exists in source, but the live operational surface contradicts it.

## Evidence (operational)

- Running API returns 404:
  - `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"akari","agentId":"work-session-mn55jssv","taskText":"Write one self-observation diagnosis from operational evidence"}'`
  - Output: `{"error":"not found"}`
- Scheduler daemon is running compiled output:
  - `.scheduler/scheduler.pid` points to a live process: `node dist/cli.js start`

## Evidence (code / build)

- Source implementation exists:
  - `infra/scheduler/src/api/server.ts` routes `/api/tasks/claim`, `/api/tasks/release`, `/api/tasks/claims`.
- Compiled output does **not** include those routes:
  - `infra/scheduler/dist/api/server.js` has `/api/status` and push-queue routes, but no `/api/tasks/*` routes.

## Likely root cause

The scheduler daemon is running `infra/scheduler/dist/...` built from an older source snapshot. The repository contains updated `src/` code, but `dist/` was not rebuilt (and the running daemon was not restarted) after the task-claim endpoints were added.

## Fix (immediate)

1. Rebuild the scheduler (`cd infra/scheduler && npm run build`) so `dist/api/server.js` includes the task-claim routes.
2. Restart the scheduler daemon so the running process loads the updated `dist/` output.
3. Re-verify with the same `curl` call that `POST /api/tasks/claim` no longer returns `{"error":"not found"}`.

## Follow-ups

- Add a build-freshness guard so “`src` supports it but `dist` doesn’t” cannot recur (e.g., a test that asserts `dist/api/server.js` contains the task-claim routes, or a runtime warning on startup when `dist` is missing required handlers).
- Update `infra/scheduler/README.md` “Key endpoints” to include task-claim routes once live verification passes.
- Investigate why recent Codex work-cycle logs show `Turns: 0` and empty output even on “ok” runs (see `.scheduler/logs/work-cycle-2026-03-24T21-53-48-340Z.log`).
