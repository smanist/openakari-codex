# Parity-Critical Workflow Gate Outcomes (2026-03-30)

## Scope

This run evaluates the blocker + milestone workflow files listed in `projects/dymad_migrate/knowledge/parity-critical-workflows.md`.

## Verification command

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_assert_trajmgr.py tests/test_assert_dm.py tests/test_assert_trajmgr_graph.py tests/test_assert_graph.py tests/test_assert_transform.py tests/test_assert_trans_mode.py tests/test_assert_trans_lift.py tests/test_assert_trans_ndr.py tests/test_workflow_lti.py tests/test_workflow_kp.py tests/test_workflow_ltg.py tests/test_workflow_ltga.py tests/test_workflow_sa_lti.py tests/test_assert_resolvent.py tests/test_assert_spectrum.py tests/test_workflow_sample.py -q
```

Raw output log: `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-pytest.log`

## Findings

1. Aggregate pytest result indicates one blocker regression remains.
   - Source: final summary line in `2026-03-30-parity-critical-gate-pytest.log`
   - `1 failed, 105 passed, 1269 warnings, 2 rerun in 61.90s`

2. Blocker file-level gate is not fully passing.
   - File status counts from the same log:
   - `9/10` blocker files passed, `1/10` failed.
   - Failed blocker file: `tests/test_assert_trans_ndr.py`.

3. Milestone file-level gate is currently passing.
   - `6/6` milestone files passed, `0/6` failed.

4. The failing blocker assertion is the Isomap reconstruction threshold in `test_ndr[0]`.
   - Failure excerpt reports: `0.0020881692953870334 / 38.15629802279388 < 3e-05` (false).
   - Derived normalized error: `0.0020881692953870334 / 38.15629802279388 = 5.472672674219074e-05`.
   - Relative to threshold: `5.472672674219074e-05 / 3e-05 = 1.8242242247396914` (about `1.82x` over threshold).

## Decision

Parity is **not yet stable** for the current migration baseline because a blocker-class file (`tests/test_assert_trans_ndr.py`) failed in the parity gate.

## Implication for project Done-when

The README Done-when clause requiring preservation of selected parity-critical legacy workflows is not yet satisfied for this baseline snapshot.
