# Plan — 2026-04-04 — Extend store/facade with spectral snapshot handles

Task: Extend the `store` and `facade` skeleton with typed spectral snapshot handles.

## Why this task

- The spectral seam already has typed snapshot records, but boundary storage still only handles checkpoint and prediction handles.
- Extending handles into `store`/`facade` makes the `core -> facade -> store -> exec` contract real for one spectral artifact type.
- The result is mechanically verifiable with focused boundary tests, producing migration knowledge without resource consumption.

## Scope classification

- Type: structural (verifiable)
- Consumes resources: false
- Resource signals: no LLM/API/GPU/long-running compute

## Execution steps

1. Add a dedicated spectral snapshot handle validator in the facade handle layer.
2. Extend the object store with typed spectral snapshot records plus create/get/summarize operations.
3. Add facade operations for spectral snapshot registration and lookup.
4. Add focused boundary tests for spectral snapshot handle creation and lookup.
5. Run targeted pytest commands and record exact outputs in a dated analysis note.
6. Update migration scoreboard and task status with provenance.
