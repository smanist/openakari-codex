# Data Pipeline

Status: active
Mission: Build a reusable PyTorch-native data transformation pipeline that fits on one dataset, applies the learned transform to other datasets, and reconstructs data through inverse transforms where mathematically possible.
Done when: The project provides a documented `nn.Module` pipeline in `modules/data_pipeline/` that composes arbitrary ordered transforms over list-of-array datasets, supports fit/transform/inverse-transform reuse across datasets, and verifies the reference normalization/SVD/polynomial-lift behaviors with automated tests.

## Context

This project targets dataset preprocessing as a first-class PyTorch module rather than as an external utility layer. The desired input is a dataset represented as a list of arrays with a shared feature dimension and variable numbers of rows, and the desired output is a composable pipeline whose transforms can be fit once and then reused consistently on new datasets.

The initial motivating examples are min-max normalization, truncated SVD, and polynomial lifting, but the ordering and composition should remain arbitrary. The pipeline should also expose inverse transform behavior so downstream models can map transformed outputs back toward the original feature space, with exact recovery for lossless stages and best reconstruction for lossy stages such as truncated SVD.

The user provided a non-`nn.Module` reference implementation and tests in `/Users/daninghuang/Repos/dymad-dev/src/dymad/transform/collection.py` and `/Users/daninghuang/Repos/dymad-dev/tests/test_assert_transform.py`. The execution module for this project already exists at `modules/data_pipeline/`.

## Log

### 2026-03-26 — Project created

Project initiated via `/project scaffold` from a human request for a PyTorch-native transform pipeline over list-of-array datasets with reusable fitted state, arbitrary ordered composition, and inverse-transform support. The initial scaffold treats the existing `modules/data_pipeline/` submodule as the execution module and uses the attached legacy compose/tests as behavioral reference only.

Verification:
- `git diff --check -- projects/data_pipeline projects/akari/README.md` -> no output

Sources:
- User request
- `/Users/daninghuang/Repos/dymad-dev/src/dymad/transform/collection.py`
- `/Users/daninghuang/Repos/dymad-dev/tests/test_assert_transform.py`

### 2026-03-26 — Defined transform contract and pipeline execution

Selected task: "Define the PyTorch transform interface and pipeline contract" (high priority, unblocked). Scope classification: structural (verifiable), `consumes_resources: false` because no external API calls, GPU compute, or long-running jobs were required.

Implemented the module contract in `modules/data_pipeline/`: added `DatasetTransform` (fit/transform/inverse lifecycle), `Invertibility` semantics (`exact`, `approximate`, `none`), dataset-shape validation for list-of-2D-tensor input, and `TransformPipeline` composition that fits forward and inverts in reverse. Added module-level documentation that defines shape assumptions, fitted-state lifecycle, inverse expectations for lossy stages, and `nn.Module` state reuse.

Legacy reference review found two behavioral constraints worth preserving in the new API: forward-order composition with reverse-order inversion, and optional partial-range application. The pipeline now includes `transform_range` and `inverse_transform_range` hooks to keep parity with that pattern while remaining PyTorch-native.

Verification:
- `cd modules/data_pipeline && pytest -q` -> `4 passed in 0.83s`
- `curl -s -o /tmp/task_claim_resp.json -w '%{http_code}' -X POST http://localhost:8420/api/tasks/claim ...` -> `000` (task-claim service unavailable; proceeded without claim per SOP fallback)

Session-type: autonomous
Duration: 25 minutes
Task-selected: Define the PyTorch transform interface and pipeline contract
Task-completed: yes
Approvals-created: 0
Files-changed: 8
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 — Implemented initial transform set and reference behavior tests

Ran `/orient data_pipeline` and selected the highest-priority unblocked task: "Implement initial transform set: min-max normalization, truncated SVD, and polynomial lifting." No approval items were pending in `APPROVAL_QUEUE.md`, and task-claim API was unavailable.

Scope classification: structural (verifiable), `consumes_resources: false` (no LLM/API calls, GPU work, or long-running compute).

Implemented concrete transforms in `modules/data_pipeline/src/data_pipeline/transforms.py`:
- `MinMaxNormalizeTransform` (feature-wise 0-1 normalization with exact inverse)
- `TruncatedSVDTransform` (optionally centered projection with approximate inverse)
- `PolynomialLiftingTransform` (cross-monomial lifting with linear-term inverse)

Decision recorded: polynomial lifting now uses deterministic lexicographic exponent ordering from the Cartesian product of per-feature monomial powers and requires each feature order to be at least 2 so inverse reconstruction can recover original linear coordinates exactly.

