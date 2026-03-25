# Multi-Fidelity GP Correction

Status: active
Mission: Determine how much a Gaussian-process residual correction can improve a known low-fidelity function approximation when only limited high-fidelity data are available.
Done when: A reproducible benchmark compares low-fidelity-only, high-fidelity-only GP, and low-fidelity-plus-GP correction models on holdout high-fidelity data using both accuracy and uncertainty metrics, and records when the correction model is preferable.

## Context

This project studies one-dimensional multi-fidelity regression for a target function `y = f(x)`. The working model is to keep a provided low-fidelity approximation `f_LF(x)` unchanged and learn only the residual `r(x) = f(x) - f_LF(x)` from sparse high-fidelity data with a Gaussian process. The first benchmark will be fully synthetic so that the true function is known everywhere, the low-fidelity bias can be controlled, and uncertainty calibration can be checked against a separate high-fidelity test set. The concrete initial benchmark uses `x in [-4, 4]`, a smooth nonlinear target with oscillation plus a local bump, and a biased low-fidelity surrogate that captures the broad trend but misses amplitude, phase, and offset details.

## Log

### 2026-03-25 — Project created

Project initiated via `/project scaffold` from a human request to study multi-fidelity modeling for `y = f(x)` using a fixed low-fidelity approximation and a Gaussian-process correction trained on high-fidelity observations. The initial project scaffold fixes a concrete synthetic benchmark, a residual-GP modeling strategy, and evaluation criteria based on holdout high-fidelity accuracy and uncertainty calibration.

Verification:
- `git diff --check -- projects/multi_fidelity_gp projects/akari/README.md` -> no output

Sources: none (project creation)

## Open questions

- Should the project treat `f_LF(x)` strictly as a fixed mean function, or also compare against more general multi-fidelity GP constructions such as autoregressive co-kriging?
- How sensitive are the findings to the amount and placement of high-fidelity training data?
- Which uncertainty metric is most decision-relevant for this benchmark: interval coverage, negative log likelihood, or sharpness at matched coverage?
