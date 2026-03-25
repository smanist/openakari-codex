# PCA vs TTD — baseline comparison (synthetic dataset v1)

Date: 2026-03-25

This note compares the existing PCA and Tensor-Train Decomposition (TTD) baselines on the synthetic 3D “video-like” tensor dataset and proposes the initial hyperparameter sweep scope for the trade-off study.

## Inputs (provenance)

Dataset:
- `projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz` with shape `(T, H, W) = (32, 64, 64)` so `original_floats = 32·64·64 = 131,072`.

Baseline result files:
- PCA (`k=8`): `projects/pca_vs_ttd/experiments/pca-baseline/results/pca_baseline_k8.json`
- TTD (TT-SVD, `ranks=(8,8)`): `projects/pca_vs_ttd/experiments/ttd-baseline/results/ttd_baseline_r8_8.json`

## Baseline metrics (as recorded)

| Method | Hyperparams | Compressed floats | Compression ratio | Rel Fro error | PSNR (dB) |
|---|---:|---:|---:|---:|---:|
| PCA | `k=8` | 37,120 | 3.5310× | 0.03790 | 37.63 |
| TTD | `r1=r2=8` | 4,864 | 26.9474× | 0.04468 | 36.20 |

Derived comparison (using the recorded metrics above):
- Compression: `26.9474 / 3.5310 = 7.63×` higher compression for TTD at these hyperparameters.
- Accuracy: `0.04468 / 0.03790 = 1.18×` higher relative error for TTD (worse), and PSNR is `36.20 - 37.63 = -1.43 dB` lower.

Interpretation: at the current single baseline points, TTD offers substantially higher compression at a modest cost in reconstruction quality. This is only one point on each method’s curve; the next step is to map the trade-off curves over hyperparameters.

## Compression ratio as a function of hyperparameters (closed form)

These formulas depend only on `(T, H, W)` and the algorithm hyperparameters; they do *not* require rerunning the methods.

PCA float count (per `pca-baseline/EXPERIMENT.md`):
- `compressed_floats_pca(k) = (H·W)·(k+1) + T·k = 4096·(k+1) + 32·k = 4128·k + 4096`
- `compression_ratio_pca(k) = (T·H·W) / compressed_floats_pca(k)`

TTD (3D TT cores) float count (per `ttd-baseline/EXPERIMENT.md`) for equal ranks `r1=r2=r`:
- `compressed_floats_ttd(r) = T·r + r·H·r + r·W = 32·r + 64·r^2 + 64·r = 96·r + 64·r^2`
- `compression_ratio_ttd(r) = (T·H·W) / compressed_floats_ttd(r)`

Example ratios for this dataset (computed from the formulas above):

| PCA `k` | PCA ratio | TTD rank `r` | TTD ratio |
|---:|---:|---:|---:|
| 0 | 32.00× | 8 | 26.95× |
| 1 | 15.94× | 12 | 12.64× |
| 2 | 10.61× | 16 | 7.31× |
| 4 | 6.36× | 23 | 3.63× |
| 8 | 3.53× | 24 | 3.35× |
| 16 | 1.87× | 32 | 1.91× |

Notable consequence: matching the *compression ratio* of PCA `k=8` (≈3.53×) corresponds to a much higher TTD rank around `r≈23–24` (≈3.63× / 3.35×), which likely yields substantially better reconstruction than the low-rank `(8,8)` TTD baseline. This reinforces that the comparison should be done over curves (or at matched compression/quality), not at one arbitrary point.

## Decision: initial trade-off study scope

Decision (project-local): treat **compression ratio** and **relative Frobenius error** as the primary 2D trade-off axes. PSNR is reported as a supporting metric (helpful for interpretability), but the main “curve” should be (compression ratio, rel Fro error).

Proposed initial sweep (small, meant to be quick and informative):
- PCA: `k ∈ {0, 1, 2, 4, 8, 16}` (spans ~1.9× to 32× compression)
- TTD: `r1=r2=r` with `r ∈ {4, 8, 12, 16, 23}` (spans ~3.6× to 93× compression, and includes a point near PCA `k=8` compression)

For each sweep point, record at least:
- `compression_floats`, `compression_ratio`
- `rel_fro_error`, `psnr_db` (and optionally `mse`, `rmse` for debugging)

Done-when for this phase: a single table/CSV and a plot of both methods’ trade-off curves on the same axes.

