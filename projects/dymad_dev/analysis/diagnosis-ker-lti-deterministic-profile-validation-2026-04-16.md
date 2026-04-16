# Diagnosis: deterministic-profile validation for `test_slow_ker_lti_cli.py`

Date: 2026-04-16
Task: `Validate ker_lti stability under an explicit deterministic runtime profile`
CI layers involved: L2 (runtime workflow), L4 (test methodology)

## Question

After wiring `dataloader.num_workers`, does an explicit deterministic runtime profile make `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]` stable enough to stay in the seed-only stream?

## Deterministic profile and command

Profile applied for every run:

- same seed: `12345`
- `dataloader.shuffle: false`
- `dataloader.num_workers: 0`
- thread pinning: `OMP_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `NUMEXPR_NUM_THREADS=1`
- deterministic torch controls: `torch.use_deterministic_algorithms(True)`, `torch.set_num_threads(1)`, `torch.set_num_interop_threads(1)`, `torch.backends.mkldnn.enabled=False`
- cache/BLAS guard: `MKL_CBWR=COMPATIBLE`

Per-run command target (10 reruns):

```bash
cd modules/dymad_dev
PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src \
OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 NUMEXPR_NUM_THREADS=1 \
PYTHONHASHSEED=12345 MKL_CBWR=COMPATIBLE \
python -c "import torch, pytest; torch.use_deterministic_algorithms(True); torch.set_num_threads(1); torch.set_num_interop_threads(1); torch.backends.mkldnn.enabled=False; raise SystemExit(pytest.main(['-q','--reruns','0','-o','log_cli=false','--showlocals','--tb=long','tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]']))"
```

Artifacts:

- `projects/dymad_dev/analysis/data/ker_lti_runtime_profile_validation_2026-04-16.csv`
- `projects/dymad_dev/analysis/data/ker_lti_runtime_profile_validation_2026-04-16.json`
- `projects/dymad_dev/analysis/data/ker_lti_runtime_profile_logs_2026-04-16/`

## Error distribution

Arithmetic provenance from CSV:

- pass rate: `2/10 = 20%`
- failure rate: `8/10 = 80%`

Failing-metric distribution (`8` failures):

- `crit_valid_last`: `4/8 = 50%`
- `crit_train_last`: `3/8 = 37.5%`
- `rmse`: `1/8 = 12.5%`

Failure-ratio distribution (`actual/limit` from CSV):

- min: `1.2505`
- avg: `105.1205`
- max: `795.2120`

## Systematic patterns

1. Stability is still low under the full profile (`20%` pass rate, not close to deterministic behavior).
2. Metric identity still drifts across failures (`crit_valid_last`, `crit_train_last`, `rmse`) rather than a single persistent weak metric.
3. Failure severity spans orders of magnitude (`1.25x` to `795.21x` over threshold), indicating residual nondeterminism is not just small boundary jitter.

## Root-cause hypotheses

### Hypothesis 1: Remaining nondeterminism is inside runtime/training workflow not yet controlled by current profile

Layer: L2
Evidence for: mixed failing metrics and extreme ratio spread under fixed seed and deterministic toggles.
Evidence against: `2/10` passes show the profile can occasionally satisfy thresholds.
Test: isolate additional sources (e.g., dataloader ordering assertions, deterministic fixtures, or strict single-thread execution deeper in training stack).
Plausibility: high

### Hypothesis 2: Current one-shot assertion contract for `km_ln` is too variance-sensitive for this case

Layer: L4
Evidence for: fixed-seed reruns under strong controls still fail in `8/10` runs; failure metric changes run-to-run.
Evidence against: occasional passes suggest the contract is not impossible, only unstable.
Test: evaluate harness redesign options (e.g., fixed cached dataset fixture or multi-run aggregate assertion contract) while preserving regression sensitivity.
Plausibility: high

## Validity assessment

- Construct: still valid for asking "is single-run regression stable?", but unstable outcomes limit interpretability as a pure seed problem.
- Statistical: `10` reruns are enough for a go/no-go signal (not enough for precise probability estimation).
- External: result is specific to `ker_lti[km_ln]`; do not generalize automatically to other kernel/koopman files.
- Ground truth: baselines/thresholds unchanged; this diagnosis does not question baseline provenance.

## Recommended actions

- Quick wins:
  - keep `ker_lti` carved out of seed-only stream until redesign/extra controls are validated.
- Experiments needed:
  - design a harness-redesign proposal for `test_slow_ker_lti_cli.py` that preserves contract rigor while reducing run-order sensitivity.
- Validity concerns:
  - avoid interpreting occasional passes as stabilization; current profile remains unstable.
- Avoid:
  - do not resume broad seed sweeps for `ker_lti` under the current one-shot harness.

## Go/No-go recommendation on harness redesign

**Go** for a dedicated harness-redesign design task. Deterministic runtime profile validation after worker-control wiring still yields `2/10` passes, so redesign planning is now justified before more seed-only effort on this case.
