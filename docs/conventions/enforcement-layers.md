# Enforcement layers

Conventions in this repo exist at two layers:

- **L0 (code-enforced):** verified by tooling (scheduler verification, scripts, tests).
- **L2 (convention-only):** self-enforced by agents; violations are possible without automation.

## Guidance

- Prefer promoting frequently violated L2 conventions to L0 when the check is mechanically verifiable.
- When adding an enforcement mechanism, update this file and add/adjust tests where applicable.

## Where enforcement lives

- Scheduler verification: `infra/scheduler/` (see `infra/scheduler/README.md`).
- Budget checks: `infra/budget-verify/` and scheduler budget gate logic.

## Current L0 additions

- `projects/` may not contain committed source code or runtime artifact trees for experiments; those belong in `modules/<package>/`.
- Executable work records must declare module ownership (`module`) and runtime artifact location (`artifacts_dir`) in `EXPERIMENT.md`.
- Active agent-facing docs and skills must use Codex-era references (`AGENTS.md`, `.agents/skills/`) rather than retired agent-specific artifacts.
