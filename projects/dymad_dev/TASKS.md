# DyMAD Development — Tasks

## Feature: reusable denoising core

- [ ] Design the model-independent denoising interface and placement [skill: multi] [requires-frontier]
  Why: The current denoising behavior is implemented as a special-case training data phase, but the requested feature needs a reusable numerical core that can be shared by training, preprocessing, and transform workflows without depending on a trained model.
  Done when: `projects/dymad_dev/plans/2026-04-23-reusable-denoising-core.md` records the chosen package boundary, the generic algorithm interface, the expected inputs/outputs, and the explicit non-goals for the first extraction slice.
  Priority: high
  Evidence: `modules/dymad_dev/src/dymad/training/phases.py`, `modules/dymad_dev/docs/feature-placement.md`

- [ ] Extract the existing Savitzky-Golay denoising logic into a reusable low-level module [skill: execute] [requires-frontier]
  Why: The current implementation couples algorithm selection, tensor rewriting, and training-phase orchestration in one place, which blocks reuse from preprocessing or transform code.
  Done when: the current Savitzky-Golay smoothing implementation no longer lives only inside `ContextDataPhase`, and a model-independent reusable module exists at `modules/dymad_dev/src/dymad/numerics/denoise.py` with a generic algorithm-oriented interface that can host future denoising methods.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-23-reusable-denoising-core.md`

- [ ] Refactor the training data phase to call the reusable denoising core [skill: execute] [requires-frontier]
  Why: Training must keep working after the extraction, but phase orchestration should delegate numerical work instead of owning it directly.
  Done when: the `type: data` smoothing path in `modules/dymad_dev/src/dymad/training/phases.py` delegates algorithm execution to the reusable denoising core while preserving current split handling, metrics, history recording, and loader rebuilding behavior.
  Priority: high
  Evidence: `modules/dymad_dev/src/dymad/training/phases.py`, `modules/dymad_dev/tests/test_contract_training_phase_runtime.py`

- [ ] Add reusable-call-site coverage beyond the training phase [skill: execute] [requires-frontier]
  Why: The point of the refactor is reuse outside training, so verification should prove the extracted API fits at least one non-training path such as preprocessing or transforms.
  Done when: tests cover the extracted denoising API directly and also cover at least one non-training integration seam or adapter-shaped usage that does not require a trained model.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-23-reusable-denoising-core.md`

- [ ] Update placement/docs if the reusable denoising core changes recommended ownership [skill: record] [fleet-eligible]
  Why: If denoising becomes a first-class reusable numerical capability, the architecture and placement docs should say where future algorithms belong.
  Done when: any changed ownership or extension guidance is reflected in the relevant DyMAD docs, including `modules/dymad_dev/docs/feature-placement.md` and related architecture references if needed.
  Priority: medium
  Evidence: `modules/dymad_dev/docs/feature-placement.md`, `modules/dymad_dev/AGENTS.md`

- [ ] Complete feature reusable denoising core [skill: govern] [requires-frontier]
  Why: Dependency gate for downstream work.
  Done when: all reusable denoising core subtasks required for completion are [x], the Savitzky-Golay path is extracted behind a model-independent generic interface, the training data phase reuses that core, and the resulting API is verified as suitable for future non-training denoising algorithms and non-model call sites.
  Priority: high

## Feature: denoising data transform

- [ ] Design the denoising transform contract on top of the reusable core [skill: multi] [requires-frontier] [blocked-by: Complete feature reusable denoising core]
  Why: This transform has intentionally unusual semantics: forward applies denoising, inverse is identity, and both directions must disable gradients, so the contract should be explicit before implementation.
  Done when: `projects/dymad_dev/plans/2026-04-23-denoising-data-transform.md` records the transform type/config shape, confirms it wraps `src/dymad/numerics/denoise.py`, and fixes the metadata contract including `invertibility="none"` and `supports_gradients="false"`.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-23-reusable-denoising-core.md`, `modules/dymad_dev/src/dymad/core/transform_module.py`

- [ ] Implement a denoising data transform class with identity inverse and disabled gradients [skill: execute] [requires-frontier] [blocked-by: Complete feature reusable denoising core]
  Why: The reusable numerical core needs a transform-layer adapter so denoising can participate in the existing data-transform pipeline without being tied to the training phase.
  Done when: a new transform class exists in the DyMAD transform layer, its forward path delegates to the reusable denoising core, its inverse path returns the input unchanged, and its transform metadata reports `invertibility="none"` and `supports_gradients="false"`.
  Priority: high
  Evidence: `modules/dymad_dev/src/dymad/core/transform_module.py`, `modules/dymad_dev/src/dymad/core/torch_transforms.py`

- [ ] Register the denoising transform in the transform builder and config path [skill: execute] [requires-frontier] [blocked-by: Complete feature reusable denoising core]
  Why: The new transform is only useful if `build_transform_module(...)` and the existing config-driven transform pipeline can construct it.
  Done when: the transform builder accepts a stable transform type for denoising, constructs the new transform class from config, and preserves compatibility with the existing data-transform loading path.
  Priority: high
  Evidence: `modules/dymad_dev/src/dymad/core/transform_builder.py`, `modules/dymad_dev/src/dymad/io/trajectory_manager.py`

- [ ] Add transform-level regression coverage for denoising semantics [skill: execute] [requires-frontier] [blocked-by: Complete feature reusable denoising core]
  Why: The transform contract is nonstandard, so tests need to pin the exact forward/inverse and gradient-support behavior.
  Done when: tests verify that the denoising transform's forward path applies denoising through the reusable core, inverse returns the input unchanged, builder/config construction works, and metadata/jacobian-facing behavior reflects disabled gradients and non-invertibility.
  Priority: high
  Evidence: `modules/dymad_dev/tests/test_contract_transform_builder.py`, `modules/dymad_dev/tests/test_contract_torch_transform_modules.py`, `modules/dymad_dev/src/dymad/core/transform_module.py`

- [ ] Update transform placement/docs for the denoising transform [skill: record] [fleet-eligible] [blocked-by: Complete feature reusable denoising core]
  Why: Once the denoising transform exists, future feature work should know that the numerical algorithm lives in `numerics/denoise.py` while the transform adapter lives in the transform layer.
  Done when: the relevant docs describe where denoising algorithms and denoising transform adapters belong, including any needed updates to feature-placement or architecture references.
  Priority: medium
  Evidence: `modules/dymad_dev/docs/feature-placement.md`, `modules/dymad_dev/docs/architecture.md`

- [ ] Complete feature denoising data transform [skill: govern] [requires-frontier] [blocked-by: Complete feature reusable denoising core]
  Why: Dependency gate for downstream work.
  Done when: all `denoising data transform` subtasks required for completion are [x], the transform layer can construct a denoising transform backed by `src/dymad/numerics/denoise.py`, forward performs denoising, inverse is identity, and the published transform metadata disables gradients and declares non-invertibility.
  Priority: high
