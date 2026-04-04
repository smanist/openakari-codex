# Plan: typed spectral snapshot record for checkpoint-backed analysis

Date: 2026-04-04
Task: Introduce a typed `SpectralSnapshot` record extracted from checkpoint-backed models

## Scope classification

- Category: structural (verifiable)
- consumes_resources: false
- Resource-signal checklist:
  - LLM API calls: no
  - External API calls: no
  - GPU compute: no
  - Long-running compute (>10m): no

## Knowledge output

This task produces explicit boundary knowledge: which checkpoint-derived fields (`P0`, `P1`, Koopman weights, dims, and metadata) are the minimum typed payload needed for spectral analysis seams.

## Implementation steps

1. Add a typed spectral snapshot record under `modules/dymad_migrate/src/dymad/sako/` capturing encoded pair matrices, Koopman weight variants, dimensions, and source metadata.
2. Update `SAInterface` to build and expose the snapshot from checkpoint-backed runtime state during spectral setup.
3. Add focused tests that assert snapshot construction for both full-weight and low-rank Koopman weight paths.
4. Run focused verification:
   - `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_spectral_snapshot.py -q`
   - `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_sako_runtime_batch_adapter.py -q`
