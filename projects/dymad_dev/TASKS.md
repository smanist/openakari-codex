# DyMAD Development — Tasks

- [ ] Add config-driven noise sampling alongside existing trajectory samplers [skill: execute] [requires-frontier]
  Why: The sampling stack already accepts structured configs for `control`, `x0`, and `p`; adding a parallel `noise` config is the cleanest way to produce reproducible noisy datasets for both training and evaluation.
  Done when: `TrajectorySampler` accepts a `noise` config dictionary, applies the configured noise deterministically under a fixed RNG seed, and regression tests cover at least one regular-trajectory workflow with and without control inputs.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`
  Notes: Per `modules/dymad_dev/docs/feature-placement.md`, this should stay in the runtime implementation layer rather than `src/dymad/agent/*`.

- [ ] Add a denoising data phase that passes transformed datasets to later phases [skill: execute] [requires-frontier]
  Why: The phase system already exposes `type: data`, but it cannot yet rewrite the dataset or metadata that later optimizer and analysis phases consume.
  Done when: a `type: data` phase with `operation: denoise` can apply a configurable filter to regular trajectory batches, rebuild the phase context consistently, and unit tests show later phases consume the transformed dataset rather than the original one.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`
  Notes: Start with `tests/test_training_phase_runtime.py` and the closest workflow tests, which the updated DyMAD docs now call out as the boundary truth for training-phase changes.

- [ ] Expose denoising as a user-requestable training phase [skill: multi] [requires-frontier]
  Why: The intended UX is that users can request denoising in the same staged-training vocabulary as linear solves and optimizer phases, so runtime support alone is insufficient.
  Done when: compiled/user-facing training workflows accept a denoising phase request, the relevant registry/compiler metadata and tests are updated so `operation: denoise` is an accurate supported surface, and the runtime implementation stays aligned with that contract.
  Priority: high
  Evidence: `modules/dymad_dev/docs/architecture.md`, `modules/dymad_dev/docs/feature-placement.md`, `modules/dymad_dev/skills/dymad-train-eval-workflow/SKILL.md`

- [ ] Quantify denoising effectiveness against a clean-reference benchmark [skill: multi] [requires-frontier]
  Why: The new denoising phase only earns its complexity if it demonstrably improves direct signal quality or downstream training robustness under injected noise.
  Done when: `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md` reports clean-vs-noisy-vs-denoised metrics with exact commands, including a direct observation error metric and a downstream training metric.
  Priority: high
  Evidence: `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md`

## Slow-regression seed stabilization

- [x] Inventory seed-controlled slow and extra_slow regression tests [skill: record] [fleet-eligible] [zero-resource]
  Why: The seed-stabilization work should start from an explicit inventory of which regression tests already expose seed knobs and which files/CLI args own them.
  Done when: `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md` lists the targeted `test_slow_*` and `extra_slow` cases, identifies the current seed entry points, and records that thresholds/baselines are out of scope.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`

- [ ] Stabilize LTI, graph, and PIROM slow regressions by seed-only edits [skill: execute] [fleet-eligible]
  Why: These families already use explicit `TEST_SEED` or `--seed` paths, so they are the most direct place to reduce flaky regression failures without changing acceptance criteria.
  Done when: the targeted LTI, graph, delay, and PIROM `test_slow_*` cases pass their existing metric thresholds using only random-seed changes, and no threshold or baseline JSON edits are included in the diff.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`

- [ ] Stabilize kernel and Koopman slow regressions by seed-only edits [skill: execute] [fleet-eligible]
  Why: Kernel and Koopman CLI regressions have their own seed-controlled data generation and initialization paths, and they fail for the same nondeterministic reason.
  Done when: the targeted kernel and Koopman `test_slow_*` cases pass their existing metric thresholds using only seed changes, and no threshold or baseline JSON edits are included in the diff.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`
  Notes: 2026-04-15 exploratory seed sweeps found immediate fail-fast instability in `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`; 2026-04-16 follow-up seed scans (`19` candidates, `0/19` pass-all for `ker_lti`) and diagnosis runs showed fixed-seed metric drift (`crit_train_last` / `crit_valid_last`) and support decomposing `ker_lti` into a deterministic-runtime diagnosis stream before further broad Family 2 seed sweeps. A 2026-04-16 deterministic-control probe (`shuffle` and thread-pinning combinations) still produced only `3/20` passes (`S4` best setting `1/5`), so this task should treat `ker_lti` as not-yet seed-only-fixable and continue on other Family 2 files unless deeper runtime controls succeed.

- [x] Diagnose residual nondeterminism in `test_slow_ker_lti_cli.py` under seed-only constraints [skill: diagnose] [requires-frontier] [zero-resource]
  Why: Seed-only candidate sweeps have not found a pass-all `TEST_SEED` for `ker_lti`, so the stabilization task needs evidence on whether non-seed controls (execution order, runtime determinism settings, fixture isolation) are causing metric drift.
  Done when: a diagnosis note in `projects/dymad_dev/analysis/` reports at least two evidence-backed hypotheses for `ker_lti` drift, includes exact repro commands and observed metric variability, and recommends whether the main Family 2 seed-only task should continue as-is or be decomposed.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`
  Notes: Completed in `projects/dymad_dev/analysis/diagnosis-ker-lti-nondeterminism-2026-04-16.md`; recommendation is to decompose Family 2 and isolate deterministic-runtime controls for `ker_lti` before additional seed-only sweeps.

- [x] Isolate deterministic-runtime controls for `test_slow_ker_lti_cli.py` before further seed sweeps [skill: diagnose] [requires-frontier] [zero-resource]
  Why: The completed `ker_lti` diagnosis found run-to-run metric drift under the same seed (including metric-name flips), so the stabilization stream needs controlled evidence about runtime/dataloader determinism before more seed search effort.
  Done when: a follow-up analysis note evaluates at least four control settings (including `shuffle` on/off and thread-pinning), runs at least 5 reruns per setting for `km_ln`, reports variability and threshold ratios per setting, and recommends the minimal viable deterministic controls (or concludes `ker_lti` is not seed-only stabilizable).
  Priority: high
  Evidence: `projects/dymad_dev/analysis/diagnosis-ker-lti-nondeterminism-2026-04-16.md`
  Notes: Completed in `projects/dymad_dev/analysis/diagnosis-ker-lti-deterministic-controls-2026-04-16.md`; tested 4 settings × 5 reruns, best profile was `shuffle: false` + thread pinning (`1/5` pass), conclusion: not yet seed-only stabilizable.

- [ ] Probe deeper runtime-determinism controls for `test_slow_ker_lti_cli.py` [skill: diagnose] [requires-frontier] [zero-resource]
  Why: The completed deterministic-control probe showed `shuffle` and thread-pinning alone are insufficient (`3/20` passes overall), so the next diagnosis step should test additional runtime controls before any more seed sweeps on `ker_lti`.
  Done when: a follow-up analysis note evaluates at least three additional controls layered on top of the best tested setting (e.g., deterministic algorithms, worker/thread settings, explicit run-order isolation), runs at least 5 reruns per control for `km_ln`, and records a go/no-go recommendation for further seed-only stabilization attempts on `ker_lti`.
  Priority: high
  Evidence: `projects/dymad_dev/analysis/diagnosis-ker-lti-deterministic-controls-2026-04-16.md`

- [ ] Stabilize extra_slow and remaining long-running regressions by seed-only edits [skill: execute] [fleet-eligible]
  Why: The `extra_slow` path should be stabilized under the same seed-only rule so long-running regressions stop failing intermittently for avoidable randomness.
  Done when: the currently marked `extra_slow` cases and any remaining uncovered long-running regression tests pass their existing checks using only seed changes, and no threshold or baseline JSON edits are included in the diff.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`

- [ ] Audit the slow-regression seed sweep for scope compliance [skill: govern] [fleet-eligible] [zero-resource]
  Why: The user requirement is explicit: change and only change random seeds, while preserving the existing error criteria.
  Done when: a verification note records the exact `git diff` / pytest evidence showing that touched files changed only seed literals or seed arguments, with no edits to `slow_regression_utils.py`, baseline JSON files, or metric thresholds.
  Priority: high
  Evidence: `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`
