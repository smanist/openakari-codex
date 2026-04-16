# Design: harness-redesign path for `test_slow_ker_lti_cli.py`

Date: 2026-04-16
Task: `Design a harness-redesign path for test_slow_ker_lti_cli.py after deterministic-profile instability`
CI layers involved: L2 (runtime workflow), L4 (test methodology)

## Knowledge output

Determine which test contract can keep `ker_lti` regression-sensitive while eliminating the current run-order sensitivity (`km_ln` deterministic profile: `2/10 = 20%` pass rate).

## Problem statement

Current contract is a one-shot assertion over stochastic training outputs in `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`. Under fixed seed + deterministic profile, the case still fails in `8/10` runs with metric identity drift (`crit_valid_last`, `crit_train_last`, `rmse`) and extreme ratio spread (`1.25x` to `795.21x` over threshold).

Provenance:
- `projects/dymad_dev/analysis/diagnosis-ker-lti-deterministic-profile-validation-2026-04-16.md`
- `projects/dymad_dev/analysis/data/ker_lti_runtime_profile_validation_2026-04-16.csv`

## Options compared

### Option A: deterministic cached-fixture contract

Design:
1. Add a committed fixture artifact for `ker_lti` regression inputs (trajectory tensors + metadata) generated once from an explicitly pinned environment and seed.
2. Execute the existing CLI/training stack against fixture data instead of re-sampling trajectories at test time.
3. Keep current metric limits and baseline comparison logic unchanged.

Pros:
- Maximizes determinism; should eliminate stochastic sampling/order drift in the gate.
- Keeps the gate interpretable: same metrics, same thresholds, fewer confounds.
- Lower CI variance and lower rerun cost.

Cons:
- Reduced coverage of online sampler behavior inside this one test.
- Requires fixture lifecycle management (provenance + refresh policy).

### Option B: multi-run aggregate assertion on live stochastic path

Design:
1. Keep live sampling/training path unchanged.
2. Run `km_ln` N times (for example `N=5`) inside one test.
3. Gate on aggregate statistics (for example pass-rate floor + median ratio constraint) instead of single-run pass/fail.

Pros:
- Preserves full end-to-end stochastic path.
- No new fixture artifact.

Cons:
- Higher runtime/cost in slow suite.
- Harder to tune without accidentally masking regressions.
- Still vulnerable to severe variance outliers observed in current evidence.

## Recommended contract

Recommend **Option A** with an explicit regression-sensitivity safeguard bundle.

Reasoning:
- Existing evidence shows severe instability in the live one-shot gate even after deterministic controls.
- The immediate need is a stable, high-signal regression contract; deterministic fixtures isolate model/training regressions from sampling nondeterminism.
- Stochastic-path coverage can be retained via a separate smoke check (non-threshold regression gate) rather than coupling both concerns in one flaky threshold test.

## Regression-sensitivity safeguards (mandatory)

1. Keep baseline contract unchanged:
- no edits to `modules/dymad_dev/tests/slow_regression_utils.py`
- no threshold widening
- no baseline JSON threshold schema change

2. Fixture provenance lock:
- record generation command, seed, config files, and environment fingerprint (at minimum torch + numpy versions) next to fixture metadata
- store fixture hash and assert it in test setup

3. Metric guard continuity:
- continue asserting the same metric names currently checked (`best_valid_total`, `final_valid_loss`, `rmse`, and case-specific crit metrics)
- keep `scaled_limit(...)` path untouched

4. Live-path coverage retention:
- add a separate `ker_lti` smoke check that still exercises live sampling/training and asserts structural invariants (artifacts exist, summaries finite, no NaN/Inf)
- do not use this smoke check as a threshold baseline gate

5. Negative control:
- include one explicit regression-sensitivity probe (for example perturbing a fixture tensor by a known scale in a dedicated test helper) that must fail metric checks

## Follow-on implementation task definition

Implement: `Replace one-shot ker_lti baseline gate with deterministic fixture-backed harness plus live-path smoke check`.

Done when:
1. `tests/test_slow_ker_lti_cli.py` can run the baseline gate from deterministic fixture inputs.
2. Existing metric limit path remains unchanged (`slow_regression_utils.py` untouched).
3. A live-path smoke check exists for `ker_lti` and passes under current environment.
4. A negative-control regression-sensitivity check fails as expected when fixture data are intentionally perturbed.
5. Repeated stability check passes `10/10` local invocations for `km_ln` on the redesigned gate.

Verification commands/criteria for the implementation task:

```bash
# 1) redesigned deterministic gate stability (must pass 10/10)
cd modules/dymad_dev
for i in $(seq 1 10); do
  PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src \
  pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]'
done
```
Success criterion: all 10 invocations exit 0.

```bash
# 2) scope compliance (must show no threshold-logic edits)
git diff -- modules/dymad_dev/tests/slow_regression_utils.py modules/dymad_dev/tests/slow_ker_lti_cli_baselines.json
```
Success criterion: empty diff for threshold-logic changes (fixture metadata additions are allowed only outside baseline threshold schema).

```bash
# 3) live-path smoke check
a=$(PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src \
  pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_live_smoke')
echo "$a"
```
Success criterion: smoke test passes and reports finite metrics/artifact existence assertions.

```bash
# 4) negative control (must fail intentionally perturbed case)
PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src \
pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_fixture_negative_control'
```
Success criterion: this check fails on purpose in the perturbed path and is asserted via `pytest.raises` / explicit failure expectation in the test design.

## Open risk

Fixture-backed gating can drift away from real runtime behavior if fixture refreshes are unmanaged. The mitigation is explicit fixture provenance and a companion live-path smoke check kept in CI.
