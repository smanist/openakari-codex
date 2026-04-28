# Compact-Polynomial Retuning Implementation Plan

Date: 2026-04-28
Project: `smoothing`
Task: `Implement dense compact-polynomial kernel retuning support`

## Scope classification

This remains `[requires-frontier]` because the change is not a single mechanical edit. It adds a new experiment-specific execution path, introduces a new artifact/plot contract for the retuning study, and must preserve the existing v1 sweep outputs unchanged.

## Execution plan

1. Add focused tests for:
   - dense compact-only grid construction with fixed SG references
   - retuning-run artifact contract, including the typical trajectory plot output
2. Implement a dedicated compact-polynomial retuning runner under `modules/smoothing/` that:
   - fixes the noise level to a selected `alpha`
   - evaluates compact-polynomial settings over dense anchor, bandwidth-multiplier, and degree grids
   - evaluates the two SG reference settings required by the experiment record
   - writes metrics, summaries, best-compact/reference tables, and a representative trajectory plot under a retuning-specific artifact directory
3. Verify with focused pytest targets, then update project logs and task state.
