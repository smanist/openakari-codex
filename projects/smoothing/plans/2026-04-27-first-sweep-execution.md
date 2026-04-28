# Lorenz63 Sweep Execution Plan

Date: 2026-04-27
Project: smoothing
Task: Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]

## Knowledge output

This session should produce the runnable benchmark pipeline and a submitted first sweep whose artifacts can answer the project's core question: how denoising error and variance change across noise levels, methods, and hyperparameters under the adopted Lorenz63 protocol.

## Plan

1. Add a reproducible sweep runner under `modules/smoothing/` that:
   - generates the protocol dataset,
   - evaluates Savitzky-Golay and kernel smoother settings,
   - writes `metrics_raw.csv`, `summary_by_setting.csv`, `best_by_noise.csv`, `robust_settings.csv`, and the required plots.
2. Add focused verification for the runner and aggregation logic with a smoke-sized configuration that stays below the in-session runtime limit.
3. Update the experiment record with the exact submission command, expected row count, and runtime/artifact paths.
4. Submit the full v1 sweep through `infra/experiment-runner/run.py --detach`, register it with the scheduler API, and record the submission in project logs.

## Scope classification

RESOURCE (`consumes_resources: true`) for the full sweep execution because it is CPU compute expected to exceed the 2-minute in-session threshold, so the run must be submitted fire-and-forget through the experiment runner. The implementation and smoke verification work around that submission remain autonomous and verifiable.
