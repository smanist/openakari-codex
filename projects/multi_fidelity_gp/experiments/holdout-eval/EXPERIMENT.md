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
- Uncertainty (probabilistic models only): Gaussian NLL, empirical 95% interval coverage, mean 95% interval width

## How to run

- `python projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py`

## Findings

Results from `results.md` (12 HF train points, 80 HF test points):

- Accuracy (RMSE): low-fidelity `0.486761`, high-fidelity GP `0.030922`, residual correction `0.050056`
- Calibration (95% coverage): low-fidelity `0.000000` (deterministic), high-fidelity GP `0.025000`, residual correction `0.037500`
- Preference rule (RMSE + coverage vs high-fidelity GP): residual correction preferred = **no**

Artifacts:
- `projects/multi_fidelity_gp/experiments/holdout-eval/results.md`
- `projects/multi_fidelity_gp/experiments/holdout-eval/results.json`
