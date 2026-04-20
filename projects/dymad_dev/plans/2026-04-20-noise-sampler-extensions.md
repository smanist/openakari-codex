# Noise Sampler Extensions Plan

Date: 2026-04-20

## Knowledge output

This work answers a bounded design question for DyMAD's sampling API: can the existing `noise: {kind, params}` surface be extended with more additive observation-noise distributions without changing the contract or breaking the reproducibility guarantees already established for the current noise sampler?

## Current findings

- The local `modules/dymad_dev/` checkout now implements observation noise in `modules/dymad_dev/src/dymad/utils/sampling.py`.
- That implementation defines `NOISE_MAP` with two current kinds: `gaussian` and `uniform`.
- `TrajectorySampler._apply_observation_noise(...)` applies noise to observations after `g(...)` is evaluated, so the current contract is observation-only corruption rather than latent-state corruption.
- The current tests in `modules/dymad_dev/tests/test_workflow_sample.py` already verify three critical invariants:
  - fixed-seed reproducibility for config-driven noise,
  - saved `.npz` outputs contain noisy observations,
  - latent state trajectories remain unchanged while observations absorb the noise.
- The earlier baseline-sync concern is resolved: the local `modules/dymad_dev/` checkout already contains the `noise` sampler code path, so implementation can proceed directly in this repo.

## Recommended v1 scope

- Preserve the current `noise: {kind, params}` dictionary contract.
- Keep noise additive and observation-only in v1.
- Add at least two new distribution kinds beyond `gaussian` and `uniform`.
- Prefer distributions that fit the current elementwise broadcasting pattern and can be tested with the same reproducibility harness; likely first candidates are `laplace` and one additional heavy-tail or bounded additive distribution.
- Do not change array/callable noise support while extending the dict-based `kind` surface.

## Proposed workstream

1. Add new helper functions in `modules/dymad_dev/src/dymad/utils/sampling.py` and register them in `NOISE_MAP`.
2. Keep parameter passing parallel to the current sampler style: read `params`, broadcast per observation dimension, and inject the dedicated noise RNG.
3. Extend `modules/dymad_dev/tests/test_workflow_sample.py` with one parametrized case per new `noise.kind`.
4. Re-run the current reproducibility and observation-only tests to confirm the extension did not change the existing contract.

## Verification targets

- New `noise.kind` values accept the same `{kind, params}` config shape as the current sampler types.
- Repeated runs with the same seed reproduce identical noisy observations for every supported kind.
- Different seeds change the observation noise while leaving clean latent trajectories unchanged.
- Unsupported `noise.kind` values still fail clearly with the available-kind list.

## Implementation notes

- This change belongs in the runtime implementation layer, not `src/dymad/agent/*`, unless the user-facing contract changes beyond additional supported `kind` values.
- If documentation enumerates supported noise kinds anywhere under `modules/dymad_dev/`, update that list in the same change so the docs do not lag the code.
