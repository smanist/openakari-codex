# Lorenz63 Denoising Benchmark v2 Design Plan

Date: 2026-04-28
Status: adopted

## Knowledge Goal

This task should produce a testable v2 benchmark design that explains whether the v1 kernel failure came from the specific anchor-basis least-squares parameterization or from classical kernel-like smoothers more broadly.

## Scope

In scope:

- reuse the adopted Lorenz63 data-generation regime from v1 for comparability
- freeze Savitzky-Golay and the v1 anchor-basis kernel family as reference baselines
- add broader classical smoother families that do not share the v1 low-rank anchor basis
- define a staged pilot plus confirmatory benchmark that fits the project's CPU-only workflow
- decide which metrics remain primary and which new diagnostics become secondary

Out of scope:

- learned denoisers
- particle/Kalman filters
- GPU work
- changing the v1 benchmark record or artifacts in place

## Execution Plan

1. Preserve v1 comparability by reusing `modules/smoothing/generate_lorenz63_dataset.py:build_dataset()` with the same RK4, burn-in, record length, and `alpha` grid.
2. Add a new planned experiment record under `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md` instead of mutating the v1 record.
3. Design v2 around three added family types: row-normalized kernel regression, local-linear regression, and cubic smoothing splines.
4. Keep Savitzky-Golay and a small frozen slice of the v1 anchor-basis family in the grid as references rather than re-running the full v1 kernel search.
5. Stage the benchmark:
   - pilot family screen on the v1 replication budget
   - confirmatory rerun on finalists with more trajectory-seed clusters
6. Add follow-on tasks that separate implementation, pilot execution, pilot analysis, confirmatory execution, and confirmatory analysis.

## Done When

- `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md` exists with a complete design
- `projects/smoothing/TASKS.md` contains the selected design task plus decomposed follow-on work
- `projects/smoothing/README.md` reflects the broadened benchmark scope and records the session
