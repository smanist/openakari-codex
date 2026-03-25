# PCA vs TTD — evaluation protocol (synthetic 3D video-like tensors)

Status: draft
Date: 2026-03-25

This protocol defines (a) compression metrics, (b) reconstruction metrics, and (c) a standard reporting format for comparing PCA vs Tensor-Train Decomposition (TTD) on 3D grayscale “video-like” tensors.

## Dataset contract

- Input artifact: a `.npz` with a single 3D tensor shaped `(T, H, W)`.
- Range/dtype: `float32` values in `[0, 1]` (so PSNR can use `data_range = 1.0`).
- Current dataset v1: `projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz` (see `projects/pca_vs_ttd/experiments/dc-test/EXPERIMENT.md`).

## Methods (what is being compared)

### PCA (frame-flattened)

- Flatten each frame so `X` has shape `(T, H·W)`.
- Fit PCA with `k` components on centered `X` and reconstruct `X_hat`, then reshape back to `(T, H, W)`.
- Reference implementation: `projects/pca_vs_ttd/experiments/pca-baseline/run_pca.py`.

### TTD (Tensor-Train via TT-SVD, order 3)

- Decompose the 3D tensor via TT-SVD with ranks `(r1, r2)` into TT cores:
  - `G1`: `(1, T, r1)`
  - `G2`: `(r1, H, r2)`
  - `G3`: `(r2, W, 1)`
- Reconstruct the tensor via TT core contractions.
- Reference implementation: `projects/pca_vs_ttd/experiments/ttd-baseline/run_ttd.py`.

## Metrics

### Compression (primary)

We measure “compression” as the number of stored **float scalars** required by the compressed representation.

- `original_floats = T·H·W`
- `compression_ratio = original_floats / compression_floats`

PCA float count:

- `compression_floats_pca(k) = (H·W)·(k + 1) + (T·k)`
  - mean vector `(H·W)`
  - components `(k, H·W)`
  - per-frame scores `(T, k)`

TTD float count (3D TT cores):

- `compression_floats_ttd(r1, r2) = (T·r1) + (r1·H·r2) + (r2·W)`

Notes:
- This “floats” metric is intentionally closed-form and model-agnostic; it does not depend on runtime.
- If we later want “bytes on disk” instead, define `bytes = floats * bytes_per_float` (e.g., 4 for `float32`) plus any serialization overhead; do not mix definitions within a report.

### Reconstruction accuracy (primary + supporting)

Let `X` be the original tensor and `X_hat` the reconstructed tensor.

Primary accuracy metric:
- **Relative Frobenius error**: `rel_fro_error = ||X_hat - X||_F / ||X||_F`

Supporting metrics (reported for interpretability/debugging):
- `mse = mean((X_hat - X)^2)`
- `rmse = sqrt(mse)`
- **PSNR (dB)** with `data_range = 1.0` (since data is in `[0, 1]`):
  - `psnr_db = 10 * log10((data_range^2) / mse)` (undefined if `mse <= 0`)

## Reporting format (tables + plots)

### Per-run result record (JSON)

Each run writes a JSON with (at minimum):
- `data_path`, `original_shape`, `original_dtype`, `original_floats`
- method hyperparams (`k` for PCA, `ranks` for TTD)
- `compression_floats`, `compression_ratio`
- `rel_fro_error`, `mse`, `rmse`, `psnr_db`

The current baselines already conform (see `projects/pca_vs_ttd/experiments/pca-baseline/results/` and `projects/pca_vs_ttd/experiments/ttd-baseline/results/`).

### Sweep summary table (CSV/Markdown)

For a hyperparameter sweep, create a single table (CSV preferred) with columns:
- `method` (`pca` or `ttd`)
- `k` (PCA; blank for TTD)
- `r1`, `r2` (TTD; blank for PCA)
- `compression_floats`, `compression_ratio`
- `rel_fro_error`, `psnr_db`, `mse`, `rmse`
- `data_path` (or dataset version tag)

### Standard plots

1. **Trade-off curve (primary)**: scatter/line plot of:
   - x-axis: `compression_ratio` (recommend log scale)
   - y-axis: `rel_fro_error` (recommend log scale)
   - overlay PCA and TTD on the same axes

2. **Supporting plot**: `compression_ratio` vs `psnr_db` (x log scale, y linear).

Note: this repo’s `.gitignore` ignores `*.png` / `*.jpg` by default; prefer committing plots as `*.pdf` (or `*.svg`) so the artifacts are versioned.

## Comparison rule (avoid single-point conclusions)

Do not conclude “TTD is better/worse” from one arbitrary hyperparameter point. Prefer:
- Overlayed trade-off curves over a sweep (primary), and/or
- A comparison at **matched compression ratio** (choose TTD ranks that bracket a PCA compression ratio and report the nearest points).

The initial sweep scope proposal lives in `projects/pca_vs_ttd/baseline_comparison.md`.
