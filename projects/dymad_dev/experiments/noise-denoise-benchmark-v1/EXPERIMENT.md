---
id: noise-denoise-benchmark-v1
type: experiment
status: planned
date: 2026-04-15
project: dymad_dev
consumes_resources: false
module: dymad_dev
artifacts_dir: modules/dymad_dev/artifacts/noise-denoise-benchmark-v1
tags: [noise, denoise, savitzky-golay, validation]
---

# Noise vs Denoised Dataset Benchmark v1

## Specification

Objective: quantify whether denoising a noisy trajectory dataset before training improves both direct observation fidelity and downstream training quality.

Planned inputs:
- one clean regular-trajectory dataset from an existing DyMAD workflow
- one noisy variant generated from the same underlying trajectories using the new `noise` sampler config
- one denoised variant produced by the new `type: data` / `operation: denoise` phase

Planned v1 scope:
- regular, non-graph trajectories
- additive Gaussian observation noise
- Savitzky-Golay denoising
- fixed RNG seeds so the clean/noisy/denoised comparison is reproducible

Planned metrics:
- direct signal quality:
  - `NRMSE(y_noisy, y_clean)`
  - `NRMSE(y_denoised, y_clean)`
  - `delta_nrmse = NRMSE(y_noisy, y_clean) - NRMSE(y_denoised, y_clean)`
- downstream model quality:
  - validation loss or rollout RMSE for identical model/training configs trained on noisy vs denoised datasets
  - comparison against the clean-reference validation data

Planned procedure:
1. Choose one existing regular trajectory configuration, with the LTI path as the preferred first case.
2. Sample a clean reference dataset with a fixed seed.
3. Generate a noisy observation dataset from the same underlying trajectories using the new sampler config.
4. Run identical training configs on:
   - raw noisy data
   - denoised data produced from the noisy dataset
5. Compare direct observation error and downstream validation metrics.

Success criterion:
- direct denoising improves observation NRMSE at a moderate noise level, and
- downstream validation does not worsen relative to the raw noisy baseline.

## Changes

Planned. This record defines the benchmark before implementation lands.

## Verification

Pending implementation. Expected verification will include exact commands for:
- generating clean and noisy datasets
- running training with and without the denoising phase
- computing direct and downstream metrics

## Findings

Pending.
