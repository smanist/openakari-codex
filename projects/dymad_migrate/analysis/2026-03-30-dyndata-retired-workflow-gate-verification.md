# DynData-Retired Regular/Graph Workflow Gate Verification

Date: 2026-03-30
Status: completed
Related task: `Verify the DynData-retired regular and graph workflow gates`

## Goal

Verify that the selected regular and graph workflow gates still pass after the recent DynData-retirement steps, and compare results against the current migration baseline.

## Verification command (migration package)

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest \
  tests/test_workflow_lti.py \
  tests/test_workflow_kp.py \
  tests/test_workflow_ltg.py \
  tests/test_workflow_ltga.py -q \
  | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gates-pytest.log
```

## Baseline used for comparison

- `projects/dymad_migrate/analysis/2026-03-30-model-runtime-parity-gates.md`
- Baseline result recorded there for `modules/dymad_migrate`: `56 passed, 2 warnings in 61.80s`

## Findings

1. Current migration-package gate result is clean.
- Result from `2026-03-30-dyndata-retired-workflow-gates-pytest.log`: `56 passed, 2 warnings in 55.11s`.

2. Regular and graph gate coverage remained unchanged.
- Regular workflows: `tests/test_workflow_lti.py`, `tests/test_workflow_kp.py`
- Graph workflows: `tests/test_workflow_ltg.py`, `tests/test_workflow_ltga.py`

3. Comparison to migration baseline shows no regression.
- Pass count: `56` vs baseline `56` (no change)
- Warning count: `2` vs baseline `2` (no change)
- Runtime: `55.11s` vs baseline `61.80s` (`-6.69s`; noise-level improvement, no behavioral claim)

## Decision

The DynData-retired migration path remains parity-stable for the selected regular and graph workflow gates at this checkpoint.

## Verification snippets

```bash
rg -n "56 passed, 2 warnings" \
  projects/dymad_migrate/analysis/2026-03-30-dyndata-retired-workflow-gates-pytest.log \
  projects/dymad_migrate/analysis/2026-03-30-model-runtime-parity-gates.md
```
