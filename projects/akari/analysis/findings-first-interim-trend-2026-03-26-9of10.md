# Interim findings-first trend check (9/10 post-intervention sessions)

Date: 2026-03-26
Project: akari
Status: complete
Type: analysis

## Question

At the 9-session checkpoint after findings-first gate rollout, is the non-zero-findings trend improving, flat, or worse versus the pre-intervention baseline?

## Data and provenance

- Intervention timestamp: `2026-03-26T03:05:39Z` (commit `26f8ee0` in `git log`)
- Source metrics: `.scheduler/metrics/sessions.jsonl`
- Derived snapshot: `projects/akari/analysis/findings-first-interim-window-2026-03-26-9of10.json`
- Baseline reference: `projects/akari/plans/2026-03-25-findings-rate-intervention.md`
  - Baseline non-zero-findings rate: `2/9 = 22.2%`
  - Baseline failed-session rate: `0/9 = 0.0%`

## Findings

1. Post-intervention observed window size is `9` scheduler `work-cycle` sessions.
   - Provenance: `derived.post_window_scheduler_work_cycles = 9` in `findings-first-interim-window-2026-03-26-9of10.json`.
2. Post-intervention non-zero-findings rate is `0/9 = 0.0%`.
   - Arithmetic: `post_non_zero_findings_sessions / post_window_scheduler_work_cycles = 0/9`.
   - Comparison to baseline: `0.0% - 22.2% = -22.2 percentage points`.
3. Post-intervention failed-session rate is `0/9 = 0.0%`.
   - Arithmetic: `post_failed_sessions / post_window_scheduler_work_cycles = 0/9`.
   - Comparison to baseline: unchanged (`0.0%` vs `0.0%`).

## Interim trend classification

`worse`.

Rationale: the primary KPI remains below baseline (`0.0%` vs `22.2%`) while guardrail quality remains stable.

## Notes for final 10-session evaluation

- Remaining sessions until unblock threshold: `10 - 9 = 1`.
- Keep the final task blocked until `post_window_scheduler_work_cycles >= 10`.
- Next analysis checkpoint: final 10-session evaluation task.
