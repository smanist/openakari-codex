---
id: tradeoff-sweep-v1
type: experiment
status: completed
date: 2026-03-25
project: pca_vs_ttd
consumes_resources: false
tags: [sweep, tradeoff, pca, ttd]
---

# PCA vs TTD — hyperparameter trade-off sweep (v1)

## Specification

Goal: produce a first trade-off curve for PCA vs TTD on the synthetic dataset v1, using the evaluation protocol at `projects/pca_vs_ttd/evaluation_protocol.md`.

Inputs:
- Dataset: `projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz` (shape `(32,64,64)`, float32 in `[0,1]`)
- Reference implementations:
  - PCA: `projects/pca_vs_ttd/experiments/pca-baseline/run_pca.py`
  - TTD (TT-SVD): `projects/pca_vs_ttd/experiments/ttd-baseline/run_ttd.py`

Sweep:
- PCA: `k ∈ {0, 1, 2, 4, 8, 16}`
- TTD: `r1=r2=r` with `r ∈ {4, 8, 12, 16, 23}`

Outputs (written under `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/results/`):
- Per-run JSON: `pca_k*.json`, `ttd_r*_* .json`
- Summary table: `sweep_summary.csv`
- Plots: `tradeoff_rel_fro_vs_compression.png`, `tradeoff_psnr_vs_compression.png`

## Verification

Run:
- `python projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/run_sweep.py --overwrite`

## Findings

Artifacts:
- `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/results/sweep_summary.csv`
- `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/results/tradeoff_rel_fro_vs_compression.png`
- `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/results/tradeoff_psnr_vs_compression.png`

Key comparison (matched compression ≈ 3.5×):
- PCA `k=8`: compression ratio `3.5310×`, rel Fro error `0.03790`, PSNR `37.63 dB`.
- TTD `r1=r2=23`: compression ratio `3.6344×`, rel Fro error `0.02632`, PSNR `40.80 dB`.

Provenance: `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/results/sweep_summary.csv`.
