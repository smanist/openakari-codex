# Plan: work-session-mn6rn3kx (akari)

Date: 2026-03-25
Session: work-session-mn6rn3kx

Goal: Complete one `projects/akari/TASKS.md` item end-to-end with repo-persisted provenance (commands + outputs) and a README log entry.

## Steps

1. Run `/orient akari` (scoped): check git state, approvals, session metrics, and akari task queue.
2. Select 1 unblocked task from `projects/akari/TASKS.md` and attempt to claim it via the scheduler control API (proceed if API unavailable).
3. Classify scope using the resource-signal checklist.
4. Execute the task (prefer `projects/akari/analysis/*` artifact with recomputable numbers and explicit command provenance).
5. Commit changes and append a dated log entry to `projects/akari/README.md` with the session footer.

