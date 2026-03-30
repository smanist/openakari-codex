# Diagnosis: `test_assert_trans_ndr.py::test_ndr[0]` parity-gate failure mode

Date: 2026-03-30
Status: completed
Related task: `Diagnose test_assert_trans_ndr.py::test_ndr[0] parity-gate failure mode`

## Goal

Determine whether the NDR parity-gate failure is a deterministic blocker or a flake-managed condition, using repeated runs with exact outputs and normalized-error ranges.

## Commands executed

1. Repeated isolated test runs (`--reruns=0`) with exact pytest output:

```bash
cd modules/dymad_ref && PYTHONPATH=src bash -lc 'for i in {1..30}; do
  echo "===== RUN $i ====="
  pytest "tests/test_assert_trans_ndr.py::test_ndr[0]" --reruns=0 -q
  ec=$?
  echo "EXIT_CODE=$ec"
done'
```

Exact output: `projects/dymad_migrate/analysis/2026-03-30-ndr-test-idx0-reruns0-repeat.log`

2. Isomap ratio probe (same math path as `test_ndr[0]`) to capture full normalized-error ranges:

```bash
cd modules/dymad_ref && PYTHONPATH=src python /Users/daninghuang/Repos/openakari-codex/projects/dymad_migrate/analysis/2026-03-30-ndr-isomap-ratio-probe.py
```

Exact output: `projects/dymad_migrate/analysis/2026-03-30-ndr-isomap-ratio-probe.log`

3. Code inspection of the failing test:

```bash
sed -n '1,220p' modules/dymad_ref/tests/test_assert_trans_ndr.py
```

## Findings

1. The failure is intermittent, not deterministic, in isolated repeated runs.
- From the repeat log: `27` pass / `3` fail over `30` runs.
- Arithmetic provenance: `3/30 = 10.0%` failure rate.

2. Failures split across two assertions, with reconstruction threshold exceedance as the primary mode.
- Failure categories from `2026-03-30-ndr-test-idx0-reruns0-repeat.log`:
  - `2` runs: `AssertionError: Isomap recon. error`
  - `1` run: `AssertionError: Isomap reload, transform`
  - `0` runs: `AssertionError: Isomap reload, inv. trans.`
- Failed runs (from exact log parsing):
  - run 2: reload-transform ratio `1.5693551395120896e-13` vs threshold `1e-13`
  - run 14: recon ratio `3.053912400108185e-05` vs threshold `3e-05`
  - run 29: recon ratio `3.0406210899776877e-05` vs threshold `3e-05`

3. Normalized-error ranges show near-threshold behavior for both reconstruction and reload-transform checks.
- From `2026-03-30-ndr-isomap-ratio-probe.log` (30 trials):
  - recon range: `[1.634900138167055e-05, 2.95024235412379e-05]`
  - recon failures: `0/30` for threshold `3e-05`
  - reload-transform range: `[2.778685203437485e-14, 1.097809665838523e-13]`
  - reload-transform failures: `3/30` (`10.0%`) for threshold `1e-13`
  - reload-inverse range: `[9.725003936830169e-16, 2.6112987052518792e-15]`
  - reload-inverse failures: `0/30` for threshold `1e-14`

4. The test fixture itself is stochastic across processes.
- `modules/dymad_ref/tests/test_assert_trans_ndr.py` defines `Ms = np.random.rand(2, M)` at module import time with no seed.
- Each fresh pytest process gets a different random dataset `X`, which shifts margin-to-threshold for strict assertions.

5. The earlier parity-gate failure is consistent with the same instability class.
- Existing gate note (`projects/dymad_migrate/analysis/2026-03-30-parity-critical-gate-outcomes.md`) already recorded a larger recon exceedance (`5.472672674219074e-05` vs `3e-05`).
- Combined with this repeat sweep, the evidence indicates run-to-run variability rather than a single deterministic regression pattern.

## Decision: parity-gate classification

Treat `tests/test_assert_trans_ndr.py::test_ndr[0]` as a **flake-managed condition**, not a deterministic hard blocker, for migration parity sign-off in the current baseline.

Rationale:
- Failures are intermittent (`3/30`), not persistent.
- Both failing assertion types sit near strict numeric thresholds.
- The fixture generation is unseeded and therefore run-dependent by construction.

Practical implication:
- Keep the test in parity visibility, but avoid single-run hard-blocking semantics until gate policy is updated for flake handling (e.g., repeated-run criterion or deterministic fixture control).
