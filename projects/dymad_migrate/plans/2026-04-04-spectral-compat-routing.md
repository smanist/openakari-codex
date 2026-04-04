# Plan — Route `SpectralAnalysis` through typed spectral adapter

Date: 2026-04-04
Task: Route the legacy `SpectralAnalysis` compatibility class through the new adapter for one SA workflow

## Knowledge output

This work produces evidence about whether the typed spectral adapter seam is actually reachable through the public compatibility surface used by workflow tests.

## Goal

Make one real `SpectralAnalysis(...)` path delegate spectral-kernel operations through `SpectralAnalysisAdapter` without changing caller signatures.

## Steps

1. Update `modules/dymad_migrate/src/dymad/sako/base.py`:
   - build a typed adapter instance from `SAInterface.snapshot` plus solved eigensystem terms
   - route at least one compatibility method path (`estimate_ps`, `estimate_measure`, Jacobian helpers, and/or resolvent) through the adapter seam
   - keep existing public method signatures unchanged
2. Add focused regression coverage proving compatibility routing:
   - verify the `SpectralAnalysis` construction path creates and uses the adapter for at least one SA workflow call
3. Run focused spectral workflow tests.
4. Record verification outputs and update migration scoreboard status/provenance if seam status changes.

## Scope classification

- Type: structural (verifiable)
- Resource signals: no LLM/API/GPU/long-running compute
- `consumes_resources`: false
