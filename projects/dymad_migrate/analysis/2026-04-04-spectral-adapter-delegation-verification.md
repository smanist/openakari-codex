# Spectral Adapter Delegation Verification

Date: 2026-04-04
Task: Implement a `SpectralAnalysisAdapter` over `SAKO` and `RALowRank` using typed snapshots

## Scope

Validate that the new adapter seam under `modules/dymad_migrate/src/dymad/sako/adapter.py`:
- consumes typed `SpectralSnapshot` payloads,
- constructs `SAKO` and `RALowRank` kernel delegates from snapshot + eigensystem state,
- exposes delegated pseudospectrum, measure, and Jacobian helper operations.

## Verification commands

1. `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_spectral_adapter.py tests/test_spectral_snapshot.py -q`
   - `7 passed, 2 warnings in 0.63s`
2. `cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[5]' -q`
   - `1 passed, 2 warnings in 1.50s`

## Findings

1. The spectral seam now includes a dedicated adapter object (`SpectralAnalysisAdapter`) that consumes `SpectralSnapshot` plus typed eigensystem terms and builds both `SAKO` and `RALowRank` delegates.
   - Provenance: `modules/dymad_migrate/src/dymad/sako/adapter.py`; verified by `tests/test_spectral_adapter.py::test_spectral_adapter_initializes_kernels_from_snapshot`.
2. Adapter-level delegation covers the required operations for this seam checkpoint:
   - pseudospectrum via `estimate_ps(...)` + `resolvent_analysis(...)` with `standard` and `sako` routing,
   - measure via `estimate_measure(...)`,
   - Jacobian helpers via `eval_eigfunc_jac(...)` and `eval_eigmode_jac(...)`.
   - Provenance: `modules/dymad_migrate/src/dymad/sako/adapter.py`; verified by `tests/test_spectral_adapter.py::test_spectral_adapter_delegates_measure_and_jacobian_calls` and `tests/test_spectral_adapter.py::test_spectral_adapter_delegates_pseudospectrum_estimation`.
3. Existing sampled SA workflow parity gate remained green for one established path after landing the adapter seam.
   - Provenance: `tests/test_workflow_sa_lti.py::test_sa[5]` output above (`1 passed`).

## Notes

- This task lands the adapter seam but does not yet route legacy `SpectralAnalysis(...)` through it. That compatibility-routing step remains an open high-priority task in `projects/dymad_migrate/TASKS.md`.
