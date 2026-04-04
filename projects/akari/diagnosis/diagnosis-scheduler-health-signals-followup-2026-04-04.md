## Diagnosis: repeated scheduler health alerts in the latest 20-session window
CI layers involved: L2 Workflow, L4 Methodology
Date: 2026-04-04

Examined artifacts:
- `.scheduler/metrics/sessions.jsonl`
- `projects/akari/diagnosis/diagnosis-scheduler-health-signals-2026-03-31.md`
- `projects/akari/diagnosis/diagnosis-empty-queue-timeout-x13yb5tx-82fb9a07-2026-03-31.md`
- `projects/dymad_migrate/README.md`
- `.scheduler/logs/“dymad-migrate”-2026-03-30T14-07-37-975Z.log`
- `infra/scheduler/src/health-watchdog.ts`
- `infra/scheduler/dist/health-watchdog.js`

### Error distribution
- Latest 20-session window in `.scheduler/metrics/sessions.jsonl`: `2026-03-30T13:01:44.361Z` through `2026-04-04T05:09:06.567Z`.
- `2/20 = 10.0%` rows are task-starvation sessions (`commitCount=0`, `filesChanged=0`, `projectsTouched=[]`):
  - `x13yb5tx-82fb9a07` at `2026-03-30T13:01:44.361Z`: `durationMs=3545920` (`59.1 min`), `timedOut=true`, `hasLogEntry=false`, `hasCommit=false`.
  - `x13yb5tx-d2999e90` at `2026-03-30T13:17:51.447Z`: `durationMs=27607` (`27.6 s`), `timedOut=false`, `hasLogEntry=false`, `hasCommit=false`.
- The duration outlier is the same first starvation row: max `3545920 ms`; median `437856 ms`; next-highest duration in the window is `667973 ms`.
- Neighboring recovery row:
  - `x13yb5tx-a8632cea` at `2026-03-30T14:07:40.377Z`: `durationMs=446487`, `commitCount=2`, `filesChanged=3`, `projectsTouched=["dymad_migrate"]`.
- Post-recovery stability:
  - In the `17` sessions after `x13yb5tx-a8632cea`, `0/17` are starvation rows and `0/17` timed out.
- Runtime health-check behavior before/after refresh of the compiled scheduler bundle:
  - Before rebuild, `node infra/scheduler/dist/cli.js watchdog --limit 20` reported `2 issue(s)`: `task_starvation` and `babysitting_detected`.
  - After `cd infra/scheduler && npm run build`, the same command reported `1 issue(s)`: `task_starvation` only.

### Systematic patterns
1. The reported `task_starvation`, `babysitting_detected`, and `durationMs` signals still collapse to the same localized `dymad_migrate` gap on `2026-03-30`; there is no evidence of a new multi-project regression.
2. The starvation cluster was transient. Once `x13yb5tx-a8632cea` regenerated mission-gap work and resumed normal execution, the next `17` sessions completed without starvation or timeouts.
3. The repeated `babysitting_detected` alert was a deployment-state artifact: source code already excluded starvation from babysitting classification, but the compiled `dist` bundle still used the old logic until rebuilt in this session.

### Root-cause hypotheses

#### Hypothesis 1: the current `task_starvation` alert is residual evidence from a transient `dymad_migrate` empty-queue window, not a present-day fleet-wide supply collapse
Layer: L2 Workflow
Evidence for:
- The only starvation rows in the latest 20-session window are `x13yb5tx-82fb9a07` and `x13yb5tx-d2999e90`, both from `“dymad-migrate”` on `2026-03-30`.
- Prior diagnoses already tied both rows to empty-queue recovery behavior and the later `14:07Z` recovery run explicitly logged `projects/dymad_migrate/TASKS.md` had no open tasks before generating a mission-gap task.
- After recovery, `17/17` later sessions were productive and non-timed-out.
Evidence against:
- The rolling 20-session monitor still reports `2/20 = 10.0%`, so the signal remains visible until those rows age out.
Test:
- Re-run the same windowed analysis once 20 newer sessions have replaced the `2026-03-30` rows; starvation should drop to `0` unless a new supply gap occurs.
Plausibility: high

