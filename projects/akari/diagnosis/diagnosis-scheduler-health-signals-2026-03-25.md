## Diagnosis: Scheduler health signals from `.scheduler/metrics/sessions.jsonl`
CI layers involved: L2 Workflow, L4 Methodology
Date: 2026-03-25

### Error distribution
- Dataset examined: 12 most-recent session rows in `.scheduler/metrics/sessions.jsonl` (timestamps 2026-03-24T21:53:49Z → 2026-03-25T15:23:17Z).
- **task_starvation (reported 1/12 = 8%)**: exactly 1 session matches “0 commits, 0 files, 0 projects”.
  - The only matching run is `ufbtd1yr-e9f312d6` at 2026-03-25T15:23:17Z (`triggerSource:"manual"`, `durationMs: 4939`, `numTurns: 1`).
  - For non-manual sessions in this window, starvation rate is **0/11 = 0%**.
- **durationMs anomaly (reported high)**: max duration is `1213196ms` (1213.2s, 20m 13s) for run `ufbtd1yr-1de304ea` at 2026-03-24T21:53:49Z (`jobName:"work-cycle"`, `triggerSource:"scheduler"`).
  - Duration summary over these 12 sessions: min `4939ms` (4.9s), median `472881.5ms` (7.9m), P95 `1175702ms` (19.6m), max `1213196ms` (20.2m).
  - In the same window, another long run exists: `ufbtd1yr-e4e04560` at 2026-03-25T04:19:37Z (`1175702ms`, 19m 36s).
- **ledger_inconsistent escalation**: `ledgerConsistent:false` appears in **5/12 sessions (41.7%)**, all on `backend:"codex"` and all touching `projects/pca_vs_ttd` (a `budget.yaml` project with `ledger.yaml` present but `entries: []`).
  - Affected runs: `rexr38aw-aa7666ff`, `uay03kry-b5c2b63b`, `ufbtd1yr-4fef1f97`, `rexr38aw-8c145956`, `uay03kry-0e273b8c`.
  - In all 5 cases, `costUsd: 0`.

### Systematic patterns
1. **Task starvation is a manual-run artifact, not a fleet supply problem.**
   - The only “no work” session is a manual smoke run (`triggerSource:"manual"`), not a scheduled or fleet worker session.
2. **Ledger inconsistency clusters on budgeted projects even when sessions report zero cost.**
   - Every `ledgerConsistent:false` session touched `projects/pca_vs_ttd` (has `projects/pca_vs_ttd/budget.yaml`) but recorded `costUsd: 0` and did not necessarily run any `consumes_resources: true` experiments.
3. **The duration outlier occurs during a known “Turns: 0 / empty output” instrumentation window.**
   - The log file for the duration-max session `.scheduler/logs/work-cycle-2026-03-24T21-53-48-340Z.log` records `Turns: 0` and an empty `## output` section, despite the metrics row reporting commits/files changed.

### Root-cause hypotheses

#### Hypothesis 1: `task_starvation` is over-counting by including manual test runs
Layer: L4 Methodology
Evidence for: The only starvation-matching session is `triggerSource:"manual"` (`ufbtd1yr-e9f312d6`), which is expected to have no commits/files if used as a smoke check.
Evidence against: None in the 12-row window.
Test: Exclude `triggerSource:"manual"` from `isTaskStarvation()` and re-run health analysis; starvation should drop to 0% for this window.
Plausibility: high

#### Hypothesis 2: `ledgerConsistent` is being enforced on “budget project touched” rather than “resources consumed”
Layer: L2 Workflow
Evidence for: `infra/scheduler/src/verify.ts` computes `touchedProjects` from diffs under `projects/*/budget.yaml` but does not gate ledger enforcement on `costUsd > 0`, and it accepts/denies “today entry” globally rather than per touched project.
Evidence against: If the intent is “every touch of a budget project must create a ledger entry (even for 0 cost)”, then the current behavior is consistent — but this contradicts the comments and escalation text (“Cost incurred…”).
Test: Update verification to require ledger entries only when (a) `costUsd > 0` for sessions that touched a budgeted project, or (b) modified `EXPERIMENT.md` with `consumes_resources: true`; require the entry in the relevant project’s `ledger.yaml` for `YYYY-MM-DD`.
Plausibility: high

#### Hypothesis 3: Duration anomaly flags borderline P95 exceedances (noise)
Layer: L4 Methodology
Evidence for: The duration outlier is only slightly above the computed P95 threshold in this window, which is consistent with percentile noise at small N and during instrumentation transitions.
Evidence against: If the operational goal is to triage any long sessions regardless of margin, then borderline P95 exceedances should still alert.
Test: Add a minimum excess guard (e.g., require >60s above P95 for duration anomalies) and confirm the borderline alert disappears while extreme outliers remain flagged.
Plausibility: medium

### Validity assessment
- Construct: Partially invalid as implemented — `task_starvation` currently mixes manual smoke runs with task-supply scarcity; `ledger_inconsistent` is triggered even when `costUsd: 0` and no resource-consuming experiments are evident.
- Statistical: Weak in this window (N=12). P95-based thresholds are volatile at this sample size, especially during instrumentation transition periods.
- External: After fixing the filtering/enforcement logic, the checks should generalize to future windows because they rely on stable fields (`triggerSource`, `costUsd`, `consumes_resources`).
- Ground truth: Some Codex sessions in this window have known instrumentation issues (`Turns: 0`, empty output logs), so health metrics that depend on turns/output should be treated as lower confidence until enough post-fix sessions accumulate.

### Recommended actions
- Quick wins:
  - Exclude `triggerSource:"manual"` runs from task-starvation reporting.
  - Fix ledger consistency verification to (a) actually use `costUsd` and (b) require same-day ledger entries only for resource-consuming work, checked per affected project.
  - Add a minimum “excess above P95” guard for duration percentile anomalies to avoid borderline alerts.
- Experiments needed:
  - After the fixes, re-run health checks on ≥20 post-fix sessions to re-estimate stable percentiles and confirm false positives disappear.
- Validity concerns:
  - Treat sessions with `numTurns: 0` and `durationMs > 60_000` as instrumentation-invalid for anomaly baselining until Codex turn counting is consistently non-zero.
- Avoid:
  - Do not “silence” ledger warnings by adding dummy ledger entries with fake costs; fix the enforcement criteria instead.

### Model-limit notes
No confirmed L1 root cause — skip.