Expanded verification coverage in `modules/data_pipeline/tests/test_transforms.py`:
- Min-max output/inverse checked against explicit reference arithmetic from merged fit data.
- Truncated SVD projection/inverse checked against manual `torch.linalg.svd` basis math.
- Polynomial lifting validated against explicit cross-term construction and exact inverse.
- Pipeline integration validated for min-max + polynomial lift + truncated SVD composition.

Verification:
- `cd modules/data_pipeline && pytest -q` -> `9 passed in 0.70s`
- `curl -s -o /tmp/data_pipeline_claim.json -w '%{http_code}' -X POST http://localhost:8420/api/tasks/claim ...` -> `000` (task-claim service unavailable; proceeded per SOP fallback)

Session-type: autonomous
Duration: 31 minutes
Task-selected: Implement initial transform set: min-max normalization, truncated SVD, and polynomial lifting
Task-completed: yes
Approvals-created: 0
Files-changed: 7
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 — Added strict state_dict reuse coverage for fitted pipelines

Ran `/orient data_pipeline` for `SESSION_ID=work-session-mn7idg6v` and selected the highest-leverage unblocked task: "Add state reuse and serialization coverage." Orient checks found no pending approvals, no stale external blockers, task-claim API unavailable, and findings-first gate still enabled from scheduler work-cycle metrics (`0/8 = 0.0%` non-zero findings in the latest scheduler window).

Scope classification: structural (verifiable), `consumes_resources: false` (no LLM/API calls, GPU compute, or long-running jobs).

Implemented strict PyTorch state reuse support in `modules/data_pipeline/`:
- Persisted transform metadata (`input_dim`, `output_dim`, `invertibility`) in registered buffers so fitted contracts survive `state_dict` round-trips.
- Normalized dynamic learned buffers (`offset/scale`, `mean/basis`, polynomial exponent caches) to load cleanly into fresh module instances via `_load_from_state_dict` with shape preparation.
- Added serialization tests that verify a fitted pipeline can be saved, restored, and reused on a second dataset without refitting, with matching transform/inverse outputs and preserved feature-dimension validation.

Verification:
- `curl -s -o /tmp/data_pipeline_claim_mn7idg6v.json -w '%{http_code}' -X POST http://localhost:8420/api/tasks/claim ...` -> `000` (task-claim service unavailable; proceeded per SOP fallback)
- `cd modules/data_pipeline && pytest -q` -> `11 passed in 0.65s`

Session-type: autonomous
Duration: 29 minutes
Task-selected: Add state reuse and serialization coverage
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-03-26 — Ported legacy compose/range behavior checks into automated tests

Ran `/orient data_pipeline` for `SESSION_ID=work-session-mn7iza4n` and selected the remaining unblocked task: "Port and extend the legacy behavior checks into automated tests."

Orient checks:
- No pending items in `APPROVAL_QUEUE.md`.
- Task-claim API was unavailable (`curl .../api/tasks/claim` returned `000`), so execution proceeded per SOP fallback.
- Findings-first gate remained enabled from scheduler work-cycle metrics (`0/10 = 0.0%` non-zero findings in the latest scheduler window).
- No budget file exists for `projects/data_pipeline/`; budget gate is `n/a`.

Scope classification: structural (verifiable), `consumes_resources: false` (no LLM/API calls, external paid APIs, GPU compute, or long-running jobs).

Implemented legacy-parity and PyTorch-specific reuse coverage in `modules/data_pipeline/tests/test_legacy_behavior.py`:
- Ported compose-style reference assertions using the original legacy dataset and evaluation sample.
- Added explicit partial-range checks for `transform_range(start:end)` and `inverse_transform_range(start:end)` to preserve legacy `Compose(..., rng=[start, end])` semantics.
- Added state-dict reload parity for range-based execution to verify serialized `nn.Module` state preserves compose behavior after restore.

Decision recorded: partial-range pipeline execution preserves stage-local semantics from the legacy compose interface - selected stages are applied directly to the provided dataset, and inverse range runs in reverse order over the same selected stage window.

Verification:
- `cd modules/data_pipeline && pytest -q` -> `14 passed in 0.83s`
- `curl -s -o /tmp/data_pipeline_claim_mn7iza4n.json -w '%{http_code}' -X POST http://localhost:8420/api/tasks/claim ...` -> `000` (task-claim service unavailable; proceeded per SOP fallback)

Session-type: autonomous
Duration: 18 minutes
Task-selected: Port and extend the legacy behavior checks into automated tests
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

## Open questions

- None currently.
