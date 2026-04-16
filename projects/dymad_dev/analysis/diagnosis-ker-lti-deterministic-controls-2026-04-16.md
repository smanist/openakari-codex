# Diagnosis: deterministic-runtime controls for `test_slow_ker_lti_cli.py`

Date: 2026-04-16
Task: `Isolate deterministic-runtime controls for test_slow_ker_lti_cli.py before further seed sweeps`

## Question

Which deterministic-runtime controls reduce run-to-run instability for `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`, and are those controls sufficient to make the case seed-only stabilizable?

## Exact probe setup

Executed 4 control settings with 5 reruns each (20 runs total) against the same pytest case:

```bash
cd modules/dymad_dev
pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]'
```

Control dimensions:

1. DataLoader shuffle behavior via `scripts/ker_lti/ker_model.yaml`
   - default (no `shuffle` key, runtime default `shuffle=True`)
   - `shuffle: false`
2. Thread pinning environment
   - default
   - pinned: `OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1 PYTHONHASHSEED=0`

Run artifacts:

- per-run data: `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_probe_2026-04-16.csv`
- JSON mirror: `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_probe_2026-04-16.json`
- raw logs: `projects/dymad_dev/analysis/data/ker_lti_controls_logs_2026-04-16/`

## Results by setting

| Setting | Definition | Passes | Failure ratio stats (`actual/limit`) | Failing metrics observed |
| --- | --- | --- | --- | --- |
| `S1_default_shuffle_default_threads` | default shuffle + default threads | `0/5` | min `1.148`, avg `2.000`, max `3.119` | `crit_train_last` (4), `rmse` (1) |
| `S2_default_shuffle_thread_pinned` | default shuffle + pinned threads | `1/5` | min `1.083`, avg `2.910`, max `7.692` | `crit_train_last` (2), `crit_valid_last` (1), `best_valid_total` (1) |
| `S3_shuffle_false_default_threads` | `shuffle: false` + default threads | `1/5` | min `2.672`, avg `9.142`, max `26.900` | `crit_valid_last` (2), `crit_train_last` (1), `best_valid_total` (1) |
| `S4_shuffle_false_thread_pinned` | `shuffle: false` + pinned threads | `1/5` | min `1.095`, avg `1.737`, max `2.267` | `rmse` (2), `crit_valid_last` (2) |

Arithmetic provenance from CSV:

- S1 pass rate: `0/5 = 0%`
- S2 pass rate: `1/5 = 20%`
- S3 pass rate: `1/5 = 20%`
- S4 pass rate: `1/5 = 20%`
- Overall pass rate: `3/20 = 15%`

## Interpretation

1. No tested setting achieved reproducible pass behavior (none reached `5/5`).
2. `shuffle: false` combined with thread pinning (`S4`) reduced failure severity spread compared with other settings (lowest mean ratio `1.737`), but still failed `4/5`.
3. Failing metric names remain unstable across settings (`crit_train_last`, `crit_valid_last`, `best_valid_total`, `rmse`), which is consistent with residual nondeterminism beyond seed choice alone.

## Recommendation

Minimal viable controls from this probe are:

1. Explicit `dataloader.shuffle: false`
2. Thread pinning (`OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, `VECLIB_MAXIMUM_THREADS=1`, `NUMEXPR_NUM_THREADS=1`, `PYTHONHASHSEED=0`)

However, these controls are **not sufficient** to make `ker_lti[km_ln]` seed-only stabilizable under current thresholds (`4/5` failures in the best setting). Treat `test_slow_ker_lti_cli.py` as not-yet seed-fixable and avoid additional broad seed sweeps until deeper runtime-determinism controls are diagnosed.
