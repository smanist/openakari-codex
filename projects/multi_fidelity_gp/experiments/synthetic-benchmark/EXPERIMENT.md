---
id: synthetic-benchmark
type: implementation
status: completed
date: 2026-03-25
project: multi_fidelity_gp
consumes_resources: false
tags: [synthetic, benchmark, data]
---

# Synthetic benchmark and data splits

## Specification

Domain: `x ∈ [-4, 4]`

High-fidelity truth:

- `f(x) = sin(1.7 x) + 0.25 x + 0.55 exp(-0.9 (x - 1.1)^2)`

Low-fidelity approximation:

- `f_LF(x) = 0.82 sin(1.45 x + 0.2) + 0.20 x + 0.30 exp(-0.55 (x - 0.6)^2) - 0.12`

Splits:

- Train (HF): 12 evenly spaced points over `[-3.8, 3.8]`
- Test (HF): 80 evenly spaced points over `[-4, 4]` (asserted disjoint from train)

## Changes

- Added `benchmark.py` with `f_true` and `f_lf`
- Added `generate.py` to write CSV splits and `plots/functions.svg`

## Verification

- `python projects/multi_fidelity_gp/experiments/synthetic-benchmark/generate.py`

## Findings

- Wrote:
  - `projects/multi_fidelity_gp/experiments/synthetic-benchmark/data/high_fidelity_train.csv`
  - `projects/multi_fidelity_gp/experiments/synthetic-benchmark/data/high_fidelity_test.csv`
  - `projects/multi_fidelity_gp/experiments/synthetic-benchmark/plots/functions.svg`
