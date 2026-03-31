## Diagnosis: empty-queue timeout for `x13yb5tx-82fb9a07`
CI layers involved: L2 Workflow, L3 Interface
Date: 2026-03-31

Examined artifacts:
- `.scheduler/metrics/sessions.jsonl` (latest 20 rows)
- `.agents/skills/orient/SKILL.md`
- `projects/dymad_migrate/README.md`

### Error distribution
- In the latest 20 session rows, `2/20 = 10.0%` are zero-work starvation rows (`commitCount=0`, `filesChanged=0`, `projectsTouched=[]`). Both are `“dymad-migrate”` scheduler sessions:
  - `x13yb5tx-82fb9a07` at `2026-03-30T13:01:44.361Z`: `durationMs=3545920` (`59.1 min`), `timedOut=true`, `numTurns=1`, `modelUsage=null`.
  - `x13yb5tx-d2999e90` at `2026-03-30T13:17:51.447Z`: `durationMs=27607` (`27.6 s`), `timedOut=false`, `numTurns=1`, `modelUsage=null`.
- The neighboring productive `dymad_migrate` sessions do not show the same wall-clock behavior:
  - `x13yb5tx-6c37df95` at `2026-03-30T11:06:59.418Z`: `413307 ms`, `2` commits, `3` files, `tasksCreated=0`.
  - `x13yb5tx-a8632cea` at `2026-03-30T14:07:40.377Z`: `446487 ms`, `2` commits, `3` files, `tasksCreated=1`, `newAnalysisFiles=1`.
- Duration distribution for the same 20-row window:
  - min `27607 ms`
  - median `458853 ms` (`458.9 s`) from the local window summary script
  - P95 `667973 ms`
  - max `3545920 ms`
  - excluding `x13yb5tx-82fb9a07`, max drops to `667973 ms`

### Systematic patterns
1. The starvation condition is project-local, not systemic: the only two zero-work rows in the 20-session window are both `dymad_migrate`, and the other `18/20 = 90.0%` sessions are productive.
2. The timeout row and the quick-exit row share the same empty-work signature (`0` commits, `0` files, `0` projects, `numTurns=1`, `modelUsage=null`). The only major difference is wall-clock duration.
3. Empty-queue recovery currently depends on agent-side `/orient` execution, not scheduler-side control logic. The orient skill says the empty-queue fallback is to run mission-gap analysis and generate tasks, and the `2026-03-30` `dymad_migrate` README entry explicitly says the recovery run found no open tasks and generated a mission-gap task.

### Root-cause hypotheses

#### Hypothesis 1: the stall lived in the empty-queue task-selection flow because empty-queue recovery is model-mediated rather than scheduler-enforced
Layer: L2 Workflow
Evidence for:
- `.agents/skills/orient/SKILL.md` defines empty-queue fallback as prompt instructions (`run mission gap analysis`, `generate tasks`, `select from the generated tasks`), not as a scheduler preflight.
- Both zero-work rows show the same empty-queue surface (`0` commits/files/projects).
- `projects/dymad_migrate/README.md` records that the later recovery run found no open tasks and only became productive after generating a mission-gap task.
Evidence against:
- There is no per-turn trace from `x13yb5tx-82fb9a07`, so the exact stall point inside the first turn is not directly observable.
Test:
- Add a scheduler-side preflight that counts open tasks before spawn and either seeds a mission-gap task or exits with an explicit `empty_queue` result. Re-run an empty-queue project; the session should finish in under ~60 seconds instead of burning the full timeout.
Plausibility: high

#### Hypothesis 2: missing timeout-path provenance amplified the ambiguity, but it was an observability problem rather than the primary cause
Layer: L3 Interface
Evidence for:
- The timeout row preserves only `numTurns=1` and `modelUsage=null`; there is no scheduler log artifact or partial trace explaining what happened inside the first turn.
- That missing provenance is why the original watchdog could misread the row as babysitting.
Evidence against:
- The quick-exit starvation row also has sparse provenance (`numTurns=1`, `modelUsage=null`) but did not stall, so missing trace alone does not explain the timeout.
Test:
- Persist partial-turn provenance for timed-out Codex sessions (`turnStartedCount`, `turnCompletedCount`, preflight result, and any buffered tool summaries) and compare the next timeout against a quick empty-queue exit.
Plausibility: medium

### Validity assessment
- Construct: the data strongly supports "project-local empty queue" and strongly rejects "babysitting/training loop". The more specific claim "the stall was inside model-mediated empty-queue recovery" is an inference from workflow design plus neighboring run behavior.
- Statistical: sample size is small (`20` sessions), but the anomaly is concentrated in `2` adjacent rows from one project and one day, with a large duration gap (`3545920 - 667973 = 2877947 ms`) from the non-timeout maximum.
- External: this diagnosis should not be generalized to all scheduler jobs. It specifically addresses `dymad_migrate` on `2026-03-30`.
- Ground truth: metrics rows, orient skill text, and the `dymad_migrate` README agree on the empty-queue condition. Confidence is limited by the missing per-turn timeout trace.

### Recommended actions
- Quick wins:
  - Implement scheduler-side empty-queue preflight so task-supply recovery does not depend on the agent successfully executing `/orient` fallback logic.
  - Treat `x13yb5tx-82fb9a07` as an empty-queue workflow timeout, not as hidden long-running compute.
- Experiments needed:
  - Add timeout-path provenance to session metrics/logging, then reproduce an empty-queue session and verify whether the first turn reaches task discovery before interruption.
- Validity concerns:
  - Do not attribute the 59-minute duration to actual workload size; there is no commit/file/project output to support that interpretation.
- Avoid:
  - Do not "fix" this by loosening timeout alerts or by reclassifying it as babysitting. The actionable gap is deterministic empty-queue handling.

### Model-limit notes
No confirmed L1 root cause — skip.
