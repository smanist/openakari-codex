# Plan: Route one spectral execution path through `exec` with `specsnap_*` handles

Date: 2026-04-04
Project: dymad_migrate
Task: `Route one spectral execution path through \`exec\` using facade/store spectral snapshot handles`

## Why this plan

Current spectral compatibility routing (`SpectralAnalysis`) builds the adapter directly from `SAInterface.snapshot`. That bypasses the boundary layering the project is migrating toward (`store -> facade -> exec`).

Knowledge output goal: verify that one real spectral flow can resolve a persisted `specsnap_*` handle via `exec` before adapter construction, and preserve workflow behavior.

## Scope classification (SOP Step 3)

- Resource signals:
  - LLM API calls: no
  - External API calls: no
  - GPU compute: no
  - Long-running compute (>10m): no
- Classification: `STRUCTURAL (verifiable)`
- `consumes_resources`: false

## Implementation steps

1. Extend `dymad.exec.state` with a spectral workflow plan carrying checkpoint/spectral handles.
2. Extend `dymad.exec.workflow.CompatibilityExecutor` with spectral plan/materialize methods that:
   - register checkpoint + spectral snapshot through facade/store
   - resolve the `specsnap_*` handle before constructing `SpectralAnalysisAdapter`
3. Route `dymad.sako.base.SpectralAnalysis` adapter construction through the new exec methods for one compatibility path.
4. Add targeted tests proving spectral route crosses `exec` and resolves the spectral handle.
5. Run focused tests and archive exact command output in a dated analysis note.

## Verification target

- New/updated boundary test for spectral plan + materialize handle routing.
- Workflow instrumentation test showing `SpectralAnalysis` uses the new `exec` spectral route.
