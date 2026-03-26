# Data Pipeline — Tasks

- [x] Define the PyTorch transform interface and pipeline contract [requires-opus] [skill: multi]
  Why: The project needs one stable abstraction for fit/transform/inverse-transform semantics over list-of-array datasets before individual transforms can be implemented without drift.
  Done when: `modules/data_pipeline/` documents the base transform and pipeline API, including dataset shape assumptions, fitted-state lifecycle, inverse-transform contract for lossy stages, and how `nn.Module` integration works.
  Priority: high

- [x] Implement composable `nn.Module` pipeline execution [skill: execute]
  Why: The central capability is arbitrary ordered composition of learned transforms that can be trained once and applied repeatedly to new datasets.
  Done when: `modules/data_pipeline/` contains a pipeline module that fits transforms in sequence on a training dataset and applies `transform` and `inverse_transform` in forward and reverse order on new datasets.
  Priority: high

- [x] Implement initial transform set: min-max normalization, truncated SVD, and polynomial lifting [skill: execute]
  Why: These three transforms define the first concrete use case and exercise both lossless and lossy inverse-transform behavior.
  Done when: `modules/data_pipeline/` exposes working implementations for 0-1 normalization, truncated SVD, and polynomial lifting that can participate in the pipeline contract.
  Priority: high

- [x] Add state reuse and serialization coverage [skill: execute]
  Why: A fitted pipeline is only useful if the learned transform can be saved, reloaded, and applied consistently to another dataset without refitting.
  Done when: Tests verify that a fitted pipeline can be serialized via PyTorch module state, reconstructed, and used to transform and inverse-transform a second dataset with the same feature dimension.
  Priority: medium

- [x] Port and extend the legacy behavior checks into automated tests [skill: execute]
  Why: The attached legacy implementation provides concrete expected behavior for composition, inverse-transform ordering, and fitted-transform reuse that should be preserved where applicable.
  Done when: The test suite in `modules/data_pipeline/` or the repo-level Python tests covers the reference compose scenarios and adds PyTorch-specific checks for module composition and state reuse.
  Priority: medium
  Evidence: Added `modules/data_pipeline/tests/test_legacy_behavior.py` with legacy-style compose assertions for full composition, partial-range forward/inverse (`start:end`) behavior, and state-dict reload parity.
  Verification: `cd modules/data_pipeline && pytest -q` -> `14 passed in 0.83s`
