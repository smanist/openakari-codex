# Diagnosis: `test_workflow_sa_lti.py::test_sa[4]` rerun and runtime warnings

Date: 2026-03-30
Status: completed
Related task: `Diagnose test_workflow_sa_lti.py::test_sa[4] rerun and runtime warnings`

## Goal

Classify the rerun + warning behavior observed in the SA workflow as one of:
- numerical instability,
- test nondeterminism,
- expected behavior.

Also decide whether follow-up code changes are required before marking spectral parity stable.

## Commands executed

1. Single-case run with default pytest rerun config:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[4]' -vv
```

Exact output: `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns-default.log`

2. Single-case run with reruns disabled:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[4]' -vv --reruns=0
```

Exact output: `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns0.log`

3. Reproducibility sweep (20 independent runs, reruns disabled):

```bash
cd modules/dymad_ref
for i in {1..20}; do
  PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[4]' --reruns=0 -q
  echo "EXIT_CODE=$?"
done
```

Exact output: `projects/dymad_migrate/analysis/2026-03-30-sa-lti-test-sa4-reruns0-repeat.log`

## Findings

1. **Rerun-enabled single-case execution is unstable due to test harness behavior, not model correctness.**
- In the default-rerun run, pytest reran the case twice and ended with:
  - `FAILED tests/test_workflow_sa_lti.py::test_sa[4] - FileNotFoundError`
  - missing file: `modules/dymad_ref/tests/sa.npz`
- Provenance: `2026-03-30-sa-lti-test-sa4-reruns-default.log`.

2. **Without reruns, the same case is consistently passing in this environment.**
- Repro sweep result: `20/20` successful exits (`EXIT_CODE=0` on every run).
- Arithmetic provenance: `20 successes / 20 runs = 100%` from `2026-03-30-sa-lti-test-sa4-reruns0-repeat.log`.

3. **Runtime warnings at `sako.py:151` are intermittent and non-fatal in the isolated case.**
- `RuntimeWarning: invalid value encountered in multiply|subtract|add` appeared in `12/20` runs.
- Arithmetic provenance: warning runs counted in the repeat log (`12`) / total runs (`20`) = `60%`.

4. **Code-level context supports a mixed classification.**
- Warning location: `modules/dymad_ref/src/dymad/sako/sako.py:151` (`_residual_G` matrix expression).
- Data generation is unseeded by default (`TrajectorySampler(..., rng=None)` -> `np.random.default_rng(None)`), so trajectory samples vary run-to-run.
- Global pytest config enables reruns (`--reruns=2`) in `modules/dymad_ref/pyproject.toml`.

## Cause classification

Primary category: **test nondeterminism / harness interaction**.

Supporting category: **numerical instability warnings** in spectral residual evaluation (`sako.py:151`) that do not deterministically fail the test in isolated no-rerun execution.

Why:
- The hard failure observed in this diagnosis run was `FileNotFoundError` during rerun-enabled execution, consistent with fixture/file-lifecycle fragility under rerun behavior for this single-case mode.
- The no-rerun sweep demonstrates stable pass behavior, while still showing intermittent runtime warnings.

## Decision on follow-up changes

- **Before marking spectral parity fully stable:** follow-up changes are still required in the legacy test harness/policy layer (e.g., rerun policy + fixture/data lifecycle handling + warning policy), even though the migration target currently does not need an immediate code fix for this specific diagnosis task.
- Practical migration implication: treat current SA parity as **provisionally acceptable** for ongoing adapter-boundary design, but not as a finalized stability gate.
