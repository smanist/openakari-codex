# Spectral snapshot seam verification

Date: 2026-04-04
Task: Introduce a typed `SpectralSnapshot` record extracted from checkpoint-backed models

## Summary

Added a typed spectral snapshot record in `dymad.sako` and wired `SAInterface`
to construct it from checkpoint-backed spectral setup state (`P0`, `P1`,
Koopman weights, dimensions, and metadata).

## Findings

- `modules/dymad_migrate/src/dymad/sako/snapshot.py` now defines:
  - `KoopmanWeightSnapshot`
  - `SpectralSnapshot`
  - `build_spectral_snapshot(...)`
- `SAInterface` now materializes `self.snapshot` during `_setup_sa_terms(...)`
  using the extracted checkpoint-backed encoded pair matrices and Koopman
  weight representation.
- The snapshot seam supports both full-matrix and low-rank Koopman weights and
  rejects invalid shape/arity inputs via explicit `ValueError`s.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_spectral_snapshot.py -q
```

Output excerpt:

- `4 passed, 2 warnings in 0.64s`

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_sako_runtime_batch_adapter.py -q
```

Output excerpt:

- `2 passed, 2 warnings in 0.49s`

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest 'tests/test_workflow_sa_lti.py::test_sa[5]' -q
```

Output excerpt:

- `1 passed, 2 warnings in 1.64s`
