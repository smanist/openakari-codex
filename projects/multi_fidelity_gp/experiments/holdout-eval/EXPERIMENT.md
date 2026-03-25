---
id: holdout-eval
type: analysis
status: completed
date: 2026-03-25
project: multi_fidelity_gp
consumes_resources: false
tags: [evaluation, uncertainty, calibration]
---

# Holdout accuracy + uncertainty evaluation (synthetic benchmark)

Evaluate the three benchmark models on the disjoint high-fidelity test set:

1. Low-fidelity only: `y(x) = f_LF(x)` (deterministic; `std=0`)
2. High-fidelity-only GP: GP fit directly to `(x_HF, y_HF)`
3. Residual GP correction: GP fit to residuals `r = y_HF - f_LF(x_HF)`

## Metrics

- Accuracy: RMSE, MAE
- Uncertainty (probabilistic models only): Gaussian NLL, and empirical interval coverage + mean interval width at 68% and 95% (reported for both latent and observation predictive distributions)

## How to run

- `python projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py`

## Findings

Results from `results.md` (12 HF train points, 80 HF test points):

- Accuracy (RMSE): low-fidelity `0.486761`, high-fidelity GP `0.002392`, residual correction `0.004678`
- Calibration (68% coverage, latent): high-fidelity GP `1.000000`, residual correction `0.987500`
- Calibration (68% coverage, observation): high-fidelity GP `1.000000`, residual correction `0.987500`
- Calibration (95% coverage, latent): high-fidelity GP `1.000000`, residual correction `1.000000`
- Calibration (95% coverage, observation): high-fidelity GP `1.000000`, residual correction `1.000000`
- Preference rule (RMSE + coverage vs high-fidelity GP): residual correction preferred = **no**

Notes:
- GP hyperparameters are selected via log marginal likelihood grid search (`hyperparam_selection="lml_grid"`).
- Uncertainty metrics report both latent and observation uncertainty (`include_noise=True`), with the preference rule using observation uncertainty.

Artifacts:
- `projects/multi_fidelity_gp/experiments/holdout-eval/results.md`
- `projects/multi_fidelity_gp/experiments/holdout-eval/results.json`
