# Plan: minimal `TrainerRun` wrapper for a single-split path

Date: 2026-04-04
Task: Introduce a minimal `TrainerRun` wrapper for one single-split training path

## Knowledge objective

Demonstrate, with code plus verification, that run identity/artifact ownership can move into a first-class run object without breaking the current single-split training flow.

## Scope classification

- Category: structural (verifiable)
- consumes_resources: false
- Resource-signal checklist:
  - LLM API calls: no
  - External API calls: no
  - GPU compute: no
  - Long-running compute (>10m): no

## Implementation steps

1. Add a `TrainerRun` type in `modules/dymad_migrate/src/dymad/training/` that owns run identity (`run_name`) plus artifact roots (`checkpoint_prefix`, `results_prefix`) and one `PhasePipeline`.
2. Route one concrete single-split path through the wrapper by updating `run_cv_single(...)` in `driver.py` to construct and use `TrainerRun`.
3. Keep compatibility semantics unchanged by preserving existing phase config shape and CV metric extraction behavior.
4. Add focused regression coverage that proves `run_cv_single(...)` uses `TrainerRun` and still reads the final metric through compatibility adapters.
5. Verify with focused tests.
