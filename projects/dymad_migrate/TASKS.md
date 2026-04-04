# DyMAD Migration — Tasks

Historical completed-task provenance through 2026-03-31 lives in:

- `projects/dymad_migrate/README.md`
- `projects/dymad_migrate/plans/`
- `projects/dymad_migrate/analysis/`
- git history

This queue lists remaining work only.

## Surface cleanup

- [ ] Thin `dymad.core` and `dymad.models` re-export surfaces [requires-frontier] [skill: execute]
  Why: The target architecture explicitly calls for thin `__init__.py` files, but the migration package still encourages broad package-level imports that blur layer boundaries.
  Done when: internal imports under `modules/dymad_migrate/src/dymad/` no longer rely on broad `dymad.core` or `dymad.models` re-export barrels except at explicit public-compatibility seams, `src/dymad/core/__init__.py` and `src/dymad/models/__init__.py` export only the intended stable surface, and focused import-path regression tests cover the remaining public API.
  Priority: medium

## Model-spec seam

- [x] Extend `ModelSpec` with typed rollout and memory metadata for one predefined family [requires-frontier] [skill: execute]
  Why: The current typed spec layer is still only a family-string wrapper; the next useful step is to encode at least one real rollout/memory contract in typed form.
  Done when: `modules/dymad_migrate/src/dymad/models/model_spec.py` defines typed rollout/memory sub-specs used by at least one predefined family in `modules/dymad_migrate/src/dymad/models/collections.py`, and focused tests assert those typed fields directly.
  Priority: high

- [x] Route one predefined family through typed builder dispatch instead of `to_legacy_tuple()` fallback [requires-frontier] [skill: execute]
  Why: `ModelSpec` will remain a veneer until one real builder path consumes typed fields without collapsing immediately back to the legacy tuple contract.
  Done when: one predefined family used by an existing workflow gate is built through a typed dispatch path in `modules/dymad_migrate/src/dymad/models/helpers.py`, with the fallback tuple conversion retained only for unmigrated families.
  Priority: high

- [ ] Introduce an explicit rollout-engine seam for the first typed model-spec family [requires-frontier] [skill: execute]
  Why: The target architecture separates model structure from rollout policy; the current prediction path still mixes those concerns even when a typed spec exists.
  Done when: `modules/dymad_migrate/src/dymad/models/` contains a small rollout-engine seam for the first migrated family, and one continuous or discrete prediction path selects that seam from typed spec metadata rather than implicit legacy string logic.
  Priority: high

- [x] Verify the first typed model-spec family against an existing workflow gate and update the scoreboard [fleet-eligible] [skill: analyze] [zero-resource]
  Why: Once one family stops depending on the tuple fallback, the project needs explicit proof that the seam moved from `prototype` toward `adopted`.
  Done when: a dated analysis note records the exact command(s) and outputs for the selected typed model-spec workflow gate, and `projects/dymad_migrate/architecture/migration-scoreboard.md` is updated to reflect the new seam status with correct provenance.
  Priority: high

## Training seam

- [ ] Extract an explicit `PhasePipeline` object from `StackedOpt` while keeping config compatibility [requires-frontier] [skill: execute]
  Why: The project already has `TrainerState` and `PhaseContext`, but phase sequencing still lives inside legacy `StackedOpt`; extracting a real pipeline object is the smallest architectural next step.
  Done when: `modules/dymad_migrate/src/dymad/training/` contains a first-class `PhasePipeline` abstraction, `StackedOpt` becomes a compatibility wrapper around it, and existing phase config shapes still run.
  Priority: high

- [ ] Replace ad-hoc phase records with typed phase result objects tied to `TrainerState` and `PhaseContext` [requires-frontier] [skill: execute]
  Why: `PhaseResult` currently still stores a recomposed legacy `RunState`, which keeps the new training seam from becoming the primary state carrier.
  Done when: phase results record typed trainer-state and phase-context outputs directly, with legacy `RunState` materialization kept only behind explicit compatibility adapters.
  Priority: high

- [ ] Introduce `ExecutionServices` and remove logger/path setup from trainer-state shims [requires-frontier] [skill: execute]
  Why: The training design calls for non-checkpointable services to live outside run state, but device/logging/path policy still leaks through `StackedOpt` and `OptBase`.
  Done when: `modules/dymad_migrate/src/dymad/training/` has an `ExecutionServices` seam owning logger/path/device policy, and `TrainerState` / `PhaseContext` no longer need to carry those concerns implicitly.
  Priority: medium

- [ ] Introduce a minimal `TrainerRun` wrapper for one single-split training path [requires-frontier] [skill: execute]
  Why: The target hierarchy includes `TrainerRun`, but the current driver layer still jumps directly from driver code into trainer classes and checkpoint paths.
  Done when: one single-split path in `modules/dymad_migrate/src/dymad/training/driver.py` or `trainer.py` constructs a `TrainerRun` object that owns run identity, artifact paths, and one `PhasePipeline`.
  Priority: high

