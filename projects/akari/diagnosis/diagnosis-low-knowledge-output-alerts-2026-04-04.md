## Diagnosis: low knowledge-output alerts for `x13yb5tx-cf5b40e4` and `x13yb5tx-5b9a104a`
CI layers involved: L2 Workflow, L4 Methodology
Date: 2026-04-04

Examined artifacts:
- `.scheduler/metrics/sessions.jsonl`
- `.scheduler/logs/“dymad-migrate”-2026-03-31T10-06-15-660Z.log`
- `.scheduler/logs/“dymad-migrate”-2026-04-04T06-04-48-098Z.log`
- `projects/dymad_migrate/README.md`
- `projects/dymad_migrate/TASKS.md`
- `projects/dymad_migrate/plans/2026-04-04-typed-phase-result-objects.md`
- `projects/akari/TASKS.md`
- `infra/scheduler/src/anomaly-detection.ts`
- `infra/scheduler/src/health-tasks.ts`

### Error distribution
- Successful `codex_cli` sessions with monitor-counted knowledge in `.scheduler/metrics/sessions.jsonl`: `64` rows, with `knowledgeTotal` distribution `{0:2, 1:21, 2:34, 3:1, 4:1, 7:1, 9:1, 10:1, 12:1, 16:1}`. Mean `2.344`; population stddev `2.682`.
- Successful `“dymad-migrate”` sessions with monitor-counted knowledge: `43` rows, with distribution `{0:2, 1:12, 2:23, 3:1, 4:1, 7:1, 9:1, 10:1, 12:1}`. So `12/43 = 27.9%` of productive `dymad_migrate` runs already score `knowledgeTotal=1`.
- The two dominant `dymad_migrate` knowledge shapes are:
  - `20/43 = 46.5%`: `newAnalysisFiles=1` and `structuralChanges=1` (`knowledgeTotal=2`)
  - `10/43 = 23.3%`: `structuralChanges=1` only (`knowledgeTotal=1`)
- For logged `dymad_migrate` successes (`hasLogEntry=true`), `11/40 = 27.5%` still score `knowledgeTotal=1`. So a score of `1` is not intrinsically a missing-log artifact.
- Affected session `x13yb5tx-cf5b40e4` (`2026-03-31T10:06:17.026Z`):
  - `durationMs=350518`, `commitCount=1`, `filesChanged=3`, `hasLogEntry=true`, `warningCount=0`
  - monitor-counted knowledge: `structuralChanges=1` only (`knowledgeTotal=1`)
  - task context from `.scheduler/logs/“dymad-migrate”-2026-03-31T10-06-15-660Z.log`: delete `modules/dymad_migrate/src/dymad/io/data.py` after retiring remaining production-path `DynData` references
- Affected session `x13yb5tx-5b9a104a` (`2026-04-04T06:04:50.516Z`):
  - `durationMs=286428`, `commitCount=1`, `filesChanged=3`, `hasLogEntry=false`, `hasCompleteFooter=false`, `warningCount=3`
  - raw knowledge metrics were `structuralChanges=1` and `tasksCreated=1`, but the anomaly detector excludes `tasksCreated`, so its monitor-counted `knowledgeTotal` was also `1`
  - the adjacent `2026-04-04` `dymad_migrate` window is otherwise extremely uniform: `16/17` successful runs scored `knowledgeTotal=2`, `1/17` scored `1`, giving mean `1.941` and stddev `0.235`

### Systematic patterns
1. `knowledgeTotal=1` is a routine outcome for productive `dymad_migrate` maintenance work, especially structural-only migration sessions. The first alert matches this recurring pattern.
2. The second alert is not just “low knowledge”; it is an interrupted autonomous run. The scheduler log shows the session asked for user guidance after an unexpected `projects/akari/plans/2026-04-04-scheduler-health-diagnosis-followup.md` file appeared mid-run, so the session never reached its README-log/verification closeout.
3. Two distinct anomaly alerts produced two indistinguishable tasks in `projects/akari/TASKS.md` because anomaly-generated task sources were keyed only by metric (`anomaly-detection:knowledgeTotal`) rather than by metric plus session.

### Root-cause hypotheses

#### Hypothesis 1: short-window sigma alerts are treating normal structural-only `dymad_migrate` maintenance sessions as anomalous when the comparison window is dominated by `knowledgeTotal=2` runs
Layer: L4 Methodology
Evidence for:
- `12/43` productive `dymad_migrate` sessions already have monitor-counted `knowledgeTotal=1`.
- `x13yb5tx-cf5b40e4` had a normal completion footprint (`hasLogEntry=true`, `warningCount=0`, project README entry present) and its task was a legitimate structural migration: retiring `DynData` and deleting `io/data.py`.
- The anomaly detector in `infra/scheduler/src/anomaly-detection.ts` counts `structuralChanges` but not `tasksCreated`, and compares raw `knowledgeTotal` with a symmetric sigma test.
Evidence against:
- A score of `1` is still genuinely lower than the more common `knowledgeTotal=2` pattern (`newAnalysisFiles=1` + `structuralChanges=1`), so the detector is not inventing a difference; it is over-interpreting a common maintenance mode.
Test:
- Compare anomaly behavior under project-local or workflow-local baselines, or suppress low-knowledge alerts for productive structural-only sessions (`hasCommit=true`, `filesChanged>0`, `projectsTouched!=[]`) and check whether true regressions are still surfaced.
Plausibility: high

