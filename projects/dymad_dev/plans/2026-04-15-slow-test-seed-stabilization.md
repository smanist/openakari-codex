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
