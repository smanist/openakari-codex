# Verification: Spectral exec routing through `specsnap_*` handles

Date: 2026-04-04
Project: dymad_migrate
Task: `Route one spectral execution path through exec using facade/store spectral snapshot handles`

## Goal

Verify that one spectral execution path now resolves a persisted `specsnap_*` handle through `store -> facade -> exec` before constructing `SpectralAnalysisAdapter`.

## What changed

- added `SpectralWorkflowPlan` in `modules/dymad_migrate/src/dymad/exec/state.py`
- added spectral planning/materialization methods in `modules/dymad_migrate/src/dymad/exec/workflow.py`:
  - `plan_spectral_analysis(...)`
  - `materialize_spectral_adapter(...)`
- routed `modules/dymad_migrate/src/dymad/sako/base.py::SpectralAnalysis._refresh_adapter` through the new exec plan/materialize path
- added targeted tests:
  - `modules/dymad_migrate/tests/test_boundary_skeleton.py::test_spectral_exec_flow_resolves_snapshot_handle`
  - `modules/dymad_migrate/tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_snapshot_handle_flow_through_exec`

## Findings

1. Spectral compatibility execution now persists and resolves `specsnap_*` handles through `exec` before adapter materialization.
2. The workflow-level compatibility surface (`SpectralAnalysis`) now crosses the same boundary layering pattern already used for checkpoint compatibility (`store -> facade -> exec`).
3. Focused spectral/boundary regression tests remained green after routing changes.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_boundary_skeleton.py tests/test_spectral_adapter.py tests/test_spectral_snapshot.py tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_plotting_through_adapter tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_snapshot_handle_flow_through_exec -q
```

Output summary:

- `14 passed, 2 warnings in 3.71s`
- warnings were existing Torch JIT deprecation warnings from test runtime imports
