# Plan: Route linear training through `TrainerRun` + `PhasePipeline`

Date: 2026-04-04
Project: dymad_migrate
Task: Route the linear-training workflow through `TrainerRun` plus `PhasePipeline`

## Knowledge target

Confirm whether the linear workflow path (`LinearTrainer` + existing workflow gate) is truly running through the new training seam, and leave a regression-proof artifact if not.

## Steps

1. Trace the current linear execution path from `LinearTrainer` into driver/training orchestration and identify where seam ownership is still implicit.
2. Make the smallest code change that makes `TrainerRun` + `PhasePipeline` the explicit orchestration surface for that linear path.
3. Add/extend focused tests to lock the seam behavior.
4. Run focused training seam and linear workflow verification tests.
5. Record findings in a dated analysis note and update the migration scoreboard/task state.
