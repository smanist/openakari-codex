# Diagnosis: Persistent Zero-Findings Sessions After Findings-First Gate Rollout

Date: 2026-03-26
Project: akari
Type: self-observation diagnosis

## Diagnosis: scheduler `work-cycle` zero-findings persistence
CI layers involved: L2 (workflow), L4 (methodology)

### Error distribution
- Window definition: latest `<=10` sessions with `triggerSource=="scheduler"` and `jobName` containing `work-cycle`.
- Source snapshot: `projects/akari/diagnosis/zero-findings-window-2026-03-26.json` (derived from `.scheduler/metrics/sessions.jsonl`).
- Non-zero findings rate: `0/9 = 0.0%` (`findings = newExperimentFindings + logEntryFindings`).
- Sessions with analysis artifacts but zero findings: `2/9 = 22.2%` (`newAnalysisFiles > 0` while findings remained `0`).
- Sessions with task creation but zero findings: `3/9 = 33.3%` (`tasksCreated > 0` while findings remained `0`).
- Structural output prevalence: `9/9 = 100%` (`structuralChanges > 0` in every session).
- Turn-count quality issue in the active window: `5/9 = 55.6%` sessions still report `numTurns = 0`.

### Systematic patterns
1. Findings remain zero while work is still happening.
   Evidence: all 9 sessions committed (`commits = 9`), but findings were `0` in every session.
2. The findings metric misses some knowledge-bearing outputs.
   Evidence: two sessions produced new analysis files, and three sessions created tasks, yet findings remained zero in all five sessions.
3. Task supply starvation existed at session start for `akari`.
   Evidence: from `git show HEAD:projects/akari/TASKS.md`, open tasks were `1`, unblocked open tasks were `0`, and the sole open task was externally blocked.

### Root-cause hypotheses

#### Hypothesis 1: Findings-first gate cannot force findings when the queue has no unblocked findings-producing tasks
Layer: L2 (workflow)
Evidence for: At session start, `projects/akari/TASKS.md` had zero unblocked tasks; the only open task was blocked (`wait for 10 post-intervention scheduler sessions`).
Evidence against: The gate can create mission-gap tasks, so starvation is not permanent if orient behaves correctly.
Test: Track the next 10 scheduler `work-cycle` sessions after this diagnosis and measure whether mission-gap task injection raises non-zero findings above `0/10`.
Plausibility: high

#### Hypothesis 2: Current findings accounting undercounts diagnosis/analysis work
Layer: L4 (methodology)
Evidence for: `2/9` sessions produced `newAnalysisFiles > 0`, and `3/9` produced `tasksCreated > 0`, but `newExperimentFindings + logEntryFindings` stayed zero for all sessions.
Evidence against: Not every analysis file or task necessarily contains a validated numerical finding.
Test: Add and test a stricter extraction rule that credits findings only when an analysis/diagnosis artifact contains explicit quantified finding statements with provenance.
Plausibility: high

#### Hypothesis 3: Legacy zero-turn sessions dilute short-window intervention measurement
Layer: L2 (workflow instrumentation)
Evidence for: `5/9` sessions in the current measurement window still report `numTurns = 0`, mostly from pre-fix runs.
Evidence against: The target metric is findings incidence, not turns, so this does not directly force a zero-findings outcome.
Test: Evaluate intervention impact on a post-rollout-only window (already planned as a blocked task) and report separately from mixed historical windows.
Plausibility: medium

### Validity assessment
- Construct: The current KPI is narrow (`newExperimentFindings + logEntryFindings`) and can miss knowledge produced via diagnosis/analysis artifacts.
- Statistical: The post-rollout sample is too small for intervention judgment (`2` scheduler sessions since rollout commit `26f8ee0` at `2026-03-25T23:05:39-04:00`).
- External: Findings are specific to `akari` work-cycle policy and may not transfer to project-specific jobs.
- Ground truth: Session metrics are machine-generated and auditable, but meaning depends on taxonomy definitions.

### Recommended actions
- Quick wins:
  - Add a metrics taxonomy fix task to bridge quantified diagnosis/analysis artifacts into findings counts when evidence is explicit.
  - Keep generating mission-gap tasks whenever `akari` has zero unblocked tasks to avoid idle gate behavior.
- Experiments needed:
  - Run the already-blocked post-rollout gate evaluation once 10 scheduler sessions accumulate.
- Validity concerns:
  - Avoid interpreting mixed pre/post windows as intervention effect size.
- Avoid:
  - Do not disable the findings-first gate yet; current evidence indicates task-supply and metric-taxonomy gaps, not gate failure.

### Model-limit notes
No confirmed L1 (model capability) root cause. Skip model-limit recording for this diagnosis.

## Provenance commands

```bash
node - <<'NODE' > projects/akari/diagnosis/zero-findings-window-2026-03-26.json
...reads .scheduler/metrics/sessions.jsonl and computes latest scheduler work-cycle window metrics...
NODE
```

```bash
node - <<'NODE'
...reads git show HEAD:projects/akari/TASKS.md and counts open vs unblocked open tasks at session start...
NODE
```
