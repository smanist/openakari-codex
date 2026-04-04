# DyMAD Backlog Refresh After DynData Retirement

Date: 2026-04-03
Status: active
Project: dymad_migrate

## Purpose

Refresh `projects/dymad_migrate/TASKS.md` so it reflects the current migration state
rather than acting as a long completed-task ledger.

This plan records:

- what is already mature enough to stop re-queuing
- which seams still need code, not more design
- how the next 10 to 20 tasks should be decomposed

## Current migration state

From `projects/dymad_migrate/architecture/migration-scoreboard.md` as of 2026-03-31:

- `data`: `verified`
- `transform`: `verified`
- `model-runtime`: `verified`
- `checkpoint-facade`: `verified`
- `model-spec`: `prototype`
- `training`: `design-only`
- `spectral-analysis`: `design-only`

Additional reality check from code review on 2026-04-03:

- typed series, typed transform pipeline, typed model-context/runtime adapters, and
  checkpoint boundary skeleton are real default seams in `modules/dymad_migrate/`
- `training` still runs through `RunState`, `StackedOpt`, and `OptBase`
- `SpectralAnalysis` still bundles checkpoint bootstrap, runtime preparation,
  numerical analysis, and plotting in one legacy-facing class
- `ModelSpec` exists, but it still collapses back to legacy string-tuple dispatch

## Backlog refresh decision

Replace the previous broad open tasks:

- `Start training-layer split by introducing phase/state primitives behind current driver entrypoints`
- `Implement first spectral-analysis adapter boundary over typed runtime handles`

with a decomposed queue of smaller tasks.

Rationale:

1. the previous tasks were directionally correct but too large to schedule cleanly
2. the project now has enough concrete seams that the remaining work can be split into
   bounded execution tasks
3. a shorter task file should show only remaining work; completed-task provenance already
   lives in the README log, plans, analysis notes, decisions, and git history

## Next execution themes

### Theme 1 - Training seam: design-only to prototype

Goal:
- turn the existing `TrainerState` / `PhaseContext` adapter seam into the start of a
  real `PhasePipeline` / `TrainerRun` split

Priority order:
1. phase-pipeline extraction
2. execution-services split
3. first workflow gate through the new seam

### Theme 2 - Spectral-analysis seam: design-only to prototype

Goal:
- separate snapshot preparation and compatibility facade work from pure spectral numerics

Priority order:
1. typed spectral snapshot
2. adapter object over `SAKO` / `RALowRank`
3. compatibility facade routing
4. plotting split

### Theme 3 - Model-spec seam: prototype to adopted

Goal:
- stop treating typed specs as wrappers around the old tuple contract for at least one
  predefined family

Priority order:
1. add rollout/memory/prediction spec objects for one family
2. route one predefined family through typed dispatch
3. verify that path against current workflow gates

### Theme 4 - Surface cleanup and scoreboard hygiene

Goal:
- reduce remaining architectural drift between the package surface and the target
  contract

Priority order:
1. thin high-churn re-export surfaces
2. update scoreboard once a seam crosses from design/prototype to the next state

## Success condition for this refresh

The refresh is successful when:

1. `projects/dymad_migrate/TASKS.md` contains only remaining work
2. the queue contains 10 to 20 scoped tasks
3. each task has a mechanically verifiable `Done when`
4. the task order matches the current seam maturity rather than the historical
   chronology of work already finished
