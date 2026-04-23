# DyMAD Development

Status: active
Mission: Add bounded, verifiable feature slices to `modules/dymad_dev` while recording the design, implementation, and verification findings needed for each slice.
Done when: each requested DyMAD feature slice tracked in this project is either implemented in `modules/dymad_dev` with verification artifacts or explicitly deferred with documented findings and open questions.

## Context

This project is the durable memory layer for future feature additions to the existing DyMAD module under `modules/dymad_dev`.

The execution module already exists and is registered in `modules/registry.yaml`, so this scaffold does not create a new module or change module ownership. Future work should land feature-specific tasks, plans, and logs here while code changes continue in `modules/dymad_dev`.

`modules/dymad_dev/AGENTS.md` identifies the fastest orientation path for new feature work: read the DyMAD architecture and feature-placement docs before broad repo exploration, then keep new behavior in the correct layer (`agent/*` for boundary surfaces, implementation packages for runtime/model logic, tests matched to the changed layer).

Specific feature requests are intentionally out of scope for this scaffold. They will be added later as bounded workstreams once the desired DyMAD feature slice and acceptance criteria are known.

## Log

### 2026-04-23 — Re-scaffolded generic DyMAD feature-development project

Project initiated via `/project scaffold` at user request. Re-created `projects/dymad_dev/` as a generic feature-development project after the previous slice-specific project files were removed from the current worktree.

Recorded one baseline execution fact in the scaffold itself: `modules/dymad_dev` is already the registered execution module for this project, so future DyMAD work should extend this project with feature-specific tasks and plans rather than create a separate module.

Sources: `modules/registry.yaml`, `modules/dymad_dev/AGENTS.md`, `projects/akari/README.md`

## Open questions

- Which DyMAD feature slice should be implemented first?
- Should the first slice target user-facing agent surfaces, core runtime/model code, or both?
- When a feature changes public behavior, should docs/examples update in the same slice or as a follow-up slice?
