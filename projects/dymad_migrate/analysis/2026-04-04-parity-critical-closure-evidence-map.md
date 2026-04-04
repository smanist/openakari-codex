# Parity-Critical Closure Evidence Map Refresh

Date: 2026-04-04
Status: completed
Related task: `Audit parity-critical workflow preservation against modules/dymad_ref and update closure evidence map` (updated with sampling split parity on 2026-04-04)

## Purpose

Refresh the `Done when` parity-evidence map using the current workflow inventory in `projects/dymad_migrate/knowledge/parity-critical-workflows.md`, then identify any remaining gaps that still need a dedicated task.

## Workflow evidence map

| Workflow | Class | Evidence status | Current evidence |
|---|---|---|---|
| Regular-series data handling + trajectory prep | Blocker | covered | `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md`, `modules/dymad_migrate/tests/test_regular_series_adapter.py` |
| Graph-series data handling + graph trajectory prep | Blocker | covered | `projects/dymad_migrate/analysis/2026-03-30-graph-transform-pipeline-and-native-lift-verification.md`, `modules/dymad_migrate/tests/test_graph_series_adapter.py`, `modules/dymad_migrate/tests/test_graph_series_core.py` |
| Transform composition + fitted transform behavior (including NDR policy) | Blocker | covered | `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-gate.md`, `projects/dymad_migrate/analysis/2026-03-31-ndr-deterministic-replacement-design.md`, `projects/dymad_migrate/analysis/2026-03-31-ndr-deterministic-gate-dymad_migrate.log`, `projects/dymad_migrate/analysis/2026-03-31-ndr-deterministic-gate-dymad_ref.log` |
| Regular dynamics training/prediction (`LTI`/`KP`) | Blocker | covered (refreshed today) | `projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gate-verification.md`, `projects/dymad_migrate/analysis/2026-04-04-lti-split-parity-dymad_ref-pytest.log`, `projects/dymad_migrate/analysis/2026-04-04-lti-split-parity-dymad_migrate-pytest.log` |
| Graph dynamics training/prediction (`LTG`/`LTGA`) | Milestone | covered | `projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gate-verification.md` (migration), `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-outcomes.md` (reference-side parity inventory) |
| Spectral-analysis workflow (`SA LTI` + resolvent/spectrum assertions) | Milestone | covered | `projects/dymad_migrate/analysis/2026-04-04-spectral-reruns0-parity-gate-verification.md`, `projects/dymad_migrate/analysis/2026-04-04-spectral-adapter-delegation-verification.md`, `projects/dymad_migrate/analysis/2026-04-04-spectral-exec-snapshot-handle-routing-verification.md` |
| Sampling/control generation workflow (`workflow_sample`) | Milestone | covered (refreshed today) | `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-outcomes.md`, `projects/dymad_migrate/analysis/2026-04-04-sampling-split-parity-verification.md`, `projects/dymad_migrate/analysis/2026-04-04-sample-split-parity-dymad_ref-pytest.log`, `projects/dymad_migrate/analysis/2026-04-04-sample-split-parity-dymad_migrate-pytest.log` |

## Representative parity verification executed in this session

Reference package:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-04-04-lti-split-parity-dymad_ref-pytest.log
```

Observed summary:
- `15 passed, 2 warnings in 11.23s`
- provenance: `projects/dymad_migrate/analysis/2026-04-04-lti-split-parity-dymad_ref-pytest.log:72`

Migration package:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-04-04-lti-split-parity-dymad_migrate-pytest.log
```

Observed summary:
- `15 passed, 2 warnings in 10.82s`
- provenance: `projects/dymad_migrate/analysis/2026-04-04-lti-split-parity-dymad_migrate-pytest.log:72`

## Findings

1. Blocker+milestone parity-closure evidence is complete at this checkpoint.
- From the table above: `7/7` blocker+milestone workflows are covered.

2. Regular workflow split parity remains aligned on this checkpoint.
- Both `dymad_ref` and `dymad_migrate` pass `tests/test_workflow_lti.py` with identical pass/warning counts (`15 passed, 2 warnings`).

3. Sampling/control split parity is now explicitly recorded in both packages.
- `tests/test_workflow_sample.py -q` passes in `dymad_ref` and `dymad_migrate` with identical pass/warning counts (`6 passed, 2 warnings`).

## Follow-up action

No immediate parity-closure follow-up is required for blocker/milestone workflow split artifacts.
