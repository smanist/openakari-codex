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

## Execution findings (2026-04-16, `ker_lti` nondeterminism diagnosis)

Follow-up diagnosis focused on whether fixed-seed reruns remain stable for `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`.

Observed behavior:
- Repeating the exact same `km_ln` test command with the same seed still produced different failing values and scales (examples: `18.46x`, `3.33x`, `7.99x` over limit in default mode).
- Even with thread pinning (`OMP_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, etc.), failures still varied widely (`1.06x` to `44.25x` over limit).
- `--showlocals` runs showed the failing metric can flip between `crit_valid_last` and `crit_train_last`.
- `dkm_ln` also fails in this file under the same harness (`crit_train_last`, `5.87x` over limit).

Verification evidence captured:
- `cd modules/dymad_dev && for mode in default serial; do ... pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' ...; done`
  - default examples: `5.565582586220919e-05 <= 3.0152980685024556e-06`, `0.498131653991013 <= 0.14944818489137485`, `0.01867423212532156 <= 0.00233733233805354`
  - serial examples: `4.844859347597597e-06 <= 3.0152980685024556e-06`, `0.10342498899581704 <= 0.00233733233805354`, `8.728553968644036 <= 8.196865277722416`
- `cd modules/dymad_dev && for i in 1 2 3 4; do pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' ...; done`
  - run excerpts:
    - `metric_name = 'crit_valid_last'`, `0.010308897274475396 <= 0.00233733233805354`
    - `metric_name = 'crit_train_last'`, `0.00012279360711213943 <= 3.0152980685024556e-06`
- `cd modules/dymad_dev && pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[dkm_ln]'`
  - `metric_name = 'crit_train_last'`, `5.019007493601319e-07 <= 8.55738987656145e-08`

Code-path findings:
- `scripts/ker_lti/ker_model.yaml` sets `dataloader.batch_size: 30` without `shuffle`.
- `src/dymad/io/trajectory_manager.py` defaults `shuffle=True` when not configured.
- No deterministic-runtime toggles were found in `src/`, `scripts/`, or `tests/` (`rg ... deterministic ...` had no matches).

Resulting recommendation:
- Decompose Family 2 work: treat `test_slow_ker_lti_cli.py` as a dedicated deterministic-runtime diagnosis stream before additional seed sweeps; keep threshold and baseline files untouched.
- Full diagnosis note: `projects/dymad_dev/analysis/diagnosis-ker-lti-nondeterminism-2026-04-16.md`.

## Execution findings (2026-04-16, `ker_lti` deterministic-control probe)

Follow-up diagnosis tested four deterministic-runtime settings for `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`, with 5 reruns each (`20` runs total):

1. default shuffle + default threads,
2. default shuffle + pinned threads,
3. `shuffle: false` + default threads,
4. `shuffle: false` + pinned threads.

Observed behavior:
- No setting achieved stable pass behavior (`5/5`): pass counts were `0/5`, `1/5`, `1/5`, `1/5` respectively (`3/20` overall).
- The best severity profile was `shuffle: false` + pinned threads (failure-ratio min/avg/max `1.095 / 1.737 / 2.267`), but it still failed in `4/5` reruns.
- Failing metric names remained variable across settings (`crit_train_last`, `crit_valid_last`, `best_valid_total`, `rmse`), which indicates residual nondeterminism beyond seed-only controls.

Verification evidence captured:
- Probe command per run:
  - `cd modules/dymad_dev && pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]'`
- Structured results:
  - `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_probe_2026-04-16.csv`
  - `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_probe_2026-04-16.json`
  - `projects/dymad_dev/analysis/data/ker_lti_controls_logs_2026-04-16/`

Implication for next session:
- Treat `test_slow_ker_lti_cli.py` as not yet seed-only stabilizable under currently tested controls; do not spend additional broad seed-sweep budget on this case until deeper runtime-determinism hypotheses are tested.

## Execution findings (2026-04-16, `ker_lti` deeper runtime-determinism controls)

This follow-up targeted the explicit next-step controls layered on top of the prior best setting (`shuffle: false` + thread pinning), with five reruns per setting for `km_ln`.

Test target (all runs):

- `cd modules/dymad_dev && pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]'`

Controls evaluated:

1. `S5_shuffle_false_thread_pinned_workers0`:
   - Adds explicit `dataloader.num_workers: 0`
2. `S6_workers0_torch_deterministic`:
   - S5 + `torch.use_deterministic_algorithms(True)`, `torch.set_num_threads(1)`, `torch.set_num_interop_threads(1)`, `torch.backends.mkldnn.enabled=False`
3. `S7_workers0_deterministic_cache_isolated`:
   - S6 + `pytest --cache-clear`, per-run `--basetemp`, `MKL_CBWR=COMPATIBLE`

Structured artifacts:

- `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_deeper_probe_2026-04-16.csv`
- `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_deeper_probe_2026-04-16.json`
- `projects/dymad_dev/analysis/data/ker_lti_controls_deeper_logs_2026-04-16/`

Observed behavior:

- `S5`: `1/5` passes (ratio min/avg/max on failures: `10.898 / 122.605 / 290.152`)
- `S6`: `0/5` passes (ratio min/avg/max: `1.243 / 7164.143 / 35805.753`)
- `S7`: `0/5` passes (ratio min/avg/max: `1.065 / 10.943 / 48.547`)
- Overall: `1/15` passes

Arithmetic provenance from CSV:

- `S5`: `1/5 = 20%`
- `S6`: `0/5 = 0%`
- `S7`: `0/5 = 0%`
- Overall: `1/15 = 6.7%`

Implication for next session:

- Record a **no-go** for additional seed-only sweeps on `test_slow_ker_lti_cli.py`.
- Continue Family 2 seed-only stabilization on other files while isolating `ker_lti` as a separate non-seed remediation stream.
