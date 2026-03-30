# Split LTI Parity Verification

Date: 2026-03-30
Status: completed
Related task: `Split parity reporting into reference-oracle status and migration-package status`

## Purpose

Record one clean workflow gate in both packages separately so parity claims distinguish:

- oracle/reference status in `modules/dymad_ref`
- migrated-package status in `modules/dymad_migrate`

## Selected gate

`tests/test_workflow_lti.py`

Why this gate:

- it is parity-critical
- it exercises training, checkpoint loading, and prediction
- after the public `load_model(...)` reroute, it is the cleanest existing workflow file to confirm the new default path still works

## Commands executed

Reference package:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py -q
```

Persisted log:

- `projects/dymad_migrate/analysis/2026-03-30-lti-parity-dymad_ref-pytest.log`

Migration package:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_lti.py -q
```

Persisted log:

- `projects/dymad_migrate/analysis/2026-03-30-lti-parity-dymad_migrate-pytest.log`

## Results

- `dymad_ref`: PASS
  - summary line: `15 passed, 2 warnings in 14.33s`
  - provenance: `2026-03-30-lti-parity-dymad_ref-pytest.log:72`
- `dymad_migrate`: PASS
  - summary line: `15 passed, 2 warnings in 14.12s`
  - provenance: `2026-03-30-lti-parity-dymad_migrate-pytest.log:72`

## Interpretation

For the regular LTI workflow gate, the migrated package matches the current oracle baseline at the file level after the public `load_model(...)` reroute.

This does not by itself prove that every workflow family remains clean after the reroute. It only establishes a split, package-specific baseline for one parity-critical workflow.

## Important note on invalid broad-run evidence

Do not use `projects/dymad_migrate/analysis/2026-03-30-load-model-parity-dymad_migrate-pytest.log` as authoritative post-reroute parity evidence.

Reason:

- during this session, overlapping long-running workflow runs touched the same fixed test output directories under `modules/dymad_migrate/tests`
- the resulting broad-run log is contaminated by concurrent artifact interference and is not a clean migration signal

Use the two `lti` logs above as the clean split-parity baseline for this session.
