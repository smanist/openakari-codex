# DyMAD Spectral-Analysis Adapter Boundary

Date: 2026-03-30
Status: proposed
Depends on:
- `projects/dymad_migrate/knowledge/parity-critical-workflows.md`
- `projects/dymad_migrate/architecture/checkpoint-facade-design.md`
- `projects/dymad_migrate/analysis/2026-03-30-sa-lti-rerun-warning-diagnosis.md`
- `modules/mcp_test/ARCHITECTURE_SUMMARY.md`

## Purpose

Define the migration boundary for spectral analysis so DyMAD keeps its Koopman/SAKO
capabilities without preserving the current coupling between:

- checkpoint/model loading and data preparation
- core spectral numerics
- plotting/reporting helpers

This document answers the task requirement directly:
1. which `sako` pieces stay pure core analysis
2. which pieces become adapter layers
3. how parity is checked against `tests/test_workflow_sa_lti.py`

## Legacy findings to preserve

### Workflow-level parity surface

`modules/dymad_ref/tests/test_workflow_sa_lti.py` currently exercises three linked
behaviors in one path:

1. training (`train_case`, lines `96-101`)
2. checkpoint-backed prediction through `load_model` (`predict_case`, line `106`)
3. spectral analysis via `SpectralAnalysis(...)` + pseudospectrum/measure/jacobians
   (`sa_case`, lines `120-138`)

The adapter boundary must keep this end-to-end behavior reachable.

### Current coupling in `sako/base.py`

`SpectralAnalysis` currently bundles:

- model/checkpoint bootstrap through `SAInterface(DataInterface)`:
  `base.py:77-107`, `base.py:131-146`
- spectral-analysis orchestration methods:
  `estimate_ps`, `resolvent_analysis`, eigen processing (`base.py:254-315`, `337-368`)
- plotting/report presentation methods:
  `plot_eigs`, `plot_pred`, `plot_eigfun_2d`, `plot_eigjac_contour`
  (`base.py:369+`)

This is exactly the entanglement the migration should avoid.

### Existing pure numerical kernels

The mathematical kernels are already separable and should remain in `core`:

- `dymad.sako.sako.SAKO`:
  residual matrix/residual norm/pseudospectrum kernels (`sako.py:21-202`)
- `dymad.sako.rals.RALowRank` + `estimate_pseudospectrum`:
  low-rank resolvent analysis and grid traversal (`rals.py:57-181`)
- helper eigensystem math used from `dymad.numerics` in `base.py`

## Boundary ownership

To match the project contract (`core -> facade -> store -> exec`, MCP above it):

### Core ownership (keep pure)

- spectral numerical primitives (`SAKO`, `RALowRank`, eig filtering/projection math)
- typed spectral result objects (eigenvalues, residuals, gains, optional modes)
- no checkpoint paths, handles, data loaders, plotting, or MCP payloads

### Adapter ownership (new boundary layer)

- model snapshot adaptation:
  convert checkpoint/model runtime state into core spectral inputs
  (`P0`, `P1`, Koopman operator factors, transform encode/decode hooks)
- method-level compatibility for current workflow entrypoints:
  `estimate_ps`, `estimate_measure`, `eval_eigfunc_jac`, `eval_eigmode_jac`
- policy handling for known harness behavior from the SA diagnosis note
  (rerun interaction and warning interpretation)

### Visualization/report ownership (separate adapter)

- plotting functions currently in `SpectralAnalysis` move out of core-facing APIs
- plotting/report adapters consume typed spectral results and remain optional
- no plotting code inside numerical kernels

## Proposed typed adapter contracts

### `SpectralSnapshot` (facade/store-facing record)

Minimum fields:

- `model_handle`
- `checkpoint_handle`
- `time_step`
- `koopman_weights` (full matrix or low-rank factors)
- `encoded_pairs` (`P0`, `P1`) or a lazy source handle
- `input_dim`, `obs_dim`
- `transform_state_handle` (if needed for encode/decode parity)

### `SpectralAnalysisAdapter`

Responsibilities:

1. resolve `SpectralSnapshot` from facade/store handles
2. instantiate core analyzers (`SAKO`, `RALowRank`) from snapshot fields
3. return typed outputs (`SpectralResult`, `PseudospectrumResult`, `MeasureResult`)
4. expose legacy-compatible methods during migration

### `SpectralCompatFacade` (temporary shim)

Compatibility layer that preserves legacy class shape while delegating to adapter:

- `SpectralAnalysis(model_class, checkpoint_path, ...)`
- methods called by current tests/notebooks map to adapter calls

This keeps existing workflow call sites stable while moving ownership.

## Parity strategy for `test_workflow_sa_lti.py`

### Required parity gate

Primary gate command:

```bash
cd modules/dymad_ref && PYTHONPATH=src pytest tests/test_workflow_sa_lti.py -q --reruns=0
```

Rationale:

- this test is the canonical workflow-level SA parity surface
- `--reruns=0` avoids conflating adapter correctness with known rerun fixture
  interaction diagnosed on 2026-03-30

### Acceptance criteria

1. all parameterized SA cases complete without assertion failure
2. prediction tolerance checks in `predict_case` remain unchanged
3. `estimate_ps` (`disc/cont`, `standard/sako`) and
   `estimate_measure`/jacobian methods remain callable
4. runtime warnings from `sako.py:151` are tracked but not auto-promoted to
   blocker unless they correlate with deterministic failures

## Migration sequence

### Phase 1: isolate pure spectral core APIs

- keep `SAKO` and `RALowRank` behavior stable
- define typed result objects and helper functions under core-owned modules

### Phase 2: implement snapshot adapter boundary in `dymad_migrate`

- add adapter that resolves checkpoint/model context via facade/store/exec
- keep legacy construction path available through compatibility shim

### Phase 3: move plotting/report functions to non-core adapters

- remove plotting concerns from core analysis objects
- keep optional plotting adapters for notebooks

### Phase 4: parity validate SA workflow

- run `test_workflow_sa_lti.py` gate with `--reruns=0`
- if parity holds, keep adapter path as default for SA boundary calls

## Open questions

1. Should `encoded_pairs` (`P0`, `P1`) be materialized eagerly in store, or derived
   lazily from a data handle during analysis execution?
2. Should the long-term public API retain class-style `SpectralAnalysis(...)` or move
   to explicit facade operations returning typed result handles?
