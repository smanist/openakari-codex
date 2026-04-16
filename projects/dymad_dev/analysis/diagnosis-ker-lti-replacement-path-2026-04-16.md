# Diagnosis: replacement path for `test_slow_ker_lti_cli.py` after seed-only no-go

Date: 2026-04-16
Task: `Decide replacement path for test_slow_ker_lti_cli.py after seed-only no-go`
CI layers involved: L2 (workflow/runtime), L4 (test methodology)

## Error distribution recap

From existing probe artifacts:

- Seed-only sweep (`19` candidate seeds) found no pass-all seed for `ker_lti`:
  - `0/19 = 0%` pass-all (`projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`)
- Deterministic-control probe:
  - `3/20 = 15%` overall pass rate (`projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_probe_2026-04-16.csv`)
- Deeper control probe:
  - `1/15 = 6.7%` overall pass rate (`projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_deeper_probe_2026-04-16.csv`)

The recurring failure pattern is not only low pass rate; it also includes metric identity drift (`crit_train_last`, `crit_valid_last`, `best_valid_total`, `rmse`) across repeated same-seed runs.

## New code-path finding (this session)

`dataloader.num_workers` is not currently wired through trajectory manager dataloader creation:

- `modules/dymad_dev/src/dymad/io/trajectory_manager.py` creates `DataLoader(...)` with `batch_size`, `shuffle`, and `collate_fn` only.
- Repo search for worker-related knobs returned no runtime wiring:
  - `rg -n "num_workers|persistent_workers|pin_memory|prefetch_factor" modules/dymad_dev/src/dymad`
  - no matches

Implication: prior "workers0" probe settings were effectively testing labels/config metadata, not an active runtime worker control path.

## Replacement options compared

### Option 1: Runtime deterministic hardening (L2)

Scope:
- Add actual dataloader worker-control wiring (at minimum `num_workers`) to trajectory manager.
- Set explicit deterministic defaults for `ker_lti` slow regression path (`shuffle: false`, deterministic torch toggles where valid).
- Re-run repeated same-seed tests (`km_ln`) to check whether variance collapses.

Pros:
- Targets probable root causes directly in runtime behavior.
- Produces reusable determinism controls for other slow CLI regressions.

Cons:
- Requires code changes outside seed-only scope.
- May still not be sufficient if instability is methodological.

### Option 2: Test/harness redesign (L4)

Scope:
- Redesign `test_slow_ker_lti_cli.py` acceptance so it does not rely on one-shot noisy endpoints (e.g., deterministic fixture split, revised assertion structure, or narrower contract).

Pros:
- Can make the test robust even if runtime remains stochastic.

Cons:
- Changes the measurement contract; risks masking true regressions if done too loosely.
- Requires careful rationale and stronger review burden than runtime controls.

### Option 3: Explicit scope carve-out from seed-only stream (L2/L4 boundary control)

Scope:
- Keep Family 2 seed-only task focused on other files.
- Move `ker_lti` to a dedicated non-seed remediation stream (runtime hardening first, redesign only if hardening fails).

Pros:
- Unblocks the main seed-only stream immediately.
- Prevents continued low-yield seed sweeps on a known no-go case.

Cons:
- Does not itself fix `ker_lti`; requires follow-on execution.

## Recommended path

Recommend **Option 3 (explicit carve-out) with Option 1 as the immediate downstream execution stream**.

Rationale:
- Existing data already gives a no-go signal for seed-only on `ker_lti` (`0/19`, `3/20`, `1/15`).
- The newly confirmed missing `num_workers` wiring means at least one previously tested "determinism" lever was not active.
- Carve-out keeps throughput on other kernel/koopman files while directing `ker_lti` effort toward verifiable runtime controls instead of repeated seed search.

## What not to do

- Do not continue broad seed sweeps for `test_slow_ker_lti_cli.py` until runtime-control wiring is verified in code.
- Do not loosen thresholds/baselines as a first response; that changes the test contract before root cause is understood.

## Downstream execution tasks required

1. Runtime wiring task:
   - Add dataloader worker-control support (at minimum `num_workers`) in trajectory manager and verify the setting is used in `ker_lti` runtime path.
2. Determinism validation task:
   - Re-run `test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]` for at least 10 same-seed reruns under explicit deterministic profile (`shuffle: false`, wired worker config, thread pinning, deterministic torch knobs) and report pass rate + failing-metric distribution.
3. Contingency (only if task 2 remains unstable):
   - Propose a harness redesign with explicit contract justification and verification criteria.