#### Hypothesis 2: `x13yb5tx-5b9a104a` was a workflow interruption caused by interactive conflict handling in a scheduler-run autonomous session
Layer: L2 Workflow
Evidence for:
- `.scheduler/logs/“dymad-migrate”-2026-04-04T06-04-48-098Z.log` ends with: `I hit a hard-stop condition ... unexpected new file I did not create ... How do you want to proceed`.
- The session metrics row has the expected fallout of an interrupted closeout: `hasLogEntry=false`, `hasCompleteFooter=false`, `warningCount=3`.
- The same underlying task was later completed successfully and logged in `projects/dymad_migrate/README.md` under `### 2026-04-04 - Closed typed phase-result task and verified compatibility adapter boundaries`, so the low-knowledge alert came from the interrupted attempt, not from an inherently low-value task.
Evidence against:
- The exact trigger for the mid-run foreign-file appearance is only indirectly visible. The prior auto-commit (`be99deaf19b31ed3b5b93d5de4d73758f2dd594f`) shows the file already existed before the session, so the remaining uncertainty is why the session encountered it as a fresh conflict instead of resolving or ignoring it automatically.
Test:
- Reproduce the same state transition with an orphan auto-commit plus a scheduler-run `dymad_migrate` session and verify whether the agent should auto-ignore unrelated project plan files, auto-commit them before task work, or exit with a machine-readable blocked status instead of asking a user question.
Plausibility: high

#### Hypothesis 3: anomaly-task generation was losing per-session provenance, which made simultaneous low-knowledge alerts harder to investigate and close
Layer: L2 Workflow
Evidence for:
- `projects/akari/TASKS.md` contained two open tasks with identical text and identical `Why:` lines even though they referred to different sessions.
- `infra/scheduler/src/health-tasks.ts` generated anomaly task sources as `anomaly-detection:${metric}` with no session id.
Evidence against:
- The duplicate-task issue does not create the anomaly itself; it degrades follow-up quality after an alert is raised.
Test:
- Generate two anomalies for the same metric but different sessions and verify they become separate TASKS entries with distinct source IDs.
Plausibility: high

### Validity assessment
- Construct: `knowledgeTotal` measures monitor-counted artifact categories, not intrinsic research value. It currently counts `structuralChanges` but excludes `tasksCreated`, so a session that plans or queues work without producing an analysis artifact is intentionally scored lower than a session that also emits analysis.
- Statistical: the project-level distribution (`12/43` productive `dymad_migrate` runs at `knowledgeTotal=1`) is large enough to show the first alert is part of a recurring mode, not a unique failure. The second alert became a `>3σ` event because the immediate `2026-04-04` comparison window was unusually tight (`16/17` runs at `2`).
- External: these conclusions are specific to the current `dymad_migrate` migration workload and the current scheduler anomaly formula. They should not be generalized to research-heavy projects where `knowledgeTotal=1` is rare.
- Ground truth: confidence is high. The metrics rows, scheduler logs, project README entries, and task-plan artifacts tell a consistent story for both sessions.

### Recommended actions
- Quick wins:
  - Treat `x13yb5tx-cf5b40e4` as a methodological false positive on a normal structural migration session, not as a fresh quality regression.
  - Include `sessionRunId` in anomaly-generated task source IDs and `Why:` lines so simultaneous alerts for the same metric stay distinguishable. Applied in this session in `infra/scheduler/src/health-tasks.ts`.
- Experiments needed:
  - Decide whether low-knowledge anomaly detection should use project/workflow-local baselines or suppress productive structural-only sessions for maintenance-heavy projects like `dymad_migrate`.
  - Diagnose and harden autonomous handling of newly surfaced foreign worktree files so scheduler sessions do not stop at an interactive question.
- Validity concerns:
  - Do not interpret `knowledgeTotal=1` as “no useful work” for maintenance-heavy migration tasks.
  - Do not use the raw count of duplicated health tasks in `projects/akari/TASKS.md` as evidence of recurrence unless the task source preserves per-session provenance.
- Avoid:
  - Do not escalate `x13yb5tx-cf5b40e4` as a project regression requiring task-selection intervention; its README and commit history show a normal completed structural task.
  - Do not treat `x13yb5tx-5b9a104a` as proof of a broad recurring no-log-entry issue from a single interrupted run; it is a concrete workflow-interruption case that needs targeted follow-up.

### Model-limit notes
No confirmed L1 root cause — skip.
