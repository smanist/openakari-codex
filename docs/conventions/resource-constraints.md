# Resource constraints

Resources include: model/API calls, GPU time, long-running CPU jobs, and deadline-bounded budgets.

## Budget gating

- Budgets live in `projects/<project>/budget.yaml`.
- Consumption is recorded in `projects/<project>/ledger.yaml`.
- If a project is out of budget or past deadline, only `[zero-resource]` tasks should proceed.
- Resource-consuming experiment runs should declare `module` and `artifacts_dir` in `EXPERIMENT.md`, and use `--artifacts-dir` so runtime outputs stay under `modules/<package>/`.

## In-session compute

- Avoid in-session runs expected to take >10 minutes.
- If a run is expected to take >2 minutes or might stall, prefer fire-and-forget execution via the experiment runner.

See also: `docs/conventions/session-discipline.md` and `docs/schemas/budget-ledger.md`.
