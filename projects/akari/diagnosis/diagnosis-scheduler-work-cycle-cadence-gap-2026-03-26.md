# Diagnosis: Scheduler Work-Cycle Cadence Gap Blocking Findings-First Evaluation

Date: 2026-03-26
Project: akari
Type: self-observation diagnosis

## Diagnosis: post-intervention cadence gap in scheduler `work-cycle`
CI layers involved: L0 (scheduler state), L2 (workflow execution)

### Error distribution
- Window definition: scheduler-triggered sessions with `jobName` containing `work-cycle` at or after intervention start (`2026-03-26T03:05:39Z`).
- Source snapshot: `projects/akari/diagnosis/scheduler-work-cycle-cadence-gap-window-2026-03-26.json`.
- Observed post-intervention scheduler runs: `9` (target for evaluation task is `10`).
- Last scheduler `work-cycle` session: `2026-03-26T11:06:37.442Z`.
- Median inter-session gap in observed post window: `60.0` minutes.
- Time since last scheduler `work-cycle` at measurement (`2026-03-26T17:01:43Z`): `355.1` minutes.
- Expected missing runs from observed cadence: `floor(355.1 / 60.0) = 5`.

### Systematic patterns
1. The evaluation blocker is now cadence-related, not data-quality-related.
   Evidence: the post window remains at `9/10` while failed-session count remains `0`.
2. The scheduler path needed for the 10th run is currently unavailable.
   Evidence: `.scheduler/jobs.json` shows the `work-cycle` job with `enabled: false`.
3. No daemon process is currently active.
   Evidence: `./akari status` reports `Daemon: stopped`, and `.scheduler/scheduler.pid` is absent.

### Root-cause hypothesis

#### Hypothesis: The 10th scheduler session is missing because scheduler execution is disabled/stopped
Layer: L0 (scheduler state)
Evidence for:
- Job disabled: `"enabled": false` for job `"work-cycle"` in `.scheduler/jobs.json`.
- Scheduler daemon stopped: `Daemon: stopped` from `./akari status`.
- Missing PID lockfile: `.scheduler/scheduler.pid` not present.
Evidence against:
- Manual `work-cycle` execution is still possible (`2026-03-26T16:32:27.111Z`), so instrumentation is functional.
Plausibility: high

### Recommended actions
- Immediate unblock condition:
  - Re-enable scheduler `work-cycle` job and restart daemon, then wait for one scheduler-triggered `work-cycle` row after `2026-03-26T11:06:37.442Z`.
- Follow-up prevention:
  - Add a guard task to detect and alert when `work-cycle` is disabled while a measurement task depends on scheduler cadence.

### Model-limit notes
No confirmed model-capability issue. This is an orchestration/state issue.

## Provenance commands

```bash
node - <<'NODE' > projects/akari/diagnosis/scheduler-work-cycle-cadence-gap-window-2026-03-26.json
...reads .scheduler/metrics/sessions.jsonl and .scheduler/jobs.json to compute post-window cadence and missing-run arithmetic...
NODE
```

```bash
./akari status
```

```bash
ls -la .scheduler/scheduler.pid 2>/dev/null || echo 'no scheduler.pid'
```
