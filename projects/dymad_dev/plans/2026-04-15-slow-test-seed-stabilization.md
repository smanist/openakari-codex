# Slow Test Seed Stabilization Plan

Date: 2026-04-15

## Knowledge output

This work asks a narrow operational question: can DyMAD's flaky slow regression tests be made reliable by changing only random seeds, without widening tolerances or rewriting the baseline criteria?

## Current findings

- Slow-regression acceptance thresholds live in `modules/dymad_dev/tests/slow_regression_utils.py` via `SAFETY_FACTOR`, `ABS_TOLERANCES`, and `compare_record_metrics(...)`. These are explicitly out of scope for this workstream.
- The Pytest marker configuration in `modules/dymad_dev/pyproject.toml` defines both `slow` and `extra_slow`.
- Many `modules/dymad_dev/tests/test_slow_*` files already expose deterministic controls through `TEST_SEED`, explicit `np.random.seed(...)` / `torch.manual_seed(...)`, and CLI `--seed` arguments.
- Currently identified `extra_slow` cases include:
  - `modules/dymad_dev/tests/test_slow_lti_cli.py::test_lti_cli_training_regression_extra_slow`
  - `modules/dymad_dev/tests/test_slow_vortex_cli.py` marker path
- The likely implementation surface is therefore the seed literals and seed arguments in the slow-test files, not the regression harness or baseline store.

## Hard scope constraints

- Change only random seeds.
- Do not change metric thresholds.
- Do not change `slow_regression_utils.py`.
- Do not change baseline JSON files.
- Do not change the asserted error criteria.

## Target families

### Family 1: LTI / graph / PIROM

Representative files:
- `modules/dymad_dev/tests/test_slow_lti_cli.py`
- `modules/dymad_dev/tests/test_slow_lti_dt_cli.py`
- `modules/dymad_dev/tests/test_slow_lti_delay_cli.py`
- `modules/dymad_dev/tests/test_slow_ltg_dt_cli.py`
- `modules/dymad_dev/tests/test_slow_ltg_dt_tv_cli.py`
- `modules/dymad_dev/tests/test_slow_linear_graph_cli.py`
- `modules/dymad_dev/tests/test_slow_linear_graph_auto_cli.py`
- `modules/dymad_dev/tests/test_slow_pirom_dyn_cli.py`
- `modules/dymad_dev/tests/test_slow_pirom_res_cli.py`
- `modules/dymad_dev/tests/test_slow_pirom_res_dt_cli.py`

### Family 2: Kernel / Koopman

Representative files:
- `modules/dymad_dev/tests/test_slow_ker_lti_cli.py`
- `modules/dymad_dev/tests/test_slow_ker_lco_cli.py`
- `modules/dymad_dev/tests/test_slow_ker_s1_cli.py`
- `modules/dymad_dev/tests/test_slow_ker_s1u_cli.py`
- `modules/dymad_dev/tests/test_slow_kp_train_cli.py`
- `modules/dymad_dev/tests/test_slow_kp_sweep_dt_cli.py`
- `modules/dymad_dev/tests/test_slow_kp_sweep_ct_cli.py`
- `modules/dymad_dev/tests/test_slow_kp_sa_cli.py`

### Family 3: Remaining long-running and extra_slow cases

Representative files:
- `modules/dymad_dev/tests/test_slow_lorenz63_cli.py`
- `modules/dymad_dev/tests/test_slow_kuramoto_cli.py`
- `modules/dymad_dev/tests/test_slow_vortex_cli.py`
- `modules/dymad_dev/tests/test_slow_vortex_train_cli.py`
- the `extra_slow` case inside `modules/dymad_dev/tests/test_slow_lti_cli.py`

## Seed-entry inventory (2026-04-15 verification)

This inventory records the currently wired seed controls that the seed-only sweep is allowed to edit.

### Shared seed control patterns

