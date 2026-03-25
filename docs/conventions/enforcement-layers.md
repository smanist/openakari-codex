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

