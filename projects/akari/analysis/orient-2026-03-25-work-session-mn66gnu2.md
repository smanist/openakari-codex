# Orient — 2026-03-25 (work-session-mn66gnu2)

## Repo snapshot

- Date: 2026-03-25
- Approvals pending: none (`APPROVAL_QUEUE.md`)
- Active projects per `docs/status.md`: `projects/akari/`, `projects/pca_vs_ttd/`

## Cross-session patterns (last 10 scheduler sessions)

Primary anomaly: `numTurns: 0` across all of the last 10 rows in `.scheduler/metrics/sessions.jsonl` despite `ok: true` and non-zero `durationMs`. This makes efficiency metrics like findings/$ undefined (all `costUsd: 0`) and blocks self-observation.

Evidence:

- `tail -n 15 .scheduler/metrics/sessions.jsonl` shows repeated `\"numTurns\":0` and `\"costUsd\":0` entries for both `work-cycle` and `pca-v-ttd` jobs.
- Local metric script over the last 10 rows reported:
  - `findings_per_dollar None` (because `sum_cost 0.0`)
  - `avg_turns 0.0`

## Recommendation

Work the high-priority `projects/akari/TASKS.md` item:

- “Re-verify Codex scheduler sessions record non-empty output and `Turns > 0`”

Rationale: it is a prerequisite for meaningful self-improvement measurement; until `numTurns > 0` and logs contain non-empty `## output`, the scheduler’s operational metrics are not trustworthy.

