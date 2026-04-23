# Reusable Denoising Core Plan

Date: 2026-04-23

## Knowledge output

This feature answers a bounded DyMAD architecture question: can the current denoising behavior be extracted from the training-only data phase into a reusable, model-independent low-level module with a generic interface that is suitable for preprocessing, transforms, and future denoising algorithms?

## Current findings

- The current implementation lives inside `ContextDataPhase` in `modules/dymad_dev/src/dymad/training/phases.py`.
- The only supported denoising method today is `method: savgol`; unsupported methods currently fail with `Unsupported data smoothing method ... Expected 'savgol'.`
- `ContextDataPhase` currently owns both the numerical operation (`savgol_filter(...)` application over regular state or graph node-state tensors) and the training-specific orchestration concerns: split selection, dataset rewriting, metadata history, loader rebuilding, and smoothing metrics.
- Existing tests in `modules/dymad_dev/tests/test_contract_training_phase_runtime.py` already pin the current behavior for split handling, Savitzky-Golay output equivalence, graph node-state support, config validation, metric logging, and `data_phase_history`.
- The chosen home for the reusable core is `modules/dymad_dev/src/dymad/numerics/denoise.py`, which is consistent with DyMAD's guidance that reusable numerical primitives belong in `src/dymad/numerics/*` while orchestration-specific training behavior stays in `src/dymad/training/*`.

## Requested v1 outcome

- Extract the current Savitzky-Golay denoising behavior into a reusable low-level core with no trained-model dependency.
- Keep the interface generic enough that additional denoising algorithms can be added later without repeating the extraction.
- Refactor the current training data phase so it delegates numerical denoising work to the reusable core while preserving current training-phase semantics.
- Prove the new interface is reusable outside the training phase through at least one non-training verification seam.

## Scope

In scope:
- defining the extension boundary inside `src/dymad/numerics/denoise.py`
- generic denoising interface design for model-independent algorithms
- extraction of the current Savitzky-Golay implementation
- training data-phase refactor to call the new core
- direct tests for the reusable core plus at least one non-training reuse-oriented integration seam

Out of scope:
- implementing multiple new denoising algorithms in this slice
- adding trained-model-dependent denoisers
- broad user-mode agent/compiler/schema exposure unless the public request surface changes
- redesigning unrelated transform or training-phase infrastructure

## Proposed feature structure

1. Define the extension boundary inside the chosen low-level home.
   Use `src/dymad/numerics/denoise.py` as the fixed home for the reusable core and define the stable algorithm interface future denoisers should implement there.

2. Extract the current algorithm implementation.
   Move the Savitzky-Golay numerical logic out of `ContextDataPhase` into the reusable core, keeping the interface model-independent and usable without trainer state.

3. Preserve the training-phase contract through delegation.
   Keep `ContextDataPhase` responsible only for split selection, metadata/history updates, metric computation, and loader rebuilding while delegating numerical denoising to the extracted core.

4. Verify reuse beyond training.
   Add direct tests for the extracted denoising core and at least one non-training integration seam or adapter-shaped call path that proves the new boundary is reusable without a trained model.

5. Update placement guidance if the new file establishes a more explicit extension point.
   If `src/dymad/numerics/denoise.py` becomes the recommended home for future denoising algorithms, reflect that in the DyMAD docs.

## Verification targets

- The current `savgol` training behavior remains mechanically equivalent after extraction.
- Training-phase tests for smoothing continue to pass with the phase delegating to the reusable core.
- The reusable denoising API can be called directly without constructing a trainer or loading a model.
- At least one non-training call site or integration seam is covered by tests.
- The extracted interface leaves a clear extension path for future denoising algorithms.

## Open design questions

- Should the reusable entrypoint operate on raw NumPy arrays, Torch tensors, typed series payloads, or a thin abstraction over them?
- Should algorithm dispatch be a string-keyed registry, a small strategy protocol, or a typed config object?
- Should preprocessing/transform reuse in v1 be demonstrated by a real production call site or by a narrow adapter test that proves the seam is sufficient?
