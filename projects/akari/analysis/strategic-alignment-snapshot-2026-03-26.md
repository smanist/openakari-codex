# Strategic alignment snapshot — 2026-03-26

## Purpose

Create a project-local strategic question source for `akari` while `docs/roadmap.md` is absent.

## Inputs

- `projects/akari/README.md` mission and `Done when`.
- `projects/akari/TASKS.md` task inventory (all prior items completed before this session).
- `.scheduler/metrics/sessions.jsonl` (latest 10 sessions).

Observed operational facts:

- `docs/roadmap.md` does not exist in this checkout (`sed: docs/roadmap.md: No such file or directory`).
- Findings rate in latest 10 sessions is low: `2/10` sessions with non-zero findings (`newExperimentFindings + logEntryFindings`), with `6` total findings.
- Findings per dollar is currently not computable from recent data because `costUsd` is `0` for all of the latest 10 sessions.

## Active self-improvement questions (Q2 2026)

1. How should strategic alignment be sourced when the global roadmap artifact is missing?
   Evidence: orient expects `docs/roadmap.md`, but the file is absent.
   Linked task: `Create akari strategic alignment snapshot from current artifacts` (this task).

2. Which intervention can increase the non-zero-findings session rate above `20%` without increasing failed sessions?
   Evidence: latest window has findings in `2/10` sessions.
   Linked task: `Design an intervention to increase non-zero-findings session rate` (mission-gap task in `projects/akari/TASKS.md`).

3. Should `findings/$` remain the primary KPI for Codex-local sessions with `costUsd: 0`?
   Evidence: latest window yields `findings/$ = n/a` due to zero denominator.
   Linked task: `Define a primary efficiency KPI for zero-cost sessions` (mission-gap follow-up in `projects/akari/TASKS.md`).

4. Which knowledge fields best represent "research progress" vs "operational maintenance"?
   Evidence: latest window has `0/10` strict zero-knowledge sessions, but only `2/10` sessions with findings.
   Linked task: `Define a primary efficiency KPI for zero-cost sessions` (includes primary/fallback KPI definitions).

5. What minimum cadence of explicit self-observation analyses keeps orient recommendations from drifting to maintenance-only work?
   Evidence: many recent sessions are structural fixes in scheduler infrastructure.
   Linked task: none yet (task gap remains open).

## Task implications

New mission-gap tasks were added to `projects/akari/TASKS.md` during this session so strategic-question maintenance and findings-rate intervention both have explicit owners.
