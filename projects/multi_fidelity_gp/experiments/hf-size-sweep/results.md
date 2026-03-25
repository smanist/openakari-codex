# High-fidelity training size sweep (synthetic benchmark)

- Test points: 80 (fixed high-fidelity test grid from `synthetic-benchmark/`)
- Training subsets: deterministic approximately-evenly-spaced indices from the default 12-point train grid.

## Accuracy (point metrics)

| N_train | Model | RMSE | MAE |
|---:|---|---:|---:|
| 4 | Low-fidelity only | 0.486761 | 0.397680 |
| 4 | High-fidelity GP | 0.613405 | 0.480189 |
| 4 | Residual GP correction | 0.672502 | 0.528163 |
| 8 | Low-fidelity only | 0.486761 | 0.397680 |
| 8 | High-fidelity GP | 0.239185 | 0.201756 |
| 8 | Residual GP correction | 0.101889 | 0.081145 |
| 12 | Low-fidelity only | 0.486761 | 0.397680 |
| 12 | High-fidelity GP | 0.002392 | 0.001870 |
| 12 | Residual GP correction | 0.004678 | 0.002297 |

## Uncertainty metrics (GP-based models)

Reported for both **latent** and **observation** predictive distributions (see `holdout-eval/`).

### Latent predictive distribution

| N_train | Model | NLL | 68% cov | 68% width | 95% cov | 95% width |
|---:|---|---:|---:|---:|---:|---:|
| 4 | High-fidelity GP | 0.834621 | 0.825000 | 1.577945 | 1.000000 | 3.092716 |
| 4 | Residual GP correction | 774.941679 | 0.012500 | 0.026408 | 0.012500 | 0.051758 |
| 8 | High-fidelity GP | -0.024742 | 0.950000 | 0.657502 | 1.000000 | 1.288681 |
| 8 | Residual GP correction | -0.526246 | 0.987500 | 0.448291 | 1.000000 | 0.878635 |
| 12 | High-fidelity GP | -3.723867 | 1.000000 | 0.019390 | 1.000000 | 0.038005 |
| 12 | Residual GP correction | -4.247855 | 0.987500 | 0.011462 | 1.000000 | 0.022465 |

### Observation predictive distribution

| N_train | Model | NLL | 68% cov | 68% width | 95% cov | 95% width |
|---:|---|---:|---:|---:|---:|---:|
| 4 | High-fidelity GP | 0.954490 | 1.000000 | 1.810523 | 1.000000 | 3.548560 |
| 4 | Residual GP correction | 763.031091 | 0.012500 | 0.026494 | 0.012500 | 0.051927 |
| 8 | High-fidelity GP | 0.170475 | 0.975000 | 0.838953 | 1.000000 | 1.644318 |
| 8 | Residual GP correction | -0.291935 | 1.000000 | 0.572006 | 1.000000 | 1.121112 |
| 12 | High-fidelity GP | -3.394546 | 1.000000 | 0.026837 | 1.000000 | 0.052599 |
| 12 | Residual GP correction | -3.948140 | 0.987500 | 0.015234 | 1.000000 | 0.029858 |

## Preference rule (initial)

Residual GP preferred if it beats the high-fidelity GP on RMSE and has 95% *observation* interval coverage closer to 0.95.
- N_train=4: preferred = no
- N_train=8: preferred = no
- N_train=12: preferred = no

