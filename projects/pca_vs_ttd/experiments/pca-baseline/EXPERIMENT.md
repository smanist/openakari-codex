---
id: pca-baseline
type: implementation
status: completed
date: 2026-03-25
project: pca_vs_ttd
consumes_resources: false
tags: [pca, baseline]
---

# PCA baseline compression + reconstruction (synthetic dataset v1)

## Specification

- Input: `../dc-test/data/video_v1.npz` containing a 3D tensor shaped `(T, H, W)` with values in `[0, 1]`.
- PCA formulation: flatten each frame into a feature vector so `X` has shape `(T, H·W)`; fit PCA with `k` components on centered `X`.
- Compressed representation (float counts): mean vector `(H·W)`, components matrix `(k, H·W)`, and per-frame scores `(T, k)`.
- Compression metric: `compression_ratio = original_floats / compressed_floats`, where `original_floats = T·H·W` and `compressed_floats = (H·W)·(k+1) + (T·k)`.
- Reconstruction accuracy metric: relative Frobenius error `||X_hat - X||_F / ||X||_F`, plus MSE/RMSE and PSNR as supporting metrics.

## Changes

- Added `run_pca.py` to perform PCA compression + reconstruction and emit a JSON summary with compression + accuracy metrics.
- Recorded baseline metrics for a generic choice of `k`.

## Verification

Command:

`python projects/pca_vs_ttd/experiments/pca-baseline/run_pca.py --k 8 --out projects/pca_vs_ttd/experiments/pca-baseline/results/pca_baseline_k8.json --overwrite`

Output:

```json
{
  "compression_floats": 37120,
  "compression_ratio": 3.5310344827586206,
  "data_path": "projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz",
  "flattened_dim": 4096,
  "k": 8,
  "mse": 0.00017261006704864345,
  "n_samples": 32,
  "original_dtype": "float32",
  "original_floats": 131072,
  "original_shape": [
    32,
    64,
    64
  ],
  "psnr_db": 37.62933878747242,
  "rel_fro_error": 0.03790188354194469,
  "rmse": 0.013138115049300013
}
```
