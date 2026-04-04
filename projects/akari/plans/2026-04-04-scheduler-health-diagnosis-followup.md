# Scheduler health diagnosis follow-up

Date: 2026-04-04
Project: akari
Status: in_progress
Type: diagnosis-follow-up

## Knowledge output

This work determines whether the current scheduler health alerts indicate a new systemic regression or a previously diagnosed anomaly still present in the rolling 20-session window, and whether any runtime artifact still needs repair.

## Plan

1. Recompute the latest 20-session health window from `.scheduler/metrics/sessions.jsonl` and isolate the exact rows behind `task_starvation`, `babysitting_detected`, and the `durationMs` outlier.
2. Cross-check the affected runs against prior akari diagnoses, `projects/dymad_migrate/README.md`, and available scheduler logs to decide whether the issue is systemic or transient.
3. Refresh any stale runtime artifact that still emits a known false positive, then record the diagnosis in `projects/akari/diagnosis/` and update project memory/tasks as needed.
