## Diagnosis: 2026-03-30 scheduler health anomaly cluster in `.scheduler/metrics/sessions.jsonl`
CI layers involved: L2 Workflow, L4 Methodology
Date: 2026-03-31

All arithmetic below is derived from the most recent 20 rows in `.scheduler/metrics/sessions.jsonl` (window: `2026-03-26T19:47:42.358Z` through `2026-03-31T05:10:44.547Z`), cross-checked against `projects/dymad_migrate/README.md` and the neighboring scheduler logs under `.scheduler/logs/`.

### Error distribution
- Productive sessions: `18/20 = 90.0%` touched a project and made at least one commit. The only non-productive rows are both `“dymad-migrate”` scheduler runs on 2026-03-30.
- Task starvation: `2/20 = 10.0%`.
  - `x13yb5tx-82fb9a07`: started `2026-03-30T12:02:38.441Z`, ended `2026-03-30T13:01:44.361Z`, `durationMs=3545920` (`59.1 min`), `timedOut:true`, `commitCount=0`, `filesChanged=0`, `projectsTouched=[]`.
  - `x13yb5tx-d2999e90`: started `2026-03-30T13:17:23.840Z`, ended `2026-03-30T13:17:51.447Z`, `durationMs=27607` (`27.6 s`), `timedOut:false`, `commitCount=0`, `filesChanged=0`, `projectsTouched=[]`.
- Babysitting signal: `1/20 = 5.0%`, but it is the same row as the first starvation session (`x13yb5tx-82fb9a07`).
- Duration distribution over the same 20 rows: min `28s`, median `422s`, P95 `812s`, max `3546s`. Excluding `x13yb5tx-82fb9a07`, the max falls to `668s`, so the anomaly is isolated to one run.
- Neighboring `dymad_migrate` context:
  - Previous successful scheduler run: `x13yb5tx-6c37df95`, `2026-03-30T11:00:06.111Z` → `2026-03-30T11:06:59.418Z`, `2` commits, `3` files, `projectsTouched=["dymad_migrate"]`.
  - Recovery run: `x13yb5tx-a8632cea`, `2026-03-30T14:00:13.890Z` → `2026-03-30T14:07:40.377Z`, `2` commits, `3` files, `projectsTouched=["dymad_migrate"]`. Its scheduler log explicitly says `dymad_migrate/TASKS.md` had no open tasks and that the session generated a mission-gap task before completing work.

### Systematic patterns
1. The reported `task_starvation`, `babysitting_detected`, and `durationMs` anomaly collapse into one localized `dymad_migrate` window on 2026-03-30 rather than a repo-wide degradation.
2. Both zero-work sessions sit between a productive `11:00Z` run and a productive `14:00Z` run; the `14:00Z` session explicitly confirms the project queue was empty and recovers by creating a new mission-gap task.
3. The long-duration row has no matching scheduler log artifact under `.scheduler/logs/`, while the neighboring productive runs do. That makes the timeout-stage behavior partially unobservable even though the metrics row is present.

### Root-cause hypotheses

#### Hypothesis 1: `dymad_migrate` temporarily ran out of actionable tasks, creating a project-local starvation window
Layer: L2 Workflow
Evidence for: `x13yb5tx-82fb9a07` and `x13yb5tx-d2999e90` both show `0` commits, `0` files, and `[]` touched projects; the next successful run at `2026-03-30T14:00:13.890Z` logs `dymad_migrate/TASKS.md currently has no open tasks` and immediately creates a mission-gap task; surrounding successful runs before and after the gap are ordinary 6-7 minute `dymad_migrate` work sessions.
Evidence against: the timed-out run lacks a scheduler log, so the exact point where it discovered the empty queue is not visible.
Test: reconstruct the project queue state from `projects/dymad_migrate/TASKS.md` + git history around `2026-03-30T11:06Z` to `2026-03-30T14:07Z`, or add queue snapshots to scheduler session logs before task execution starts.
Plausibility: high

#### Hypothesis 2: `babysitting_detected` is a methodology false positive because the watchdog counts timed-out starvation sessions as babysitting
Layer: L4 Methodology
Evidence for: the only babysitting row is also a textbook starvation row (`0` commits, `0` files, `0` projects); the relevant `dymad_migrate` tasks around this period are zero-resource code/analysis tasks recorded in `projects/dymad_migrate/README.md`, not long-running training/render jobs; the second starvation row exits in `27.6s`, showing the queue-empty condition itself does not imply in-process compute.
Evidence against: the exact reason `x13yb5tx-82fb9a07` stayed alive until timeout is still unresolved.
Test: exclude `isTaskStarvation(s)` from babysitting detection and re-run the watchdog over the same 20-session window; `babysitting_detected` should disappear while `task_starvation` remains `2/20`.
Plausibility: high

#### Hypothesis 3: the 59.1-minute duration reflects a stalled empty-queue/timeout path rather than actual workload complexity
Layer: L2 Workflow
Evidence for: `3546s` is effectively a full session timeout; the run produced no commits/files/projects and no scheduler log, while neighboring `dymad_migrate` sessions in the same codebase complete in `413s` and `446s`.
Evidence against: without a log or per-turn trace for `x13yb5tx-82fb9a07`, the stall point could be in runtime I/O, timeout handling, or prompt execution rather than specifically in empty-queue logic.
Test: add timeout-stage logging or persist partial output for timed-out runs, then reproduce an empty-queue session and confirm whether it exits quickly or stalls.
Plausibility: medium

### Validity assessment
- Construct: `task_starvation` is valid for this window, but `babysitting_detected` was overstating the issue until starvation sessions were excluded from that check.
- Statistical: the sample is only `20` sessions, but the anomaly is a tight two-row cluster in one project and one day, not a marginal percentile fluctuation.
- External: this diagnosis should not be generalized to all scheduler jobs. The evidence is specific to `dymad_migrate` between `2026-03-30T12:02Z` and `2026-03-30T14:08Z`.
- Ground truth: `.scheduler/metrics/sessions.jsonl`, `projects/dymad_migrate/README.md`, and neighboring `.scheduler/logs/“dymad-migrate”-*.log` files are consistent for the successful runs. Confidence is lower for the stalled run because its log artifact is missing.

### Recommended actions
- Quick wins:
  - Exclude task-starvation sessions from `babysitting_detected` so one empty-queue timeout cannot produce two different alarms. Implemented in `infra/scheduler/src/health-watchdog.ts` in this session.
  - Treat the `2/20` starvation rate here as a project-local `dymad_migrate` supply gap, not a repo-wide fleet quality regression.
- Experiments needed:
  - Diagnose why `x13yb5tx-82fb9a07` timed out without emitting a scheduler log while the later empty-queue run `x13yb5tx-d2999e90` exited in `27.6s`.
- Validity concerns:
  - Do not interpret `babysitting_detected` as “agent watched training in-process” unless the timeout row also shows evidence of real work (project touches, subprocess output, or non-starvation file activity).
- Avoid:
  - Do not react by broadening task-supply alarms across the whole repo; this cluster is one project window and already self-recovered once mission-gap generation reintroduced supply.

### Model-limit notes
No confirmed L1 root cause — skip.
