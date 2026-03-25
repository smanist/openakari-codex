# Session discipline

Canonical policy lives in `AGENTS.md`. This file is the short form used for prompt injection.

## Non-negotiables

- **No long-running babysitting** in-session. If a process will take more than ~2 minutes, prefer fire-and-forget submission via the experiment runner.
- **Never sleep-poll** in a loop; do not `sleep` more than 30 seconds in a session.
- **Commit incrementally** after each logical unit of work.

## Fire-and-forget experiments

If work involves long compute (training, rendering, large sweeps):

1. Prepare experiment dir + scripts.
2. Submit via `infra/experiment-runner/run.py --detach` with the required safeguards (`--project-dir`, explicit `--max-retries`, `--watch-csv` + `--total`).
3. Commit setup, log submission, end session.

## Inline logging (knowledge preservation)

- Discovery → write to a project file in the same turn.
- Decision → write a decision record or log entry before moving on.
- Verification → record the exact command and output (not just “tested”).

