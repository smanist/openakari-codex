---
id: hf-size-sweep
type: analysis
status: completed
date: 2026-03-25
project: multi_fidelity_gp
consumes_resources: false
tags: [evaluation, uncertainty, calibration, sweep]
---

# High-fidelity training size sweep (synthetic benchmark)

Evaluate how performance changes as we vary the number of high-fidelity training points `N_train` while keeping the same high-fidelity test set.

Training subsets are deterministic, selected as approximately-evenly-spaced indices from the default 12-point training grid produced by `experiments/synthetic-benchmark/`.

## How to run

- `python projects/multi_fidelity_gp/experiments/hf-size-sweep/sweep.py`

## Findings

Results from `results.md` for `N_train ∈ {4, 8, 12}` (80 HF test points):

- Accuracy (RMSE):
  - `N_train=4`: high-fidelity GP `0.613405`, residual correction `0.672502` (both worse than low-fidelity `0.486761`)
  - `N_train=8`: high-fidelity GP `0.239185`, residual correction `0.101889` (residual correction better)
  - `N_train=12`: high-fidelity GP `0.002392`, residual correction `0.004678` (high-fidelity GP better)
- Calibration (95% coverage, latent):
  - `N_train=4`: residual correction `0.012500` (severely undercovers; NLL explodes)
  - `N_train=8`: high-fidelity GP `1.000000`, residual correction `1.000000` (coverage saturates)
  - `N_train=12`: high-fidelity GP `1.000000`, residual correction `1.000000` (coverage saturates)

Notes:
- The catastrophic residual correction uncertainty at `N_train=4` suggests LML-grid hyperparameters can produce extreme overconfidence for the residual GP in the ultra-sparse regime (even when the mean can still improve at `N_train=8`).
- Coverage saturation at `N_train>=8` means 95% interval coverage alone is not a sensitive diagnostic on this small test set; prefer also tracking width and PIT/standardized residual diagnostics.

Artifacts:
- `projects/multi_fidelity_gp/experiments/hf-size-sweep/results.md`
- `projects/multi_fidelity_gp/experiments/hf-size-sweep/results.json`
