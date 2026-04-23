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
