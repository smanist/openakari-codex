## Goal

Diagnose the `2026-04-28` scheduler health signals from `.scheduler/metrics/sessions.jsonl`, determine whether they reflect real system regressions or monitor false positives, and either apply scoped fixes or record concrete follow-up.

## Knowledge target

Produce an evidence-backed explanation for:
- the reported `task_starvation` rows in the latest 20 scheduler sessions,
- the `durationMs` anomaly on `g8e3qs2o-d5055b06`,
- the recurring `ledger_inconsistent` warnings.

The output should clarify whether these are supply failures, workflow bugs, monitoring-method issues, or transient project-local behavior.

## Steps

1. Summarize the latest scheduler-session window from `.scheduler/metrics/sessions.jsonl`.
2. Trace the affected runs back to scheduler logs, commit surfaces, and recent project README entries.
3. Test whether the monitor logic matches the observed session types.
4. If a monitor bug is confirmed, add regression coverage before patching.
5. Write the diagnosis to `projects/akari/diagnosis/` and update project task/log state.

## Closeout

Done when:
- a dated diagnosis file exists with distribution, hypotheses, validity assessment, and recommendations,
- any scoped false-positive fixes are covered by tests,
- `projects/akari/README.md` records the session,
- relevant health tasks are updated,
- the session changes are committed.
