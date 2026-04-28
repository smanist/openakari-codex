## Diagnosis: scheduler health signals from the latest 20 scheduler sessions
CI layers involved: L2 Workflow, L4 Methodology
Date: 2026-04-28

Examined artifacts:
- `.scheduler/metrics/sessions.jsonl`
- `.scheduler/logs/smoothing-2026-04-28T01-42-15-075Z.log`
- `.scheduler/logs/smoothing-2026-04-28T03-18-28-080Z.log`
- `.scheduler/logs/smoothing-2026-04-28T03-46-06-236Z.log`
- `.scheduler/logs/smoothing-2026-04-28T05-29-43-065Z.log`
- `.scheduler/logs/smoothing-2026-04-28T05-55-27-671Z.log`
- `projects/smoothing/README.md`
- `projects/akari/TASKS.md`
- `infra/scheduler/src/health-watchdog.ts`
- `infra/scheduler/src/verify.ts`

### Error distribution
- Dataset examined: the latest `20` `triggerSource:"scheduler"` rows in `.scheduler/metrics/sessions.jsonl`, covering `2026-04-16T07:14:13.526Z` through `2026-04-28T05:55:27.977Z`.
- **task_starvation (reported `3/20 = 15%`)**:
  - `z2jh7475-2f653c76` (`dymad_dev`, `2026-04-23T15:30:14.749Z`, `586.8s`, `ok:false`, error `Reviewer changed worktree state`)
  - `g8e3qs2o-d189163a` (`smoothing`, `2026-04-28T01:25:21.212Z`, `1516.4s`, `ok:false`, error `Blocking findings remain after 2 fix rounds`)
  - `g8e3qs2o-522269ba` (`smoothing`, `2026-04-28T05:29:43.152Z`, `1777.8s`, `ok:false`, error `Blocking findings remain after 2 fix rounds`)
  - All three reported starvation rows are failed isolated-module sessions; among successful sessions in the same window the starvation rate is `0/17 = 0%`.
- **durationMs anomaly (reported on `g8e3qs2o-d5055b06`)**:
  - Window duration summary: median `658.6s`, max `1777.8s`.
  - The flagged run `g8e3qs2o-d5055b06` lasted `1522.2s`, with `7` turns, `3` review rounds, `integrationStatus:"integrated"`, `17` quantified findings, and `5` tasks created.
  - The same `smoothing` task cluster already produced two neighboring long rows:
    - `g8e3qs2o-d189163a` at `1516.4s` (`manual`, failed after review loop)
    - `g8e3qs2o-522269ba` at `1777.8s` (`manual`, failed after review loop)
  - Across the `10` smoothing sessions in the window, median duration is `927.0s`; the three `3`-review-round rows are the long-tail cluster.
- **ledger_inconsistent escalation**:
  - `4/20 = 20%` successful scheduler sessions have `ledgerConsistent:false`, all on `smoothing`, all with `costUsd: 0`:
    - `g8e3qs2o-9a951162`
    - `g8e3qs2o-e8b21421`
    - `g8e3qs2o-7916dfb6`
    - `g8e3qs2o-d5055b06`
  - `projects/smoothing/` has no `budget.yaml` or `ledger.yaml`.
  - The affected sessions were documentation, analysis, or design passes that edited `EXPERIMENT.md` files with `consumes_resources: true`, including the planned v2 benchmark record (`status: planned`) and the completed sweep record (`status: completed`).

### Systematic patterns
1. The reported starvation rows are not empty queues. They are failed isolated-review runs with explicit reviewer/integration errors, not successful sessions that found no actionable task.
2. The duration anomaly is concentrated in one review-heavy `smoothing` task lineage (`task-run-moi6sxpe`), not spread across the repo. The flagged session is productive, but it inherits the wall-clock cost of the isolated author + review loop.
3. The ledger warnings cluster on documentation-only edits to `consumes_resources` experiment records in a project that has no ledger files, while recording zero direct cost. The warning is therefore being triggered by weak proxy evidence rather than confirmed spend.

### Root-cause hypotheses

#### Hypothesis 1: `task_starvation` is misclassifying failed isolated-review sessions as supply failures
Layer: L4 Methodology
Evidence for:
- All `3/20` starvation rows are `ok:false`.
- Their errors (`Reviewer changed worktree state`, `Blocking findings remain after 2 fix rounds`) are execution/review failures, not “no tasks available”.
- No successful session in the same 20-row scheduler window has the starvation signature.
Evidence against:
- Earlier health diagnoses used zero-output rows as legitimate starvation evidence when they represented successful empty-queue recovery.
Test:
- Exclude failed sessions from `isTaskStarvation()` and keep the empty-queue signature for successful sessions. Regression coverage should show failed no-output rows no longer raise the supply alarm.
Plausibility: high

