# Holdout evaluation (synthetic benchmark)

- Train points: 12, test points: 80

| Model | RMSE | MAE | NLL | 95% coverage | 95% width |
|---|---:|---:|---:|---:|---:|
| Low-fidelity only | 0.486761 | 0.397680 | 118468015068.343338 | 0.000000 | 0.000000 |
| High-fidelity GP | 0.030922 | 0.025726 | 772.197767 | 0.025000 | 0.003327 |
| Residual GP correction | 0.050056 | 0.041854 | 2049.252248 | 0.037500 | 0.003192 |

## GP hyperparameters

- High-fidelity GP: {'length_scale': 2.7636363636363637, 'signal_variance': 0.8194735998613177, 'noise_variance': 1e-06}
- Residual GP: {'length_scale': 2.7636363636363637, 'signal_variance': 0.23016549872388845, 'noise_variance': 1e-06}

## Preference rule (initial)

Residual GP preferred if it beats the high-fidelity GP on RMSE and has 95% interval coverage closer to 0.95.
- Preferred: no

