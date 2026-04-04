# Spectral Compatibility Routing Verification

Date: 2026-04-04
Task: Route the legacy `SpectralAnalysis` compatibility class through the new adapter for one SA workflow

## Scope

Verify that `SpectralAnalysis(...)` now delegates workflow-facing spectral operations through `SpectralAnalysisAdapter` while preserving caller shape.

## Verification commands

1. `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_spectral_adapter.py tests/test_spectral_snapshot.py 'tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter' 'tests/test_workflow_sa_lti.py::test_sa[5]' -q`
   - `9 passed, 2 warnings in 2.76s`

## Findings

1. The compatibility class now constructs an adapter from checkpoint-backed `SAInterface.snapshot` + solved eigensystem state and routes spectral operations through that adapter.
   - Provenance: `modules/dymad_migrate/src/dymad/sako/base.py` (`_refresh_adapter`, `estimate_ps`, `resolvent_analysis`, `estimate_measure`, Jacobian helpers).
2. A focused SA workflow test now proves compatibility routing by instrumenting `SpectralAnalysisAdapter.estimate_ps` and asserting the compatibility call path invokes it.
   - Provenance: `modules/dymad_migrate/tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter`.
3. One existing SA workflow gate remained green after routing through the adapter seam.
   - Provenance: `modules/dymad_migrate/tests/test_workflow_sa_lti.py::test_sa[5]` output above (`passed`).

## Notes

- This closes the compatibility-routing task and moves the spectral seam from `prototype` to `adopted`.
- The remaining high-priority spectral item is the explicit `--reruns=0` parity record/update task.
