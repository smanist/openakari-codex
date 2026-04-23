# DyMAD Development

Status: active
Mission: Add bounded, verifiable feature slices to `modules/dymad_dev` while recording the design, implementation, and verification findings needed for each slice.
Done when: each requested DyMAD feature slice tracked in this project is either implemented in `modules/dymad_dev` with verification artifacts or explicitly deferred with documented findings and open questions.

## Context

This project is the durable memory layer for future feature additions to the existing DyMAD module under `modules/dymad_dev`.

The execution module already exists and is registered in `modules/registry.yaml`, so this scaffold does not create a new module or change module ownership. Future work should land feature-specific tasks, plans, and logs here while code changes continue in `modules/dymad_dev`.

`modules/dymad_dev/AGENTS.md` identifies the fastest orientation path for new feature work: read the DyMAD architecture and feature-placement docs before broad repo exploration, then keep new behavior in the correct layer (`agent/*` for boundary surfaces, implementation packages for runtime/model logic, tests matched to the changed layer).

The first concrete feature slice is now defined: extract the current denoising functionality from the training-only data phase into a reusable, model-independent numerical core at `modules/dymad_dev/src/dymad/numerics/denoise.py` that can later serve preprocessing, transform, and future denoising workflows. The current baseline is narrow: `ContextDataPhase` in `modules/dymad_dev/src/dymad/training/phases.py` only supports `operation: smooth` with `method: savgol`, and the implementation currently owns both the algorithm execution and the training-phase-specific metadata/metrics orchestration.

## Log

### 2026-04-23 — Fixed denoising-core placement in `src/dymad/numerics/denoise.py`

Recorded the user's placement decision for this feature slice: the reusable denoising core should live at `modules/dymad_dev/src/dymad/numerics/denoise.py`. Updated the feature plan and task acceptance criteria to treat that path as fixed, so the remaining design work is about the interface and reuse boundary rather than package placement.

Sources: `projects/dymad_dev/TASKS.md`, `projects/dymad_dev/plans/2026-04-23-reusable-denoising-core.md`

### 2026-04-23 — Added feature workstream for reusable denoising core

Added the first concrete feature block for `dymad_dev`: refactor the current denoising/smoothing behavior out of the special training data phase and into a reusable low-level module with a generic, model-independent interface. Recorded the current implementation boundary before decomposing tasks: the only supported method today is Savitzky-Golay smoothing inside `ContextDataPhase`, while the DyMAD feature-placement guidance says reusable numerical primitives belong in `src/dymad/numerics/*` rather than in `agent/*` or a training-specific orchestration layer.

Also added a feature plan to pin the intended acceptance boundary for v1: extract the current Savitzky-Golay algorithm behind a generic denoising interface first, keep future additional denoising algorithms out of scope for this slice, and require at least one non-training reuse-oriented verification seam.

Sources: `modules/dymad_dev/src/dymad/training/phases.py`, `modules/dymad_dev/tests/test_contract_training_phase_runtime.py`, `modules/dymad_dev/docs/feature-placement.md`, `projects/dymad_dev/plans/2026-04-23-reusable-denoising-core.md`

### 2026-04-23 — Re-scaffolded generic DyMAD feature-development project

Project initiated via `/project scaffold` at user request. Re-created `projects/dymad_dev/` as a generic feature-development project after the previous slice-specific project files were removed from the current worktree.

Recorded one baseline execution fact in the scaffold itself: `modules/dymad_dev` is already the registered execution module for this project, so future DyMAD work should extend this project with feature-specific tasks and plans rather than create a separate module.

Sources: `modules/registry.yaml`, `modules/dymad_dev/AGENTS.md`, `projects/akari/README.md`

## Open questions

- Should the first non-training reuse target be a preprocessing helper, a transform wrapper, or both?
- Which generic interface shape is the better long-term extension point for future algorithms: a functional API keyed by method name, typed config objects, or a small strategy-style class boundary?
- Should `src/dymad/numerics/denoise.py` operate primarily on raw arrays/tensors, or should it expose a thin adapter layer for typed series objects too?