#### Hypothesis 2: the `durationMs` alert is a project-local isolated-review cluster, not a repo-wide slowdown
Layer: L2 Workflow
Evidence for:
- The flagged run is one of three long `smoothing` rows with `3` review rounds in the same task family.
- The final flagged row is productive (`17` findings, `5` tasks created) and ends `integrationStatus:"integrated"`, which is inconsistent with a stall or no-work session.
- Neighboring non-smoothing scheduler rows are mostly in the `400-1100s` range; the long tail is localized to isolated review loops on 2026-04-28.
Evidence against:
- The wall-clock duration is still materially high, so the alert is not noise in the sense of “nothing happened”; it captures real review overhead.
Test:
- If long isolated-review rows keep triggering alerts after starvation and ledger fixes age in, segment duration baselines by `executionMode` or `reviewRounds` and compare whether the anomaly remains.
Plausibility: high

#### Hypothesis 3: `ledger_inconsistent` is using “edited a consumes_resources experiment record” as a proxy for spend, which creates false positives on design/analysis sessions
Layer: L2 Workflow
Evidence for:
- All four affected rows have `costUsd: 0`.
- Two affected experiment records are non-running states when edited (`status: planned` for the v2 benchmark design, `status: completed` for analysis/report/design follow-up).
- Current verification logic treated any modified `EXPERIMENT.md` with `consumes_resources: true` as ledger-worthy, even when the diff only documented design or analysis work.
Evidence against:
- Actual experiment launches and completions do need ledger coverage somewhere, so the check cannot simply be removed.
Test:
- Require concrete run evidence (`progress.json`, `results/`, or `status: running`) before ledger warnings fire for zero-cost sessions. Regression coverage should show docs-only edits stay green while real run submissions still fail without a ledger entry.
Plausibility: high

### Validity assessment
- Construct: pre-fix `task_starvation` and `ledger_inconsistent` were partially invalid for this window. Both converted review/documentation behavior into misleading operational alarms. The duration alert is directionally valid, but it currently conflates shared and isolated review workflows under one `codex_cli` baseline.
- Statistical: moderate. The window has only `20` scheduler sessions, but the anomalies are tightly clustered: `3` failed no-output rows and `4` ledger warnings, all concentrated in known project-local workflows.
- External: the findings generalize to Codex isolated-module sessions more than to fleet/shared sessions. They should not be assumed to describe other runtimes without a comparable isolated-review loop.
- Ground truth: confidence is high because the metrics rows, scheduler logs, commit surfaces, and current verification/watchdog code all agree on the failure modes.

### Recommended actions
- Quick wins:
  - Exclude failed sessions from `task_starvation` classification. Applied in this session in `infra/scheduler/src/health-watchdog.ts` with regression coverage in `infra/scheduler/src/health-watchdog.test.ts`.
  - Require direct execution evidence before zero-cost sessions raise `ledger_inconsistent`. Applied in this session in `infra/scheduler/src/verify.ts` with regression coverage in `infra/scheduler/src/verify-compliance.test.ts`.
- Experiments needed:
  - If duration alerts continue on isolated-module work after these fixes, split duration baselines by `executionMode` or `reviewRounds` and compare alert quality before/after.
- Validity concerns:
  - The current `durationMs` anomaly still mixes isolated author+review loops with ordinary `codex_cli` sessions.
  - Post-fix validation still needs a fresh scheduler window; the ledger task should remain open until warnings stay at `0` over a new sample.
- Avoid:
  - Do not treat the latest `task_starvation` alert as fleet-supply collapse; these rows were review failures, not empty queues.
  - Do not add dummy ledger entries for design/analysis-only edits to `EXPERIMENT.md`; fix the inference rule instead.

### Model-limit notes
No confirmed L1 root cause — skip.

### Task bridge
- Updated the existing `projects/akari/TASKS.md` duration-anomaly task instead of creating a duplicate; this diagnosis satisfies the “outlier explained” criterion.
- Kept the existing ledger-validation task open, but narrowed its remaining work to post-fix confirmation over future sessions.
- No new task was created for `task_starvation` because the false-positive path was fixed in this session.
