# Sampling/Control Split Parity Verification

Date: 2026-04-04
Status: completed
Related task: `Verify split parity for sampling/control workflow (test_workflow_sample.py) in dymad_ref and dymad_migrate`

## Purpose

Close the remaining parity-closure evidence gap by recording split `workflow_sample` gate results for both `modules/dymad_ref` and `modules/dymad_migrate`.

## Commands

Reference package:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_sample.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-04-04-sample-split-parity-dymad_ref-pytest.log
```

Migration package:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_sample.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-04-04-sample-split-parity-dymad_migrate-pytest.log
```

## Results

- `dymad_ref`: `6 passed, 2 warnings in 1.07s` (provenance: `projects/dymad_migrate/analysis/2026-04-04-sample-split-parity-dymad_ref-pytest.log:260`)
- `dymad_migrate`: `6 passed, 2 warnings in 1.08s` (provenance: `projects/dymad_migrate/analysis/2026-04-04-sample-split-parity-dymad_migrate-pytest.log:260`)

## Findings

1. Sampling/control split parity is aligned at this checkpoint.
- Both packages pass the same six `test_workflow_sample.py` parametrized cases with the same warning count.

2. The parity-closure map has no remaining blocker/milestone split-artifact gap.
- With sampling/control now recorded, blocker+milestone workflow coverage is `7/7`.