#### Hypothesis 2: the repeated `babysitting_detected` alert came from source/dist drift in the scheduler deployment path rather than a new in-process babysitting event
Layer: L2 Workflow
Evidence for:
- `infra/scheduler/src/health-watchdog.ts` already filters babysitting with `!isTaskStarvation(s)`, but pre-rebuild `infra/scheduler/dist/health-watchdog.js` did not.
- Before rebuilding, `node infra/scheduler/dist/cli.js watchdog --limit 20` reported both `task_starvation` and `babysitting_detected`; after rebuilding `dist`, the same command reported only `task_starvation`.
- `git ls-files infra/scheduler/dist/health-watchdog.js infra/scheduler/dist/cli.js infra/scheduler/src/health-watchdog.ts` returned only `infra/scheduler/src/health-watchdog.ts`, so the runtime bundle is deployment state, not tracked repo state.
Evidence against:
- The underlying timeout row is real, so a stale bundle did not create the anomaly itself; it only preserved the already-fixed misclassification.
Test:
- Add a scheduler build-freshness guard or deployment check that detects when health-watchdog source is newer than the compiled bundle, then confirm a stale bundle is surfaced before monitoring runs.
Plausibility: high

#### Hypothesis 3: the `durationMs` anomaly is not a new complexity signal; it remains the already-diagnosed empty-queue timeout row
Layer: L4 Methodology
Evidence for:
- The max duration row is still `x13yb5tx-82fb9a07`, the same run previously diagnosed as an empty-queue timeout.
- No later session timed out, and the post-recovery max duration fell to `667973 ms`, far below the outlier.
Evidence against:
- The anomaly detector is behaving as designed for a rolling window: it will continue to flag the row while it remains in-sample.
Test:
- Re-run anomaly detection after 20 newer sessions; the duration outlier should disappear if no new timeout replaces it.
Plausibility: high

### Validity assessment
- Construct: `task_starvation` is still a valid description of the rolling window. `babysitting_detected` was invalid in the live runtime until the compiled bundle was rebuilt in this session.
- Statistical: the sample is only `20` sessions, but the anomaly cluster is fully concentrated in `2` adjacent rows from one project and is followed by `17` clean sessions.
- External: this diagnosis should not be generalized beyond the current akari deployment. It depends on both one historical `dymad_migrate` supply gap and the local source/dist deployment model for the scheduler.
- Ground truth: confidence is high for the distribution and runtime drift claims because they are supported by direct metrics rows, prior diagnoses, the recovery log, source-vs-dist code inspection, and before/after watchdog command output.

### Recommended actions
- Quick wins:
  - Rebuild `infra/scheduler/dist` after scheduler health-watchdog source changes so the live runtime matches the fixed source logic. Applied in this session.
  - Treat the current `2/20` starvation rate as a historical rolling-window residue from `2026-03-30`, not as evidence that present-day fleet supply is failing again.
- Experiments needed:
  - Add a build-freshness guard for scheduler monitoring so source/dist drift is detectable before health checks run.
  - Keep the existing empty-queue follow-up tasks (`scheduler-side empty-queue preflight` and `timeout-path provenance`) as the mechanism for removing the root empty-queue timeout itself.
- Validity concerns:
  - Do not treat a repeated `babysitting_detected` alert as new behavioral evidence unless the compiled runtime is known to include the latest watchdog logic.
  - Do not interpret the `durationMs` outlier as current workload growth; it is one historical timeout row still present in the rolling sample.
- Avoid:
  - Do not open a new babysitting investigation for `x13yb5tx-82fb9a07`; that row is already explained by the empty-queue diagnosis and by the stale-bundle misclassification.
  - Do not escalate task starvation as a repo-wide supply crisis while the post-recovery run history remains clean.

### Model-limit notes
No confirmed L1 root cause — skip.