- Module-level `TEST_SEED` constants are present across all currently targeted `test_slow_*` files.
- CLI test invocations pass explicit `--seed` arguments in all targeted families.
- Many files also call `np.random.seed(TEST_SEED)` and `torch.manual_seed(TEST_SEED)` before command execution.
- One targeted Koopman file (`test_slow_kp_sa_cli.py`) additionally uses `module.set_seed(TEST_SEED)`.

### Family-level inventory

| Family | Target files | Verified seed entry points |
| --- | --- | --- |
| Family 1: LTI / graph / PIROM | `test_slow_lti_cli.py`, `test_slow_lti_dt_cli.py`, `test_slow_lti_delay_cli.py`, `test_slow_ltg_dt_cli.py`, `test_slow_ltg_dt_tv_cli.py`, `test_slow_linear_graph_cli.py`, `test_slow_linear_graph_auto_cli.py`, `test_slow_pirom_dyn_cli.py`, `test_slow_pirom_res_cli.py`, `test_slow_pirom_res_dt_cli.py` | `TEST_SEED`, CLI `--seed`, plus NumPy/Torch manual seeding in most files |
| Family 2: Kernel / Koopman | `test_slow_ker_lti_cli.py`, `test_slow_ker_lco_cli.py`, `test_slow_ker_s1_cli.py`, `test_slow_ker_s1u_cli.py`, `test_slow_kp_train_cli.py`, `test_slow_kp_sweep_dt_cli.py`, `test_slow_kp_sweep_ct_cli.py`, `test_slow_kp_sa_cli.py` | `TEST_SEED`, CLI `--seed`, NumPy/Torch manual seeding, and `module.set_seed(TEST_SEED)` in `test_slow_kp_sa_cli.py` |
| Family 3: Remaining / extra_slow | `test_slow_lorenz63_cli.py`, `test_slow_kuramoto_cli.py`, `test_slow_vortex_cli.py`, `test_slow_vortex_train_cli.py`, `test_slow_lti_cli.py::test_lti_cli_training_regression_extra_slow` | `TEST_SEED`, CLI `--seed`; extra_slow marker locations in `test_slow_vortex_cli.py` and `test_slow_lti_cli.py` |

## Execution pattern

1. Pick one family at a time.
2. Run the targeted slow or extra_slow tests with the current thresholds unchanged.
3. If a case fails for regression-metric drift, search only over seed values already wired into the test or CLI path.
4. Keep the smallest diff possible: change seed literals / arguments only.
5. Re-run the targeted tests and confirm the original thresholds now pass.
6. Audit the final diff to confirm no thresholds, baselines, or regression utilities changed.

## Verification expectations

Successful completion of each execution task should record:
- the exact pytest command
- the passing output summary
- a `git diff --word-diff` or equivalent confirmation that only seed literals / seed args changed

Final compliance check should explicitly confirm no edits to:
- `modules/dymad_dev/tests/slow_regression_utils.py`
- `modules/dymad_dev/tests/*baselines.json`
- metric tolerance constants or comparison logic

## Execution findings (2026-04-15, Family 2 exploratory sweep)

The first execution pass focused on Family 2 (`kernel` / `koopman`) with a strict fail-fast gate to avoid claiming stability from rerun masking.

Observed behavior:
- `tests/test_slow_ker_lti_cli.py` failed immediately under `--reruns 0` at `test_ker_lti_cli[km_ln]` and `test_ker_lti_cli[dkm_ln]` with the baseline seed (`12345`).
- Candidate-seed sweeps over representative values (`20260415`, `424242`, `8675309`, `271828`, `314159`, `20251234`, `777`, `98765`, `11111`, `54321`) still failed fail-fast at `km_ln`.
- The full Family 2 fail-fast run with temporary exploratory seeds also stopped at `km_ln`, so no verified seed-only patch was retained in this session.

Verification evidence captured:
- `cd modules/dymad_dev && pytest -q --reruns 0 -o log_cli=false tests/test_slow_ker_lti_cli.py`
  - `FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`
  - `FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[dkm_ln]`
