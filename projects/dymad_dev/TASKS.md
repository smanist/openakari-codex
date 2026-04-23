# DyMAD Development — Tasks

- [ ] Record the first requested DyMAD feature slice [skill: orient] [requires-frontier] [blocked-by: external: specific DyMAD feature request from user]
  Why: This scaffold is intentionally generic until a concrete DyMAD feature request exists.
  Done when: `projects/dymad_dev/README.md` or a dated plan records the requested feature, acceptance criteria, scope boundaries, and the affected DyMAD layers.
  Priority: high
  Notes: Start from `modules/dymad_dev/AGENTS.md`, then read the architecture and feature-placement docs it names before decomposing the work.

- [ ] Add a dependency-aware feature block for the selected DyMAD slice [skill: multi] [requires-frontier] [blocked-by: Record the first requested DyMAD feature slice]
  Why: Future implementation work should be decomposed into bounded subtasks with explicit gates once the first feature is known.
  Done when: `projects/dymad_dev/TASKS.md` contains a `## Feature: <name>` section with subtasks, a stable gate task, and blocker-aware downstream tasks for the first concrete DyMAD feature slice.
  Priority: high

- [ ] Create a feature-specific implementation plan when the first slice spans multiple files or phases [skill: multi] [requires-frontier] [blocked-by: Record the first requested DyMAD feature slice]
  Why: Multi-file DyMAD work benefits from an explicit placement and verification plan before code changes begin.
  Done when: a dated plan exists under `projects/dymad_dev/plans/` describing knowledge output, affected layers, verification targets, and scope boundaries for the first feature slice.
  Priority: medium
