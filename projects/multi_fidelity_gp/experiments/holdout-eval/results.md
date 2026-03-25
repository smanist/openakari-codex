# Holdout evaluation (synthetic benchmark)

- Train points: 12, test points: 80
- Calibration target: **latent** predictive distribution

## Accuracy (point metrics)

| Model | RMSE | MAE |
|---|---:|---:|
| Low-fidelity only | 0.486761 | 0.397680 |
| High-fidelity GP | 0.002392 | 0.001870 |
| Residual GP correction | 0.004678 | 0.002297 |

## Uncertainty metrics (GP-based models)

Two predictive distributions are reported for each GP model:
- **Latent**: predictive variance from the GP posterior (no observation noise).
- **Observation**: latent variance + fitted noise variance (`include_noise=True`).

### Latent predictive distribution

| Model | NLL | 68% coverage | 68% width | 95% coverage | 95% width |
|---|---:|---:|---:|---:|---:|
| High-fidelity GP | -3.723867 | 1.000000 | 0.019390 | 1.000000 | 0.038005 |
| Residual GP correction | -4.247855 | 0.987500 | 0.011462 | 1.000000 | 0.022465 |

| Model | Std resid mean | Std resid std | |z|≤1 | |z|≤2 | PIT mean | PIT std | PIT KS |
|---|---:|---:|---:|---:|---:|---:|---:|
| High-fidelity GP | -0.001560 | 0.281680 | 1.000000 | 1.000000 | 0.499335 | 0.108497 | 0.285889 |
| Residual GP correction | 0.003581 | 0.392857 | 0.987500 | 1.000000 | 0.501527 | 0.145326 | 0.251824 |

### Observation predictive distribution

| Model | NLL | 68% coverage | 68% width | 95% coverage | 95% width |
|---|---:|---:|---:|---:|---:|
| High-fidelity GP | -3.394546 | 1.000000 | 0.026837 | 1.000000 | 0.052599 |
| Residual GP correction | -3.948140 | 0.987500 | 0.015234 | 1.000000 | 0.029858 |

| Model | Std resid mean | Std resid std | |z|≤1 | |z|≤2 | PIT mean | PIT std | PIT KS |
|---|---:|---:|---:|---:|---:|---:|---:|
| High-fidelity GP | -0.001944 | 0.190926 | 1.000000 | 1.000000 | 0.499212 | 0.074964 | 0.347408 |
| Residual GP correction | 0.002661 | 0.322729 | 0.987500 | 1.000000 | 0.501356 | 0.119677 | 0.283821 |

## GP hyperparameters

- High-fidelity GP: {'length_scale': 1.3818181818181818, 'signal_variance': 2.458420799583953, 'noise_variance': 8.194735998613177e-05}
- Residual GP: {'length_scale': 1.3818181818181818, 'signal_variance': 2.3016549872388845, 'noise_variance': 2.3016549872388844e-05}

## Preference rule

Residual GP preferred if it beats the high-fidelity GP on RMSE and has 95% interval coverage closer to 0.95 under the **latent** predictive distribution.
- Preferred: no