- `cd modules/dymad_dev && pytest -q -o log_cli=false -x tests/test_slow_ker_lti_cli.py tests/test_slow_ker_lco_cli.py tests/test_slow_ker_s1_cli.py tests/test_slow_ker_s1u_cli.py tests/test_slow_kp_train_cli.py tests/test_slow_kp_sweep_dt_cli.py tests/test_slow_kp_sweep_ct_cli.py tests/test_slow_kp_sa_cli.py > /tmp/dymad_family2_failfast.log 2>&1`
  - `/tmp/dymad_family2_failfast.log` summary:
    - `FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`
    - Assertion excerpt: `assert 0.017551757928779117 <= 0.00233733233805354`
    - `stopping after 1 failures`

Implication for next session:
- Keep the seed-only scope, but continue with a targeted per-file/per-case search strategy starting from `test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]` before touching broader Family 2 files.

## Execution findings (2026-04-16, Family 2 `ker_lti` deep seed probe)

Follow-up probing kept the same hard scope constraints (seed-only edits, no threshold/baseline changes) and targeted `tests/test_slow_ker_lti_cli.py` first.

Observed behavior:
- With current baseline seed (`12345`), repeated fail-fast single-case runs for `km_ln` failed every time (`5/5` failures), but with different failing metrics/magnitudes per run (evidence of residual nondeterminism beyond just one bad seed draw).
- A direct candidate-seed scan over `19` seeds (`20260415`, `12345`, `424242`, `8675309`, `271828`, `314159`, `20251234`, `777`, `98765`, `11111`, `54321`, plus 8 random seeds from `1..3,000,000`) found no seed that satisfied all `ker_lti` cases (`km_ln`, `dkm_ln`, `dks_ln`) under current thresholds.
- The same scan shows most failures still originate at `km_ln` metrics (`crit_valid_last`, `crit_train_last`, `best_valid_total`), but some candidate seeds also fail `dkm_ln` (`crit_valid_last`), so changing one shared `TEST_SEED` constant is not sufficient in the tested range.

Verification evidence captured:
- `cd modules/dymad_dev && for i in 1 2 3 4 5; do echo "RUN $i"; pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' >/tmp/km_ln_$i.log 2>&1; ec=$?; echo "exit=$ec"; rg -n "FAILED|1 passed|AssertionError|short test summary" /tmp/km_ln_$i.log || true; done`
  - `RUN 1 ... exit=1 ... AssertionError: assert 0.003362957967460712 <= 0.00233733233805354`
  - `RUN 2 ... exit=1 ... AssertionError: assert 6.39001787569422e-06 <= 3.0152980685024556e-06`
  - `RUN 3 ... exit=1 ... AssertionError: assert 0.10665102189075057 <= 0.00233733233805354`
  - `RUN 4 ... exit=1 ... AssertionError: assert 17.0598617123593 <= 8.196865277722416`
  - `RUN 5 ... exit=1 ... AssertionError: assert 0.2690109135729742 <= 0.00233733233805354`
- `cd modules/dymad_dev && python -u - <<'PY' ...` (seed scan script evaluating all `ker_lti` cases against baselines)
  - Output excerpts:
    - `seed_count=19`
    - `01 seed=20260415 FAIL km_ln:best_valid_total:1.405`
    - `14 seed=1496597 FAIL dkm_ln:crit_valid_last:5.329`
    - `19 seed=2318764 FAIL km_ln:best_valid_total:1.107`
    - `NO_SEED_FOUND`

Implication for next session:
- Keep Family 2 task open, but treat `test_slow_ker_lti_cli.py` as a potential non-seed-stabilizable outlier under current criteria.
- Before broader kernel/koopman edits, decide whether to (a) continue a larger seed search with stricter reproducibility controls, or (b) split out a diagnosis task for nondeterminism sources in `ker_lti` (still preserving the "no threshold/baseline edits" rule for this workstream).
