# Initial Benchmark Plan

Date: 2026-03-25
Status: partially executed (models + initial holdout evaluation complete)

Execution notes (2026-03-25):
- Implemented models in `projects/multi_fidelity_gp/experiments/residual-gp/`.
- Ran initial holdout evaluation in `projects/multi_fidelity_gp/experiments/holdout-eval/`.

## Research question

Given a fixed low-fidelity approximation `f_LF(x)`, how much does a Gaussian-process residual correction improve holdout high-fidelity prediction accuracy and uncertainty calibration relative to using `f_LF(x)` alone or a GP trained only on the same high-fidelity samples?

## Concrete benchmark choice

- Domain: `x in [-4, 4]`
- Target function:
  - `f(x) = sin(1.7 x) + 0.25 x + 0.55 exp(-0.9 (x - 1.1)^2)`
- Low-fidelity approximation:
  - `f_LF(x) = 0.82 sin(1.45 x + 0.2) + 0.20 x + 0.30 exp(-0.55 (x - 0.6)^2) - 0.12`
- Intended fidelity gap:
  - The low-fidelity model captures the large-scale trend but is biased in amplitude, phase, local-bump strength, and offset. This should create a smooth residual that a GP can learn from sparse high-fidelity data without making the task trivial.

## Proposed models

1. Low-fidelity only:
   - Predict `y_hat(x) = f_LF(x)` with no learned uncertainty.
2. High-fidelity-only GP baseline:
   - Fit a GP directly to `{x_HF,i, y_HF,i}`.
3. Multi-fidelity residual GP:
   - Fit a GP to residuals `r_i = y_HF,i - f_LF(x_HF,i)`.
   - Predict `y_hat(x) = f_LF(x) + mu_r(x)`.
   - Use the GP predictive variance of the residual as the model uncertainty.

## Data plan

- High-fidelity training set:
  - Start with 12 evenly spaced samples over `[-3.8, 3.8]`.
- High-fidelity test set:
  - Use a disjoint set of 80 points over `[-4, 4]` for accuracy and uncertainty evaluation.
- Optional dense reference grid:
  - Use 400 points for visualization and qualitative inspection of the residual shape.

## Evaluation protocol

- Accuracy metrics:
  - RMSE on the holdout high-fidelity set
  - MAE on the holdout high-fidelity set
- Uncertainty metrics:
  - Negative log likelihood on the holdout high-fidelity set for probabilistic models
  - Empirical 95% interval coverage
  - Mean 95% interval width
- Decision rule:
  - Prefer the residual GP if it improves RMSE over both baselines while maintaining coverage closer to the nominal 95% target than the high-fidelity-only GP.

## Expected findings

- Whether a residual GP can leverage a biased but informative low-fidelity model better than ignoring it.
- Whether the corrected model is more data-efficient than a GP trained only on sparse high-fidelity points.
- How much calibration quality degrades or improves as the high-fidelity sample count changes.
