# Diagnosis: deeper runtime-determinism controls for `test_slow_ker_lti_cli.py`

Date: 2026-04-16
Task: `Probe deeper runtime-determinism controls for test_slow_ker_lti_cli.py`

## Question

Do additional runtime-determinism controls, layered on top of the previous best setting (`shuffle: false` + thread pinning), make `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]` seed-only stabilizable?

## Probe setup

All runs used the same pytest target:

```bash
cd modules/dymad_dev
pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]'
```

Controls evaluated (5 reruns each, 15 total):

1. `S5_shuffle_false_thread_pinned_workers0`
   - baseline best setting + explicit `dataloader.num_workers: 0`
2. `S6_workers0_torch_deterministic`
   - S5 + `torch.use_deterministic_algorithms(True)` + `torch.set_num_threads(1)` + `torch.set_num_interop_threads(1)` + `torch.backends.mkldnn.enabled = False`
3. `S7_workers0_deterministic_cache_isolated`
   - S6 + `pytest --cache-clear` + unique `--basetemp` per run + `MKL_CBWR=COMPATIBLE`

Artifacts:

- per-run table: `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_deeper_probe_2026-04-16.csv`
- JSON mirror: `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_deeper_probe_2026-04-16.json`
- raw logs: `projects/dymad_dev/analysis/data/ker_lti_controls_deeper_logs_2026-04-16/`

## Results

| Setting | Passes | Failure ratio stats (`actual/limit`) | Failing metrics observed |
| --- | --- | --- | --- |
| `S5_shuffle_false_thread_pinned_workers0` | `1/5` | min `10.898`, avg `122.605`, max `290.152` | `crit_valid_last` (3), `rmse` (1) |
| `S6_workers0_torch_deterministic` | `0/5` | min `1.243`, avg `7164.143`, max `35805.753` | `crit_train_last` (4), `rmse` (1) |
| `S7_workers0_deterministic_cache_isolated` | `0/5` | min `1.065`, avg `10.943`, max `48.547` | `best_valid_total` (1), `crit_train_last` (2), `crit_valid_last` (2) |

Arithmetic provenance from CSV:

- S5 pass rate: `1/5 = 20%`
- S6 pass rate: `0/5 = 0%`
- S7 pass rate: `0/5 = 0%`
- Overall pass rate: `1/15 = 6.7%`

## Interpretation

1. None of the deeper controls produced stable pass behavior (`5/5`) for `km_ln`.
2. Deterministic Torch controls did not reduce worst-case failures in this probe (`S6` max ratio `35805.753`).
3. Cache/run-order isolation improved worst-case severity relative to `S6` but still failed all reruns (`S7` pass rate `0/5`).
4. Failing metric identity remains unstable across settings (`crit_valid_last`, `crit_train_last`, `best_valid_total`, `rmse`).

## Go/No-go recommendation

**No-go** for further seed-only stabilization attempts on `test_slow_ker_lti_cli.py` at this stage.

Recommended next step:

- Continue Family 2 seed-only stabilization on other files (`ker_lco`, `ker_s1`, `ker_s1u`, `kp_*`) while treating `ker_lti` as a separate non-seed diagnosis/remediation stream.
