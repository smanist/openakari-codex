# Plan — SpectralAnalysisAdapter over typed snapshots

Date: 2026-04-04
Task: Implement a `SpectralAnalysisAdapter` over `SAKO` and `RALowRank` using typed snapshots

## Goal

Land a first adapter object in `modules/dymad_migrate/src/dymad/sako/` that consumes `SpectralSnapshot` and delegates spectral operations to `SAKO` and `RALowRank` while keeping legacy callers unchanged.

## Steps

1. Add `sako/adapter.py` with a typed `SpectralAnalysisAdapter`:
   - initialize from `SpectralSnapshot`, eigensystem terms, and projection/dt context
   - build and hold `SAKO` and `RALowRank`
   - expose delegation methods for pseudospectrum, measure, and Jacobian-related operations
2. Export the adapter from `dymad.sako.__init__`.
3. Add focused tests (`tests/test_spectral_adapter.py`) that verify:
   - kernel construction from snapshot payloads
   - delegation for pseudospectrum and measure calls
   - Jacobian-related calls consume runtime hooks and project through eigenvectors
4. Run focused pytest gates for new and nearby spectral seam tests.
5. Record verification + findings in a dated analysis note.

## Scope classification

- Type: structural (verifiable)
- Resource signals: no LLM/API/GPU/long-running compute
- `consumes_resources`: false
