# Load-Model Parity Verification After Boundary Adapter Landing

Date: 2026-03-30
Status: completed
Related task: `Verify parity-critical load_model workflows after boundary adapter landing`

## Scope

Verify pass/fail outcomes for parity-critical workflow tests after landing the `load_model` compatibility adapter in `modules/dymad_migrate/`.

## Command executed

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_ker_auto.py tests/test_workflow_ker_ctrl.py tests/test_workflow_sa_lti.py -q
```

Raw command output (exact) is persisted at:

- `projects/dymad_migrate/analysis/2026-03-30-load-model-parity-pytest.log`

## Pass/fail outcomes by required workflow file

- `tests/test_workflow_lti.py`: PASS
- `tests/test_workflow_kp.py`: PASS
- `tests/test_workflow_ltg.py`: PASS
- `tests/test_workflow_ltga.py`: PASS
- `tests/test_workflow_ker_auto.py`: PASS
- `tests/test_workflow_ker_ctrl.py`: PASS
- `tests/test_workflow_sa_lti.py`: PASS (one rerun before pass on `test_sa[4]`)

Evidence from the persisted log:

- `tests/test_workflow_lti.py::...` entries at lines 2, 50-63
- `tests/test_workflow_kp.py::...` entries at lines 64-74
- `tests/test_workflow_ltg.py::...` entries at lines 75-90
- `tests/test_workflow_ltga.py::...` entries at lines 91-104
- `tests/test_workflow_ker_auto.py::...` entries at lines 105-109
- `tests/test_workflow_ker_ctrl.py::...` entries at lines 110-114
- `tests/test_workflow_sa_lti.py::...` entries at lines 115-123 (with `RERUN` at line 119, then `PASSED` at line 120)
- Final pytest summary: line 152 (`74 passed, 7 warnings, 1 rerun in 66.03s`)

## Residual parity gaps

- No failing parity-critical workflow in the required list (0/7 files failed).
- Warning-level residual risk remains around the spectral-analysis path:
  - runtime warnings in `src/dymad/sako/sako.py:151` during `test_workflow_sa_lti.py::test_sa[4]` (lines 139-148)
  - one rerun needed for `test_sa[4]` before passing (lines 119-120)

## Interpretation

At the required workflow-file level, parity gates are currently green for the selected `load_model` workflows in the frozen reference package. The remaining risk is stability/noise in the SA path rather than an outright parity failure.
