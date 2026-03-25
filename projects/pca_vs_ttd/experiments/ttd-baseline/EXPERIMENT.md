---
id: ttd-baseline
type: implementation
status: completed
date: 2026-03-25
project: pca_vs_ttd
consumes_resources: false
tags: [ttd, baseline]
---

# TTD baseline compression + reconstruction (synthetic dataset v1)

## Specification

- Input: `../dc-test/data/video_v1.npz` containing a 3D tensor shaped `(T, H, W)` with values in `[0, 1]`.
- TTD formulation: Tensor-Train decomposition via TT-SVD specialized to a 3D tensor with ranks `(r1, r2)`, producing TT cores:
  - `G1` of shape `(1, T, r1)`
  - `G2` of shape `(r1, H, r2)`
  - `G3` of shape `(r2, W, 1)`
- Compressed representation (float counts): total number of floats in the TT cores, `|G1| + |G2| + |G3|`.
- Compression metric: `compression_ratio = original_floats / compressed_floats`, where `original_floats = T·H·W`.
- Reconstruction accuracy metric: relative Frobenius error `||X_hat - X||_F / ||X||_F`, plus MSE/RMSE and PSNR as supporting metrics.

## Changes

- Add `run_ttd.py` to perform TT-SVD decomposition + reconstruction and emit a JSON summary with compression + accuracy metrics.

## Verification

Command:

`python projects/pca_vs_ttd/experiments/ttd-baseline/run_ttd.py --ranks 8,8 --out projects/pca_vs_ttd/experiments/ttd-baseline/results/ttd_baseline_r8_8.json --overwrite`

Output:

```json
{
  "compression_floats": 4864,
  "compression_ratio": 26.94736842105263,
  "cores_shapes": [
    [
      1,
      32,
      8
    ],
    [
      8,
      64,
      8
    ],
    [
      8,
      64,
      1
    ]
  ],
  "data_path": "projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz",
  "mse": 0.0002399053270209205,
  "original_dtype": "float32",
  "original_floats": 131072,
  "original_shape": [
    32,
    64,
    64
  ],
  "psnr_db": 36.19960108555282,
  "ranks": [
    8,
    8
  ],
  "rel_fro_error": 0.0446835508739052,
  "rmse": 0.015488877526177308
}
```
