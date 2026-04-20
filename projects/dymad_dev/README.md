# DyMAD Development

Status: active
Mission: Extend DyMAD's config-driven observation-noise sampler with additional noise kinds and record the design and verification findings needed for the next DyMAD feature slice.
Done when: the active `dymad-dev` noise sampler supports at least two new `noise.kind` variants beyond `gaussian` and `uniform`, those variants use the existing `{kind, params}` config contract, regression tests cover reproducibility and observation-only application, and this project records the baseline and remaining follow-up questions.

## Context

This project re-scaffolds `projects/dymad_dev/` for a new feature-development slice after the prior `projects/dymad_dev/` tree was removed from the current worktree.

The user-requested first feature is not to invent a noise config surface from scratch. The current `modules/dymad_dev/` checkout already exposes `noise: {kind, params}` support in `src/dymad/utils/sampling.py`, with `NOISE_MAP` currently containing `gaussian` and `uniform`.

The current feature goal is to add more noise-type variations while preserving the same config shape used by the existing sampler maps. Existing tests in `modules/dymad_dev/tests/test_workflow_sample.py` already check reproducibility, save-path behavior, and the guarantee that observation noise does not contaminate latent states.

## Log

### 2026-04-20 — Confirmed local DyMAD baseline is current

Updated the project baseline after the user confirmed the `dymad_dev` repo is up to date. Verified that the local `modules/dymad_dev/` checkout now contains the same observation-noise implementation and test surface the project was planning against, so the baseline-confirmation step is resolved and the remaining work can focus directly on adding new `noise.kind` variants.

Verification:
- `rg -n "NOISE_MAP|gaussian_noise|uniform_noise|_apply_observation_noise|test_observation_noise" modules/dymad_dev/src/dymad/utils/sampling.py modules/dymad_dev/tests/test_workflow_sample.py`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:407:def gaussian_noise(`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:426:def uniform_noise(`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:443:NOISE_MAP = {`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:622:    def _apply_observation_noise(self, y_grid: Array, traj_idx: int) -> Array:`
  - `modules/dymad_dev/tests/test_workflow_sample.py:141:def test_observation_noise_sampler_is_reproducible_and_leaves_latent_state_clean(noise_cfg):`

Sources: `modules/dymad_dev/src/dymad/utils/sampling.py`, `modules/dymad_dev/tests/test_workflow_sample.py`

### 2026-04-20 — Re-scaffolded project for noise sampler extensions

Project initiated via `/project scaffold` at user request. Recorded the DyMAD noise-sampler baseline: `NOISE_MAP` exposes `gaussian` and `uniform`, `TrajectorySampler._apply_observation_noise(...)` applies noise to observations only, and tests already verify reproducibility plus saved noisy observations.

Sources: `modules/registry.yaml`

## Open questions

- Which additional additive noise kinds should be the v1 slice after `gaussian` and `uniform`?
- Which new kinds best preserve the current elementwise `{kind, params}` contract while adding meaningful coverage beyond Gaussian and uniform noise?
