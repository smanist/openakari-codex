# Intervention design: increase non-zero-findings session rate

Date: 2026-03-25
Project: akari
Status: planned
Type: intervention-design

## Knowledge output

This design tests whether a findings-first task-selection rule increases the share of sessions that produce explicit findings (`newExperimentFindings + logEntryFindings > 0`) without degrading execution quality.

## Experiment: Findings-first orient gate

Hypothesis: If `akari` applies a findings-first task-selection gate whenever rolling non-zero-findings rate is below 30%, then the next 10 scheduler sessions will reach at least a 40% non-zero-findings rate while keeping failed-session rate at or below 10%.

CI layers:
- L0 (code): `.scheduler/metrics/sessions.jsonl` instrumentation for findings and verification fields.
- L2 (convention): `/orient` ranking and task-writing conventions in `AGENTS.md` and `docs/sops/autonomous-work-cycle.md`.
- L3 (skill): `/orient` task selection behavior and `/compound fast` follow-up task surfacing.

Variables:
- Independent: Findings-first gate state
  - `control`: no explicit gate (historical baseline window)
  - `treatment`: gate enabled for task selection
- Dependent:
  - Primary metric: non-zero-findings session rate
    - Definition: `count(newExperimentFindings + logEntryFindings > 0) / total sessions in window`
    - Why: directly measures whether sessions are producing explicit findings.
    - Alternative rejected: total knowledge-field sum, because structural maintenance can inflate that sum without producing findings.
  - Guardrail metric: failed-session rate
    - Definition: `count(timedOut || !ok || !hasCommit || !hasLogEntry) / total sessions in window`
    - Why: intervention should not trade quality/compliance for findings.
- Controlled:
  - Session source: scheduler-triggered sessions only (`triggerSource == "scheduler"`)
  - Observation window size: fixed at 10 sessions before and 10 sessions after intervention start
  - Data source: `.scheduler/metrics/sessions.jsonl` only

Method:
1. Record baseline from the latest 10 scheduler sessions before intervention adoption.
   - Command:
     - `node - <<'NODE' ... NODE` (used in this session; see README log entry for exact output)
   - Baseline snapshot (this session):
     - `2/9 = 22.2%` non-zero-findings sessions
     - `0/9 = 0.0%` failed sessions
2. Intervention definition (single change):
   - During `/orient`, when rolling 10-session non-zero-findings rate is `< 30%`, select or generate a task whose Done-when includes an explicit findings artifact (analysis, diagnosis, or quantified finding entry).
3. Run the intervention for the next 10 scheduler sessions.
4. Recompute metrics on that post-intervention 10-session window from `.scheduler/metrics/sessions.jsonl`.
5. Compare pre/post rates and record arithmetic in a dated analysis note under `projects/akari/analysis/`.

Validity threats:
- Confound (project mix drift): sessions from other projects may change findings likelihood. Mitigation: use scheduler sessions and document project mix in the post-analysis.
- Construct validity: findings count may miss useful but non-counted knowledge. Mitigation: keep this as a narrow KPI and report secondary context.
- Small sample size: 10 sessions can be noisy. Mitigation: if result is borderline, extend to a 20-session confirmation window.

Cost estimate:
- API calls: 0
- Compute: <5 minutes per analysis pass
- Human time: 15-20 minutes for baseline + post-window write-up
- Sessions: multi-session (requires 10 post-intervention scheduler sessions)

Success criteria:
- Confirmed if:
  - Post-window non-zero-findings rate is `>= 40%` (`>=4/10`), and
  - Failed-session rate is `<= 10%` (`<=1/10`).
- Refuted if:
  - Post-window non-zero-findings rate is `< 30%` (`<=2/10`), or
  - Failed-session rate rises above `10%`.
- Ambiguous if:
  - Non-zero-findings rate is `30-39%` with acceptable failure rate; run an additional 10-session window.

## Design rationale

The intervention is intentionally single-factor (task-selection gate only) so attribution is clear. The primary metric is findings rate instead of aggregate knowledge volume because recent sessions can score high on structural changes while still producing zero findings. The 40% threshold is a practical improvement target over the current 22.2% baseline without requiring long wait time before feedback.