- [ ] Route the linear-training workflow through `TrainerRun` plus `PhasePipeline` [requires-frontier] [skill: execute]
  Why: The linear path is already the most migrated trainer family, so it is the safest place to make the new run/pipeline seam real.
  Done when: the linear training path uses `TrainerRun` plus `PhasePipeline` as its primary orchestration surface and the existing focused linear workflow tests still pass.
  Priority: high

- [ ] Route one non-linear training workflow through the new training seam [requires-frontier] [skill: execute]
  Why: The training seam is not credible until at least one `NODE` or weak-form workflow uses it in addition to the linear path.
  Done when: one non-linear workflow exercised by `modules/dymad_migrate/tests/test_workflow_lti.py` or `modules/dymad_migrate/tests/test_workflow_kp.py` runs through the new training seam with compatibility adapters explicitly marked temporary.
  Priority: high

- [ ] Reduce `RunState` to a compatibility shim and document the remaining adapter boundary [requires-frontier] [skill: execute]
  Why: `RunState` is still the legacy center of gravity; once the first run/pipeline path exists, the remaining shim surface should be made explicit and smaller.
  Done when: `modules/dymad_migrate/src/dymad/training/helper.py` clearly scopes `RunState` as a compatibility-only container, unnecessary live-state fields are no longer primary carriers on migrated paths, and the remaining adapter fields are documented in code comments or a project analysis note.
  Priority: medium

- [ ] Record the first training-seam prototype verification and update the scoreboard [fleet-eligible] [skill: analyze] [zero-resource]
  Why: The scoreboard still marks training as `design-only`; the first prototype needs explicit verification and status movement.
  Done when: a dated analysis note records the exact workflow/test commands and outputs for the migrated training seam, and `projects/dymad_migrate/architecture/migration-scoreboard.md` updates `training` from `design-only` to the correct next status.
  Priority: high

## Spectral-analysis seam

- [ ] Introduce a typed `SpectralSnapshot` record extracted from checkpoint-backed models [requires-frontier] [skill: execute]
  Why: The spectral design calls for snapshot preparation to be distinct from the numerical kernels, but `SAInterface` still computes `_P0/_P1` and weights inside the legacy class.
  Done when: `modules/dymad_migrate/src/dymad/sako/` contains a typed snapshot record that captures the first migrated spectral inputs (`P0`, `P1`, Koopman weights, dimensions, and related metadata) for checkpoint-backed analysis.
  Priority: high

- [ ] Extend the `store` and `facade` skeleton with typed spectral snapshot handles [requires-frontier] [skill: execute]
  Why: The current boundary skeleton only knows checkpoints and prediction requests; spectral analysis needs at least one typed handle flow if it is going to follow the same layering pattern.
  Done when: `modules/dymad_migrate/src/dymad/store/` and `modules/dymad_migrate/src/dymad/facade/` can register and resolve one spectral snapshot handle type, with focused boundary tests covering creation and lookup.
  Priority: medium

- [ ] Implement a `SpectralAnalysisAdapter` over `SAKO` and `RALowRank` using typed snapshots [requires-frontier] [skill: execute]
  Why: The numerical kernels are already separable; the missing piece is an adapter that turns typed spectral inputs into the current analysis operations.
  Done when: `modules/dymad_migrate/src/dymad/sako/` contains an adapter object that consumes the typed spectral snapshot and delegates pseudospectrum, measure, and Jacobian-related calls to `SAKO` / `RALowRank` or small helper seams.
  Priority: high

- [ ] Route the legacy `SpectralAnalysis` compatibility class through the new adapter for one SA workflow [requires-frontier] [skill: execute]
  Why: The public spectral surface remains the workflow contract today, so the adapter boundary has to become real through that compatibility class before the seam counts as adopted.
  Done when: the legacy `SpectralAnalysis(...)` construction path delegates through the new adapter for at least one `tests/test_workflow_sa_lti.py` path while preserving current caller shape.
  Priority: high

- [ ] Split plotting helpers out of `sako/base.py` into an optional plotting adapter [requires-frontier] [skill: execute]
  Why: Plotting is one of the remaining reasons `sako/base.py` still mixes workflow, numerical, and presentation concerns.
  Done when: plotting helpers currently defined in `modules/dymad_migrate/src/dymad/sako/base.py` move behind a separate optional plotting adapter module, and the analysis adapter no longer owns plotting code directly.
  Priority: medium

- [ ] Record the `--reruns=0` spectral parity gate and update the scoreboard [fleet-eligible] [skill: analyze] [zero-resource]
  Why: The design note already chose `test_workflow_sa_lti.py --reruns=0` as the right gate; once the adapter lands, the project needs explicit evidence and a visible status change.
  Done when: a dated analysis note records the exact spectral parity command(s) and outputs, including warning behavior if present, and `projects/dymad_migrate/architecture/migration-scoreboard.md` updates `spectral-analysis` from `design-only` to the correct next status.
  Priority: high
