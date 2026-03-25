---
id: residual-gp
type: implementation
status: completed
date: 2026-03-25
project: multi_fidelity_gp
consumes_resources: false
tags: [gp, residual, multi-fidelity]
---

# Residual GP correction model

Implement three 1D regression models for the synthetic multi-fidelity benchmark:

1. Low-fidelity only: `y(x) = f_LF(x)`
2. High-fidelity-only GP: GP fit directly to `(x_HF, y_HF)`
3. Residual GP correction: GP fit to residuals `r = y_HF - f_LF(x_HF)`, predicting `y(x) = f_LF(x) + r(x)`

The GP implementation is NumPy-only (RBF kernel + Cholesky) and returns predictive mean and variance. By default, the project models:

- Select GP hyperparameters via a small grid search that maximizes the GP log marginal likelihood (`hyperparam_selection="lml_grid"`).
- Report predictive uncertainty as observation uncertainty (`var = var_latent + noise_variance`) via `include_noise=True`.

## Verification

- `python projects/multi_fidelity_gp/experiments/residual-gp/demo.py`

## Findings

Smoke-test metrics from `demo.py` (default GP hyperparameter heuristics; not tuned):

- Low-fidelity-only RMSE: `0.486761`
- High-fidelity-only GP RMSE: `0.030922`
- Residual correction GP RMSE: `0.050056`
