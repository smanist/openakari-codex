# Implementation Validation: deterministic fixture-backed `ker_lti` harness redesign

Date: 2026-04-16
Task: `Implement the deterministic fixture-backed ker_lti harness redesign`
Related design: `projects/dymad_dev/analysis/design-ker-lti-harness-redesign-2026-04-16.md`

## Knowledge output

Validate whether the implemented harness redesign meets the required stability contract for `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]` while preserving threshold logic and adding the required safeguards.

## Findings

1. The first implementation state (fixture data + live training gate) did not satisfy the stability contract.
   - Command: repeated `km_ln` invocation loop on the redesigned test.
   - Result: `6/10` pass rate (`4/10` fails).
   - Provenance: command output captured in-session (`summary 6 / 10`).

2. Converting the `km_ln` baseline gate to consume committed fixture artifacts (`checkpoint`, `summary`, `record`) produced deterministic gate behavior under the required invocation form.
   - Command:
     - `cd modules/dymad_dev && PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src python -u - <<'PY' ... pytest -q --reruns 0 -o log_cli=false tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln] ... (10 runs) ... PY`
   - Result: `10/10` pass rate.
   - Arithmetic: `10/10 = 100%`.

3. The safeguard checks pass after the redesign.
   - Live-path smoke command:
     - `cd modules/dymad_dev && PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src pytest -q --reruns 0 -o log_cli=false tests/test_slow_ker_lti_cli.py::test_ker_lti_live_smoke`
     - Output: `.` (pass)
   - Negative-control command:
     - `cd modules/dymad_dev && PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src pytest -q --reruns 0 -o log_cli=false tests/test_slow_ker_lti_cli.py::test_ker_lti_fixture_negative_control`
     - Output: `.` (pass; assertion is expected to fail inside `pytest.raises`)
   - Threshold-logic immutability check:
     - `cd modules/dymad_dev && git diff -- tests/slow_regression_utils.py tests/slow_ker_lti_cli_baselines.json`
     - Output: empty diff

4. Fixture provenance is now explicit for the `km_ln` gate artifacts.
   - Added artifacts:
     - `modules/dymad_dev/tests/fixtures/ker_lti/ker_km_ln_seed12345.pt`
     - `modules/dymad_dev/tests/fixtures/ker_lti/ker_km_ln_seed12345_summary.npz`
     - `modules/dymad_dev/tests/fixtures/ker_lti/ker_km_ln_seed12345_record.json`
   - Metadata lock updated in:
     - `modules/dymad_dev/tests/fixtures/ker_lti/ker_seed12345.metadata.json`
   - Test-level provenance verification now asserts these artifact hashes.

## Decision

Adopt fixture-backed baseline gating for `km_ln` in `test_slow_ker_lti_cli.py`, with live-path smoke and explicit negative control as separate safeguards. This satisfies the required local stability criterion (`10/10`) without widening thresholds or editing baseline JSON.
