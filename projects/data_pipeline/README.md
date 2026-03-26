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

## Open questions

- How should polynomial lifting define and order interaction terms so that serialization and inverse/reconstruction behavior remain stable across versions?
