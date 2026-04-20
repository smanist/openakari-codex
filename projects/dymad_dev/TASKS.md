# DyMAD Development — Tasks

- [x] Extend `NOISE_MAP` with additional config-driven noise kinds [skill: execute] [requires-frontier]
  Why: The local `modules/dymad_dev` checkout already supports `noise: {kind, params}` for `gaussian` and `uniform`; extending that existing map is the smallest contract-preserving way to add more noise variations.
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
