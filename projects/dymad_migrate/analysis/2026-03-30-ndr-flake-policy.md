# Policy: flake-aware parity gate for `tests/test_assert_trans_ndr.py::test_ndr[0]`

Date: 2026-03-30
Status: accepted
Related diagnosis: `projects/dymad_migrate/analysis/2026-03-30-ndr-idx0-parity-diagnosis.md`

## Context

`test_assert_trans_ndr.py::test_ndr[0]` was previously treated as a single-run blocker in parity checks. The diagnosis run on 2026-03-30 showed intermittent failures tied to unseeded fixture randomness and near-threshold ratios, not a deterministic regression.

Provenance from diagnosis:
- repeated isolated runs: `3/30` failures (`10.0%`)
- failure modes: `Isomap recon. error` and `Isomap reload, transform`
- fixture stochasticity: `Ms = np.random.rand(2, M)` in the test module

## Rule

For this single test case only (`tests/test_assert_trans_ndr.py::test_ndr[0]`):

1. If a normal parity sweep reports this case as failed, run an adjudication sweep of 30 isolated runs (`--reruns=0`).
2. Classify as **flake-managed pass** when:
   - failures are `<= 4/30` (13.3%), and
   - all failures are one of:
     - `AssertionError: Isomap recon. error`
     - `AssertionError: Isomap reload, transform`
3. Classify as **hard blocker** when:
   - failures are `>= 5/30`, or
   - any other assertion/failure type appears.

## Adjudication commands

```bash
cd modules/dymad_ref && PYTHONPATH=src bash -lc 'for i in {1..30}; do
  echo "===== RUN $i ====="
  pytest "tests/test_assert_trans_ndr.py::test_ndr[0]" --reruns=0 -q
  ec=$?
  echo "EXIT_CODE=$ec"
done'
```

```bash
rg -c "AssertionError: Isomap recon. error|AssertionError: Isomap reload, transform" <repeat-log>
rg -c "EXIT_CODE=1" <repeat-log>
```

## Consequence

This policy prevents single-run false blockers from stalling migration while still preserving a strict escalation threshold if failure frequency or failure mode worsens.
