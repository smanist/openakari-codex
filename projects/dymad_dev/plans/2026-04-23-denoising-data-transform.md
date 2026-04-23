# Denoising Data Transform Plan

Date: 2026-04-23

## Knowledge output

This feature answers a bounded DyMAD transform-layer question: after the reusable denoising core exists, can DyMAD expose it as a config-driven data transform whose forward path denoises, inverse path is identity, and published transform metadata explicitly disables gradients and declares non-invertibility?

## Dependency

- This feature starts only after `Complete feature reusable denoising core` is satisfied in `projects/dymad_dev/TASKS.md`.

## Current findings

- DyMAD transform modules inherit from `TransformModule`, which publishes `invertibility` and `supports_gradients` metadata.
- `TransformModule` currently supports explicit non-invertible and non-differentiable declarations through `invertibility="none"` and `supports_gradients="false"`.
- Config-driven transform construction flows through `modules/dymad_dev/src/dymad/core/transform_builder.py`, which normalizes stage configs and constructs transform classes used by the data-transform pipeline.
- The user-requested denoising transform does not follow the usual “inverse reconstructs the original input” expectation; instead, inverse should return the input unchanged.
- Because the transform should wrap the extracted denoising numerical core, the transform layer should adapt `src/dymad/numerics/denoise.py` rather than reimplementing denoising logic.

## Requested v1 outcome

- Add a config-driven denoising transform class in the transform layer.
- Make its forward path delegate to the reusable denoising core.
- Make its inverse path the identity map.
- Publish transform metadata that explicitly marks the transform as non-invertible and non-differentiable.
- Verify that the transform can be constructed through the existing transform-builder/config path.

## Scope

In scope:
- transform-class design for denoising over the extracted numerical core
- transform-builder/config registration
- explicit metadata contract for non-invertibility and disabled gradients
- direct transform tests and builder integration tests
- documentation updates if the transform establishes a recommended extension point

Out of scope:
- adding new denoising algorithms beyond those already supported by the numerical core
- reimplementing denoising logic inside the transform layer
- changing agent/compiler user-mode APIs unless transform config exposure requires it
- changing the requested identity-inverse semantics for this slice

## Proposed feature structure

1. Fix the transform contract.
   Record the config shape, chosen transform type key, expected forward/inverse semantics, and the required metadata values `invertibility="none"` and `supports_gradients="false"`.

2. Implement the transform adapter.
   Add a transform-layer class that delegates forward denoising work to `src/dymad/numerics/denoise.py` while keeping inverse as identity.

3. Register the transform in the builder path.
   Extend `build_transform_module(...)` so config-driven data transforms can construct the new denoising transform in the same way they construct scaler/delay/SVD transforms.

4. Verify the unusual semantics directly.
   Add tests for forward behavior, identity inverse, config construction, and metadata/gradient-support reporting.

5. Update docs if needed.
   Clarify that denoising algorithms belong in `numerics/denoise.py` while denoising transform adapters belong in the transform layer.

## Verification targets

- The transform builder can construct the new denoising transform from config.
- Forward calls use the extracted numerical denoising core rather than reimplementing denoising logic.
- Inverse returns the provided transformed value unchanged.
- The transform metadata reports `invertibility="none"` and `supports_gradients="false"`.
- Tests cover the transform directly and through at least one builder/config integration seam.

## Open design questions

- Should the transform fit step be a no-op, or should it validate/normalize denoising config against the numerical core?
- Should the transform config pass through algorithm-specific arguments directly, or wrap them in a nested denoising-method config dictionary?
- Should non-differentiable behavior be enforced only through metadata, or also through jacobian/VJP methods or explicit runtime guards if those paths are called?
