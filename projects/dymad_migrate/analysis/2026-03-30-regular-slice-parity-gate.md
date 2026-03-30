# Regular Slice Parity Gate

Date: 2026-03-30
Status: complete

## Scope

Evaluate the regular-only milestone gate after landing the typed regular transform pipeline and the regular checkpoint prediction seam.

Gate:

- `tests/test_assert_trajmgr.py`
- `tests/test_assert_transform.py`
- `tests/test_workflow_lti.py`

Packages:

- `modules/dymad_migrate`
- `modules/dymad_ref`

## Commands

Migration package:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py tests/test_workflow_lti.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_migrate-pytest.log
```

Reference package:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_transform.py tests/test_workflow_lti.py -q | tee /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_ref-pytest.log
```

Focused migrated-slice seam tests:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_regular_series_adapter.py tests/test_regular_slice_integration.py tests/test_public_load_model_boundary.py tests/test_load_model_compat.py tests/test_checkpoint_e2e_layering.py -q
```

## Findings

- `modules/dymad_migrate` passes the regular-only parity gate: `25 passed, 2 warnings in 14.30s`.
- `modules/dymad_ref` passes the same gate: `25 passed, 2 warnings in 13.05s`.
- The migrated package also passes the focused regular-slice seam suite: `7 passed, 2 warnings in 0.67s`.
- The regular slice is now backed by one active typed transform path in preprocessing and one active typed transform path in checkpoint-time regular prediction.

## Decision

The regular working slice is verified.

That does not mean the whole transform migration is complete. It means one bounded regular slice is now:

- implemented through the new typed seam
- active on the default regular preprocessing/checkpoint paths
- parity-checked against the reference package

## Evidence

- Focused test file coverage:
  - `modules/dymad_migrate/tests/test_regular_series_adapter.py`
  - `modules/dymad_migrate/tests/test_regular_slice_integration.py`
  - `modules/dymad_migrate/tests/test_public_load_model_boundary.py`
  - `modules/dymad_migrate/tests/test_load_model_compat.py`
  - `modules/dymad_migrate/tests/test_checkpoint_e2e_layering.py`
- Full gate logs:
  - `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_migrate-pytest.log`
  - `projects/dymad_migrate/analysis/2026-03-30-regular-slice-parity-dymad_ref-pytest.log`
