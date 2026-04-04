# Plan — 2026-04-04 — Split spectral plotting helpers into optional adapter

Task: Split plotting helpers out of `sako/base.py` into an optional plotting adapter.

## Why this task

- Keeps the spectral workflow seam focused on numerical/runtime behavior.
- Reduces presentation-layer coupling inside `SpectralAnalysis` compatibility logic.
- Produces verifiable migration knowledge by documenting and testing the boundary move.

## Scope classification

- Type: structural (verifiable)
- Consumes resources: false
- Resource signals: no LLM/API/GPU/long-running compute

## Execution steps

1. Add a dedicated plotting adapter module under `modules/dymad_migrate/src/dymad/sako/` that owns plotting helpers currently in `base.py`.
2. Wire `SpectralAnalysis` to delegate plotting calls through the adapter while preserving existing public plotting method signatures.
3. Update/extend focused tests to verify adapter delegation behavior without broad workflow regressions.
4. Run targeted pytest commands and record exact outputs in a dated analysis note.
5. Update migration scoreboard + task state once verification passes.
