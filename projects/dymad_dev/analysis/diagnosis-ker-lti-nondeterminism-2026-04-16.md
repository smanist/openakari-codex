# Diagnosis: residual nondeterminism in `test_slow_ker_lti_cli.py`

Date: 2026-04-16
Task: `Diagnose residual nondeterminism in test_slow_ker_lti_cli.py under seed-only constraints`

## Question

Can `tests/test_slow_ker_lti_cli.py` be stabilized by seed-only edits, or is there residual nondeterminism that makes seed-only search low yield?

## Exact repro commands

1. Repeat the same seeded `km_ln` case with and without thread pinning:

```bash
cd modules/dymad_dev
for mode in default serial; do
  for i in 1 2 3; do
    log="/tmp/ker_lti_km_ln_${mode}_${i}.log"
    if [ "$mode" = "serial" ]; then
      OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1 PYTHONHASHSEED=0 \
        pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' >"$log" 2>&1 || true
    else
      pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' >"$log" 2>&1 || true
    fi
    rg -n "AssertionError|FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli\\[km_ln\\]" "$log" | sed -n '1,4p'
  done
done
```

2. Capture failing metric names with `--showlocals`:

```bash
cd modules/dymad_dev
for i in 1 2 3 4; do
  log="/tmp/ker_lti_km_ln_showlocals_${i}.log"
  pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' >"$log" 2>&1 || true
  rg -n "metric_name =|AssertionError: assert" "$log" | sed -n '1,4p'
done
```

3. Check whether `dkm_ln` also fails under the same test harness:

```bash
cd modules/dymad_dev
pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[dkm_ln]' \
  >/tmp/ker_lti_dkm_ln_showlocals.log 2>&1 || true
rg -n "metric_name =|AssertionError: assert|FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli\\[dkm_ln\\]" /tmp/ker_lti_dkm_ln_showlocals.log
```

## Observed variability

`km_ln` failures with the same test seed (`12345`) show large run-to-run spread:

- Default mode examples:
  - `5.565582586220919e-05 <= 3.0152980685024556e-06` (`18.46x` over limit)
  - `0.498131653991013 <= 0.14944818489137485` (`3.33x` over limit)
  - `0.01867423212532156 <= 0.00233733233805354` (`7.99x` over limit)
- Thread-pinned mode examples:
  - `4.844859347597597e-06 <= 3.0152980685024556e-06` (`1.61x` over limit)
  - `0.10342498899581704 <= 0.00233733233805354` (`44.25x` over limit)
  - `8.728553968644036 <= 8.196865277722416` (`1.06x` over limit)

`--showlocals` runs show the failing metric itself can change between runs:

- Run 1: `metric_name = 'crit_valid_last'`, `0.010308897274475396 <= 0.00233733233805354` (`4.41x`)
- Run 2: `metric_name = 'crit_valid_last'`, `0.002360620971949281 <= 0.00233733233805354` (`1.01x`)
- Run 3: `metric_name = 'crit_train_last'`, `1.2167635961816382e-05 <= 3.0152980685024556e-06` (`4.04x`)
- Run 4: `metric_name = 'crit_train_last'`, `0.00012279360711213943 <= 3.0152980685024556e-06` (`40.72x`)

`dkm_ln` also fails on `crit_train_last` in the same file:

- `metric_name = 'crit_train_last'`, `5.019007493601319e-07 <= 8.55738987656145e-08` (`5.87x`)

## Code-path evidence

1. Seeds are being set in both the test and script:
   - `tests/test_slow_ker_lti_cli.py` sets `TEST_SEED` and calls `np.random.seed(TEST_SEED)` / `torch.manual_seed(TEST_SEED)` and invokes CLI `--seed TEST_SEED`.
   - `scripts/ker_lti/ker_lti_cli.py` `set_seed(...)` sets Python, NumPy, and Torch RNGs.
2. Data loader order can still vary by default:
   - `scripts/ker_lti/ker_model.yaml` defines `dataloader.batch_size: 30` but no `shuffle`.
   - `src/dymad/io/trajectory_manager.py` uses `if_shuffle: bool = dl_cfg.get("shuffle", True)` and passes it into `DataLoader(..., shuffle=if_shuffle, ...)`.
3. No deterministic-runtime controls are enabled in this path:
   - `rg -n "use_deterministic_algorithms|cudnn\\.deterministic|cudnn\\.benchmark|torch\\.set_num_threads|deterministic" modules/dymad_dev/src modules/dymad_dev/scripts modules/dymad_dev/tests` returned no matches.

## Hypotheses

1. **Seed controls are present but insufficient to make training deterministic.**
   - Evidence: identical-seed reruns fail on different metrics (`crit_valid_last` vs `crit_train_last`) with spread from `1.01x` to `40.72x` over threshold.

2. **Default shuffling in the data loader is a likely nondeterminism source in this test path.**
   - Evidence: this kernel test path does not set `dataloader.shuffle`, and the runtime defaults to `shuffle=True`.

3. **`ker_lti` instability is not isolated to `km_ln`; at least `dkm_ln` also breaches thresholds.**
   - Evidence: direct `dkm_ln` invocation failed (`5.87x` over `crit_train_last` limit).

## Recommendation

Decompose the current Family 2 seed-only stabilization task instead of continuing broad seed sweeps as-is:

1. Keep seed-only stabilization for other files that are still plausibly seed-fixable.
2. Treat `test_slow_ker_lti_cli.py` as a dedicated diagnosis stream with deterministic-runtime controls (e.g., explicit `shuffle=False`, deterministic Torch knobs, and run-order checks) before more seed searches.
3. Do not change thresholds or baselines in this diagnosis stream.
