# DyMAD Development — Tasks

- [x] Extend `NOISE_MAP` with additional config-driven noise kinds [skill: execute] [requires-frontier]
  Why: The local `modules/dymad_dev` checkout already supports `noise: {kind, params}` for `gaussian` and `uniform`; extending that existing map was the smallest contract-preserving way to add more noise variations.
  Done when: `modules/dymad_dev/src/dymad/utils/sampling.py` supports at least two additional `noise.kind` values beyond `gaussian` and `uniform`, each added through helper functions and `NOISE_MAP` entries that preserve backward compatibility with the current `kind` and `params` contract.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-20-noise-sampler-extensions.md`
  Notes: Keep the change in the runtime implementation layer (`src/dymad/utils/sampling.py`) unless the supported user-facing contract changes beyond new `kind` values.

- [x] Add regression coverage for new noise kinds and reproducibility [skill: execute] [requires-frontier]
  Why: Additional noise distributions are only safe if the shape rules, RNG behavior, and observation-only application remain mechanically checked.
  Done when: tests cover every new `noise.kind`, fixed-seed runs reproduce identical noisy observations, and the existing guarantee that latent state trajectories remain clean still holds.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-20-noise-sampler-extensions.md`
  Notes: Start from `modules/dymad_dev/tests/test_workflow_sample.py`, which already covers the current `gaussian` and `uniform` noise contract.

- [x] Design the single-split Nelder-Mead-like CV interface and selection rules [skill: multi] [requires-frontier]
  Completed: 2026-04-20. Integrated after 1 review round(s).
  Why: The current CV surface only supports exhaustive `param_grid` sweeps, so the optimizer feature needs an explicit contract for parameter encoding, initialization, termination, and result selection before runtime changes are safe.
  Done when: `projects/dymad_dev/plans/2026-04-20-cv-optimizer-nelder-mead.md` records the chosen optimizer-facing config shape, confirms that the workflow remains single-split rather than k-fold, and names the artifact and compatibility requirements the implementation must satisfy.
  Priority: high
  Evidence: `modules/dymad_dev/src/dymad/training/driver.py`, `modules/dymad_dev/src/dymad/training/helper.py`, `modules/dymad_dev/src/dymad/agent/registry/training_schema.py`
  Notes: Preserve existing `cv.param_grid` behavior unless the replacement contract is explicitly documented and migrated.

- [x] Implement a Nelder-Mead-like optimizer path for single-split CV [skill: execute] [requires-frontier]
  Completed: 2026-04-20. Integrated after 2 review round(s).
  Why: DyMAD's current CV runtime materializes a full Cartesian grid via `iter_param_grid(...)`; an optimizer path is needed to search hyperparameters automatically without exhaustive enumeration.
  Done when: the training runtime accepts the new optimizer-based CV configuration, evaluates candidate hyperparameters against the existing single-split validation metric, selects the lowest-metric result, and continues to export the best checkpoint plus CV result artifacts under the run results directory.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-20-cv-optimizer-nelder-mead.md`
  Notes: Keep `SingleSplitDriver` semantics intact for this slice; do not implement k-fold CV as part of this task.

- [ ] Add regression coverage for optimizer-driven CV and backward compatibility [skill: execute] [requires-frontier]
  Why: The optimizer feature changes the CV search strategy and likely the accepted config surface, so tests need to prove both the new path and the existing grid-search path remain correct.
  Done when: tests verify optimizer-driven CV runs on a small deterministic case, preserves the lowest-metric selection rule, writes the expected artifacts, and leaves existing `cv.param_grid` compile/runtime behavior passing.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-20-cv-optimizer-nelder-mead.md`
  Notes: Cover both the training runtime and any agent/compiler or registry schema changes if the user-facing CV contract expands.

- [ ] Update CV-facing docs, examples, and capability metadata if the user-mode contract changes [skill: record] [fleet-eligible]
  Why: The current registry and examples present CV as a single-split param-grid sweep with `param_grid` and `metric`; if the optimizer becomes user-visible, those references must not lag the implementation.
  Done when: the relevant docs/tests/examples describe the supported CV modes accurately, including the explicit statement that the workflow remains single-split rather than k-fold.
  Priority: medium
  Evidence: `modules/dymad_dev/src/dymad/agent/registry/training_schema.py`, `modules/dymad_dev/tests/test_agent_registry.py`, `modules/dymad_dev/tests/test_agent_mcp_user_tools.py`
  Notes: If the optimizer remains runtime-only in v1, document that decision in the project README and leave the public schema unchanged.
