# Parity Gate Adjudication Under the Flake-Aware NDR Policy

Date: 2026-03-30
Status: completed
Related task: `Adjudicate parity-critical gate status using the flake-aware NDR policy`

## Goal

Re-evaluate parity-critical workflow preservation status using the recorded NDR flake policy in `projects/dymad_migrate/knowledge/parity-critical-workflows.md` section `3a`.

## Inputs and provenance

1. Aggregate gate run:
- `projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-pytest.log`
- summary: `1 failed, 105 passed, 1269 warnings, 2 rerun`
- failing file: `tests/test_assert_trans_ndr.py::test_ndr[0]`

2. NDR flake adjudication sweep:
- `projects/dymad_migrate/analysis/2026-03-30-ndr-test-idx0-reruns0-repeat.log`
- computed counts from the log:
  - runs: `30`
  - failures: `3`
  - allowed-type failures: `3` (`2` recon + `1` reload)

3. Policy source:
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md` section `3a`
- flake-managed pass if failures are `<= 4/30` and only known failure types appear
- hard blocker if failures are `>= 5/30` or any other failure type appears

## Findings

1. The aggregate parity gate had exactly one blocker-file failure in the previous run.
- Provenance: `2026-03-30-parity-critical-gate-pytest.log` summary and failing-test line.

2. The only blocker failure corresponds to the documented flake-managed case (`test_ndr[0]`).
- Provenance: failing line `FAILED tests/test_assert_trans_ndr.py::test_ndr[0]`.

3. NDR policy threshold is satisfied.
- Arithmetic: `3/30 = 10.0%` failures, which is within policy (`<= 4/30 = 13.3%`).
- Provenance: repeat log run/failure counts.

4. Failure types stay within policy-allowed assertion classes.
- Observed `E AssertionError` lines:
  - `Isomap recon. error` (`2`)
  - `Isomap reload, transform` (`1`)
- No additional `E AssertionError` class appeared.

5. Policy-adjusted blocker status is now pass.
- Prior blocker file result: `9/10` pass + `1` flake-managed case.
- Adjusted blocker result: `10/10` pass under recorded policy.
- Milestone status remains `6/6` pass from the same aggregate gate run.

## Decision

Under the currently recorded parity policy, the parity-preservation Done-when condition is **currently satisfied** for this baseline snapshot (2026-03-30): blocker and milestone workflow files are passing after policy-based adjudication of `test_ndr[0]`.

## Residual risk

This conclusion is policy-bound rather than deterministic for `test_ndr[0]`. If future rerun-0 sweeps exceed `4/30` failures or introduce a new failure type, parity status reverts to blocked.

## Verification commands

```bash
rg -n "FAILED tests/test_assert_trans_ndr.py::test_ndr\[0\]|1 failed, 105 passed" projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-pytest.log
python - <<'PY'
from pathlib import Path
import re
log = Path('projects/dymad_migrate/analysis/2026-03-30-ndr-test-idx0-reruns0-repeat.log').read_text()
runs = len(re.findall(r'^===== RUN ', log, flags=re.M))
fails = len(re.findall(r'^FAILED tests/test_assert_trans_ndr.py::test_ndr\[0\] - AssertionError: ', log, flags=re.M))
recon = len(re.findall(r'^E\s+AssertionError: Isomap recon\. error$', log, flags=re.M))
reload = len(re.findall(r'^E\s+AssertionError: Isomap reload, transform$', log, flags=re.M))
print({'runs': runs, 'fails': fails, 'recon': recon, 'reload': reload})
PY
```
