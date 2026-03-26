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

## Open questions

- None currently.
