---
id: dc-test
type: implementation
status: completed
date: 2026-03-25
project: pca_vs_ttd
consumes_resources: false
tags: [dataset, synthesis]
---

# Synthetic grayscale video-like dataset (v1)

## Specification

- Output: a 3D tensor shaped `(T, H, W)` representing a grayscale video.
- Range/dtype: float32 in `[0, 1]`.
- Determinism: seeded RNG so the dataset is reproducible.
- Storage: committed artifacts in `data/` as `video_v1.npz` + `meta_v1.json`.

## Changes

- Added `generate_dataset.py` to generate a deterministic synthetic tensor.
- Generated and committed `data/video_v1.npz` and `data/meta_v1.json`.

## Verification

Command:

`python projects/pca_vs_ttd/experiments/dc-test/generate_dataset.py --out-dir projects/pca_vs_ttd/experiments/dc-test/data --version v1 --seed 0 --frames 32 --height 64 --width 64 --n-spatial-bases 3 --n-blobs 2 --noise-std 0.03 --overwrite`

Output:

```json
{
  "dtype": "float32",
  "max": 1.0,
  "min": 0.0,
  "saved_meta": "projects/pca_vs_ttd/experiments/dc-test/data/meta_v1.json",
  "saved_tensor": "projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz",
  "shape": [
    32,
    64,
    64
  ]
}
```
