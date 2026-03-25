# PCA vs TTD — benchmark report (synthetic dataset v1)

Status: draft
Date: 2026-03-25

This report consolidates the current PCA vs Tensor-Train Decomposition (TTD) benchmark artifacts for the synthetic 3D “video-like” tensor dataset and summarizes baseline results under the project’s evaluation protocol.

## Scope and current status

- Dataset: synthetic grayscale tensor `(T, H, W) = (32, 64, 64)` (v1)
- Implementations: PCA baseline and TT-SVD (order-3) TTD baseline
- Results included here: **single-point** baselines (PCA `k=8`, TTD `r1=r2=8`)
- Pending: full hyperparameter sweep and trade-off curves (see “Next steps”)

## Inputs (provenance)

Dataset:
- `projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz`

Evaluation protocol:
- `projects/pca_vs_ttd/evaluation_protocol.md`

Baseline result files:
- PCA (`k=8`): `projects/pca_vs_ttd/experiments/pca-baseline/results/pca_baseline_k8.json`
- TTD (TT-SVD, `ranks=(8,8)`): `projects/pca_vs_ttd/experiments/ttd-baseline/results/ttd_baseline_r8_8.json`

## Methods (summarized)

### PCA (frame-flattened)

Flatten each frame so `X` has shape `(T, H·W)`, fit PCA with `k` components on centered `X`, and reconstruct `X_hat`, then reshape back to `(T, H, W)`.

Reference implementation:
- `projects/pca_vs_ttd/experiments/pca-baseline/run_pca.py`

### TTD (Tensor-Train via TT-SVD, order 3)

Decompose the tensor with TT-SVD into 3 TT cores (ranks `(r1, r2)`), then reconstruct via core contractions.

Reference implementation:
- `projects/pca_vs_ttd/experiments/ttd-baseline/run_ttd.py`

## Metrics (protocol)

Per `projects/pca_vs_ttd/evaluation_protocol.md`, the primary trade-off axes are:

- **Compression ratio**: `original_floats / compression_floats`
- **Relative Frobenius reconstruction error**: `||X_hat - X||_F / ||X||_F`

PSNR (dB) is reported as a supporting interpretability metric.

## Results (baseline points)

Dataset shape: `(32, 64, 64)` → `original_floats = 131,072`.

| Method | Hyperparams | Compressed floats | Compression ratio | Rel Fro error | PSNR (dB) |
|---|---:|---:|---:|---:|---:|
| PCA | `k=8` | 37,120 | 3.5310× | 0.03790 | 37.63 |
| TTD | `r1=r2=8` | 4,864 | 26.9474× | 0.04468 | 36.20 |

Interpretation (single-point; not a curve conclusion): at these baselines, TTD achieves substantially higher compression (≈7.63× vs PCA) with modestly worse reconstruction (≈1.18× higher rel-Fro error; −1.43 dB PSNR).

## Next steps (trade-off curves)

The project’s “trade-off analysis” task is to sweep hyperparameters and overlay both methods on the same axes:

- x-axis: `compression_ratio` (log scale recommended)
- y-axis: `rel_fro_error` (log scale recommended)

Initial sweep scope proposal (and closed-form compression formulas) live in:
- `projects/pca_vs_ttd/baseline_comparison.md`

