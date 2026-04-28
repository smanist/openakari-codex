# Lorenz63 Denoising Evaluation Protocol

Status: draft

## Objective

Measure how well denoising algorithms recover clean on-attractor Lorenz63 trajectories after coordinate-scaled i.i.d. Gaussian observation noise is added.

## Data Generation

Generate clean Lorenz63 trajectories using the standard chaotic parameter regime unless a later task records a different choice:

- `sigma = 10`
- `rho = 28`
- `beta = 8/3`

Each realization should use a burn-in interval before recording the benchmark trajectory so that assessed signals are on-attractor. For each coordinate `j`, compute the coordinate scale as the root mean square (RMS) of the clean recorded coordinate:

```text
scale_j = sqrt( mean_t (x_j(t))^2 )
```

For a relative noise level `alpha`, noisy observations are:

```text
y_j(t) = x_j(t) + epsilon_j(t)
epsilon_j(t) ~ Normal(0, (alpha * scale_j)^2)
```

Noise should be independent across time, coordinate, trajectory realization, and noise seed.

## Algorithms

### Savitzky-Golay

Sweep at least:

- window length
- polynomial order

Window length must be odd and shorter than or equal to the signal length. Invalid combinations, such as polynomial order greater than or equal to window length, should be skipped explicitly rather than silently corrected.

### Kernel Smoothing

For a signal with `N` steps, choose `M < N` equidistant anchor steps and fit the full signal using kernels centered at those anchors. Sweep at least:

- number of anchors `M`
- bandwidth `h`
- kernel type

Required kernel types:

- Gaussian kernel
- compact polynomial kernel: `k(x,x') = (1 - (x - x')^2 / h^2)^p` for `|x - x'| <= h`, and `0` otherwise

For the compact polynomial kernel, sweep exponent `p`.

## Metrics

Report at least RMSE against the clean trajectory:

```text
RMSE = sqrt(mean_{t,j} (x_hat_j(t) - x_j(t))^2)
```

Supporting metrics should include at least one scale-normalized metric so results are comparable across noise levels. Recommended first choice:

```text
relative_RMSE = RMSE / sqrt(mean_{t,j} x_j(t)^2)
```

The report may also include per-coordinate RMSE when it helps diagnose whether a method is over-smoothing one coordinate more than others.

## Aggregation

For every noise level, algorithm, and hyperparameter setting, report:

- mean metric across trajectory/noise realizations
- variance of the metric across trajectory/noise realizations
- number of realizations included

For method recommendations, compare:

- best hyperparameter setting per noise level
- one robust setting across all noise levels, if the sweep is dense enough to support that claim

## Runtime Constraint

The first benchmark sweep is CPU-only and should complete within 20 minutes. If the full planned sweep is likely to exceed 2 minutes, submit it through the experiment runner with explicit `--artifacts-dir`, `--project-dir`, `--max-retries`, `--watch-csv`, and `--total` flags.
