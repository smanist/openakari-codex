# Plan: Record `--reruns=0` spectral parity gate and advance scoreboard

Date: 2026-04-04
Task: `Record the --reruns=0 spectral parity gate and update the scoreboard`

## Goal
Produce explicit parity evidence for the spectral-analysis seam using the agreed `--reruns=0` gate and reflect the resulting seam status in project memory.

## Scope classification
- Classification: `ROUTINE`
- `consumes_resources: false`
- Resource-signal checklist:
  - LLM API calls: no
  - External API calls: no
  - GPU compute: no
  - Long-running compute (>10 min): no

## Steps
1. Run the spectral workflow gate exactly as specified (`tests/test_workflow_sa_lti.py --reruns=0`) in `modules/dymad_migrate` and capture raw pytest output.
2. Write a dated analysis note with command, output summary, warning behavior, and findings provenance.
3. Update `projects/dymad_migrate/architecture/migration-scoreboard.md` with the new verification artifact and status.
4. Mark the task complete in `projects/dymad_migrate/TASKS.md`.

## Verification
- Command recorded in analysis note with literal output excerpt and pass/fail counts.
- Scoreboard row updated for `spectral-analysis`.
- Task checkbox moved to `[x]`.
