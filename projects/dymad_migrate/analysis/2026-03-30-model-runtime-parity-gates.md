# Model Runtime Parity Gates

Date: 2026-03-30
Status: complete

## Purpose

Record the regular and graph workflow gates for the typed model-runtime boundary after:

- typed regular checkpoint prediction routing
- typed graph checkpoint prediction routing
- helper/component migration onto the narrow runtime-view adapter

## Verification commands

Migration package:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest \
  tests/test_workflow_lti.py \
  tests/test_workflow_kp.py \
  tests/test_workflow_ltg.py \
  tests/test_workflow_ltga.py -q
```

Reference package:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest \
  tests/test_workflow_lti.py \
  tests/test_workflow_kp.py \
  tests/test_workflow_ltg.py \
  tests/test_workflow_ltga.py -q
```

## Findings

- `modules/dymad_migrate`: `56 passed, 2 warnings in 61.80s`
- `modules/dymad_ref`: `56 passed, 2 warnings in 61.77s`
- The selected regular gates (`lti`, `kp`) and graph gates (`ltg`, `ltga`) match the current reference baseline.
- The helper/component migration did not regress the current runtime workflow surface.

## Decision

The typed model-runtime boundary is now verified for the selected regular and graph
prediction workflow gates.
