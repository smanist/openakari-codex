# Spectral `--reruns=0` Parity Gate Verification

Date: 2026-04-04
Task: Record the `--reruns=0` spectral parity gate and update the scoreboard

## Scope

Run the agreed spectral workflow parity gate with reruns disabled and record exact outcomes and warning behavior.

## Verification command

1. `cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_sa_lti.py --reruns=0 -q`
   - `9 passed, 6 warnings in 8.46s`
   - Raw output log: `projects/dymad_migrate/analysis/2026-04-04-spectral-reruns0-parity-gate-pytest.log`

## Findings

1. The full SA workflow gate passed in one `--reruns=0` run (no retry allowance required).
   - Provenance: command output above (`9 passed`), plus raw pytest log.
2. The migrated compatibility-routing test remained green under the strict gate.
   - Provenance: `tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter PASSED` in the same output.
3. Warning behavior remains visible but non-fatal for this gate: two Torch JIT deprecation warnings, one complex-cast warning from `training/ls_update.py:300`, and three runtime warnings from `sako/sako.py:151` during `test_sa[4]`.
   - Provenance: warnings summary in the same command output and raw log.

## Notes

- This task records the explicit `--reruns=0` spectral parity evidence that was previously pending in the scoreboard.
