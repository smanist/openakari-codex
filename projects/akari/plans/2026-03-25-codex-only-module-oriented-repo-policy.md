# Codex-Only Module-Oriented Repo Policy

## Goal

Adopt a split model and enforce it mechanically:

- `projects/<project>/` remains the lightweight memory and orchestration layer.
- `modules/<package>/` becomes the approved location for package code, run scripts, and heavy experiment artifacts.
- Active agent-facing instructions and tooling must reflect the Codex-only operating model.

## Planned changes

1. Add `modules/registry.yaml` as the single source of truth for project-to-module mapping.
2. Tighten `projects/` conventions so project directories hold records, not code or heavy runtime outputs.
3. Extend experiment metadata so executable work records declare `module` and `artifacts_dir`.
4. Refactor `infra/experiment-runner/run.py` to separate experiment records from runtime artifact output via `--artifacts-dir`.
5. Update scheduler prompts and relevant skills to resolve module context from `modules/registry.yaml`.
6. Remove stale active-path references to retired agent-specific artifacts from current docs, prompts, and tooling.
7. Add L0 checks and regression tests for:
   - source code under `projects/`
   - runtime artifacts under `projects/*/experiments/*`
   - missing experiment module metadata
   - stale active-path agent references

## Verification plan

- `pytest infra/experiment-runner/test_run.py infra/experiment-validator/test_validate.py`
- `npm test --prefix infra/scheduler -- src/cli-add.test.ts src/verify-experiment.test.ts src/verify-compliance.test.ts src/codex-only-references.test.ts`
- `cd infra/scheduler && npx tsc --noEmit`
