# Smoothing Module

Execution module for `projects/smoothing/`.

This module should hold reproducible code for Lorenz63 denoising benchmarks. Heavy runtime artifacts belong under `modules/smoothing/artifacts/`, with durable experiment records kept under `projects/smoothing/experiments/`.

## Entry points

- `generate_lorenz63_dataset.py` builds reproducible clean/noisy Lorenz63 trajectory datasets and writes:
  - `clean_trajectories.npz`
  - `noisy_observations.npz`
  - `metadata.json`
