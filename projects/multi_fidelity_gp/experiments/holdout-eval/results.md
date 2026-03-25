# Holdout evaluation (synthetic benchmark)

- Train points: 12, test points: 80

| Model | RMSE | MAE | NLL | 95% coverage | 95% width |
|---|---:|---:|---:|---:|---:|
| Low-fidelity only | 0.486761 | 0.397680 | 118468015068.343338 | 0.000000 | 0.000000 |
| High-fidelity GP | 0.002392 | 0.001870 | -3.394546 | 1.000000 | 0.052599 |
| Residual GP correction | 0.004678 | 0.002297 | -3.948140 | 1.000000 | 0.029858 |

## GP hyperparameters

- High-fidelity GP: {'length_scale': 1.3818181818181818, 'signal_variance': 2.458420799583953, 'noise_variance': 8.194735998613177e-05}
- Residual GP: {'length_scale': 1.3818181818181818, 'signal_variance': 2.3016549872388845, 'noise_variance': 2.3016549872388844e-05}

## Preference rule (initial)

Residual GP preferred if it beats the high-fidelity GP on RMSE and has 95% interval coverage closer to 0.95.
- Preferred: no

