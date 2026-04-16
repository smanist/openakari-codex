# DyMAD Development

Status: active
Mission: Extend DyMAD's data pipeline so trajectories can include config-driven synthetic noise, training can optionally denoise datasets before optimization, and the resulting filter can be evaluated against a clean reference.
Done when: `modules/dymad_dev` supports a config-driven noise sampler, a denoising data phase that passes transformed datasets to later training phases, and user-facing training workflows can request that denoising phase; `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md` is then completed with direct and downstream effectiveness metrics.

## Context

`modules/dymad_dev/` is already a registered execution module in `modules/registry.yaml`, but `projects/dymad_dev/` had no durable project record yet.

The immediate scope is two linked workstreams. First, extend trajectory generation so noise can be configured in parallel with the existing `control`, `x0`, and `p` samplers. Second, turn the existing training `data` phase hook into a real dataset-transform phase that can denoise trajectories, with Savitzky-Golay filtering as the initial target.

This project is framed as both implementation and measurement work. The code changes matter because they enable controlled noise injection and denoising; the knowledge output is whether denoising measurably improves signal fidelity and downstream training quality on regular trajectory datasets.

## Log

### 2026-04-16 (Wired dataloader worker controls for deterministic `ker_lti` follow-up)

Ran `/orient dymad_dev`, selected and claimed `Wire dataloader worker controls for deterministic slow-regression experiments`, then completed runtime wiring + tests.

Orient summary:
- Scoped project status: actionable, clean working tree, no pending approvals.
- Findings-first gate: enabled (`0/10 = 0%` across latest scheduler `work-cycle` sessions from `.scheduler/metrics/sessions.jsonl`).
- Budget gate: `n/a` (`consumes_resources: false`; no LLM API, external API, GPU compute, or detached long-running process).

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false`.

Task claim:
- `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"taskText":"Wire dataloader worker controls for deterministic slow-regression experiments","project":"dymad_dev","agentId":"work-session-mo190sk5"}'`
  - `{"ok":true,"claim":{"claimId":"bd12d067ef82fbe1",...}}`

Changes made:
- Updated `modules/dymad_dev/src/dymad/io/trajectory_manager.py`:
  - added `dataloader.num_workers` runtime wiring for both `TrajectoryManager` and `TrajectoryManagerGraph`,
  - added guardrails for `dataloader.persistent_workers` and `dataloader.prefetch_factor` when `num_workers == 0`.
- Updated `modules/dymad_dev/tests/test_typed_trainer_batches.py`:
  - added tests that assert configured `num_workers` is honored for regular and graph typed loaders,
  - added guardrail tests for invalid worker/prefetch combinations.
- Updated `modules/dymad_dev/scripts/ker_lti/ker_model.yaml` with explicit `dataloader.num_workers: 0`.
- Updated `projects/dymad_dev/TASKS.md` to mark the worker-control task complete.

Verification:
- `PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src pytest -q tests/test_typed_trainer_batches.py` (run in `modules/dymad_dev`)
  - `7 passed, 2 warnings in 0.44s`
- `python - <<'PY' ... import dymad.io.trajectory_manager as tm; print(tm.__file__) ... PY`
  - default environment resolves `dymad` to `/Users/daninghuang/Repos/dymad-dev/src/dymad/io/trajectory_manager.py`.
  - non-obvious verification constraint: set `PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src` when validating this repo copy.

Compound (fast): no actions.

Session-type: autonomous
Duration: 52
Task-selected: Wire dataloader worker controls for deterministic slow-regression experiments
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-16 (Selected and documented post-seed replacement path for `ker_lti`)

Ran `/orient dymad_dev`, selected and claimed `Decide replacement path for test_slow_ker_lti_cli.py after seed-only no-go`, then completed the diagnosis + task-bridge work to move `ker_lti` out of the seed-only stream and into explicit runtime-determinism remediation.

Orient summary:
- Scoped project status: actionable, clean working tree, no pending approvals.
- Findings-first gate: enabled (`0/10 = 0%` non-zero findings for latest scheduler `work-cycle` sessions from `.scheduler/metrics/sessions.jsonl`).
- Budget gate: `n/a` for this task (`consumes_resources: false`; no LLM API, external API, GPU compute, or long-running detached process).

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false`.

Task claim:
- `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"taskText":"Decide replacement path for \`test_slow_ker_lti_cli.py\` after seed-only no-go","project":"dymad_dev","agentId":"work-session-mo16vmkv"}'`
  - `{"ok":true,"claim":{"claimId":"0a74b1c5acbb8898",...}}`

Changes made:
- Added diagnosis note:
  - `projects/dymad_dev/analysis/diagnosis-ker-lti-replacement-path-2026-04-16.md`
- Updated `projects/dymad_dev/TASKS.md` to:
  - mark replacement-path diagnosis task complete,
  - explicitly carve `tests/test_slow_ker_lti_cli.py` out of the Family 2 seed-only done-when scope,
  - add downstream execution tasks for runtime worker-control wiring and deterministic-profile validation.

Verification:
- `python - <<'PY' ...` (from existing probe CSV artifacts)
  - `ker_lti_deterministic_controls_probe_2026-04-16.csv: 3/20`
  - `ker_lti_deterministic_controls_deeper_probe_2026-04-16.csv: 1/15`
- `if rg -n 'num_workers|persistent_workers|pin_memory|prefetch_factor' modules/dymad_dev/src/dymad ...; then ...; else echo 'NO_MATCHES'; fi`
  - `NO_MATCHES`
- `rg -n 'Decide replacement path for \`test_slow_ker_lti_cli.py\`|Wire dataloader worker controls for deterministic slow-regression experiments|Validate \`ker_lti\` stability under an explicit deterministic runtime profile|excluding \`tests/test_slow_ker_lti_cli.py\`' projects/dymad_dev/TASKS.md`
  - `45: ... excluding \`tests/test_slow_ker_lti_cli.py\` ...`
  - `71:- [x] Decide replacement path for \`test_slow_ker_lti_cli.py\` after seed-only no-go ...`
  - `78:- [ ] Wire dataloader worker controls for deterministic slow-regression experiments ...`
  - `84:- [ ] Validate \`ker_lti\` stability under an explicit deterministic runtime profile ...`

Compound (fast): no actions.

Session-type: autonomous
Duration: 36
Task-selected: Decide replacement path for `test_slow_ker_lti_cli.py` after seed-only no-go
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-16 (Completed deeper `ker_lti` runtime-control probe; recorded seed-only no-go)

Ran `/orient dymad_dev`, selected and claimed `Probe deeper runtime-determinism controls for test_slow_ker_lti_cli.py`, then completed the required 3-control follow-up probe (`5` reruns per control for `km_ln`).

Orient summary:
- Scoped project status: actionable, clean working tree, no pending approvals.
- Findings-first gate: enabled (`0/10 = 0%` non-zero findings in recent scheduler work-cycle sessions).
- Budget gate: `n/a` for this task (`consumes_resources: false`; no LLM API, external API, GPU compute, or detached long-running job).

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false`.

Task claim:
- `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"taskText":"Probe deeper runtime-determinism controls for `test_slow_ker_lti_cli.py`","project":"dymad_dev","agentId":"work-session-mo14qgp4"}'`
  - `{"ok":true,"claim":{"claimId":"1b198c03332c78df",...}}`

Changes made:
- Added diagnosis note:
  - `projects/dymad_dev/analysis/diagnosis-ker-lti-deeper-runtime-controls-2026-04-16.md`
- Added probe artifacts:
  - `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_deeper_probe_2026-04-16.csv`
  - `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_deeper_probe_2026-04-16.json`
  - `projects/dymad_dev/analysis/data/ker_lti_controls_deeper_logs_2026-04-16/` (15 raw logs)
- Updated:
  - `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md` with deeper-control findings (`1/15` overall pass rate).
  - `projects/dymad_dev/TASKS.md` to mark the deeper-control probe complete, carry forward no-go evidence on `ker_lti`, and add a replacement-path diagnosis task.
  - `projects/dymad_dev/README.md` open question to reflect the unresolved non-seed remediation path.

Verification:
- `python - <<'PY' ...` (summarize pass counts from CSV)
  - `S5_shuffle_false_thread_pinned_workers0: 1/5`
  - `S6_workers0_torch_deterministic: 0/5`
  - `S7_workers0_deterministic_cache_isolated: 0/5`
  - `overall: 1 / 15`
- `python - <<'PY' ...` (summarize failure-ratio stats from CSV)
  - `S5 ... min=10.898 avg=122.605 max=290.152`
  - `S6 ... min=1.243 avg=7164.143 max=35805.753`
  - `S7 ... min=1.065 avg=10.943 max=48.547`
- `git diff -- modules/dymad_dev/scripts/ker_lti/ker_model.yaml`
  - no diff (temporary probe edits were restored).

Compound (fast): 1 action — added task `Decide replacement path for test_slow_ker_lti_cli.py after seed-only no-go`.

Session-type: autonomous
Duration: 47
Task-selected: Probe deeper runtime-determinism controls for `test_slow_ker_lti_cli.py`
Task-completed: yes
Approvals-created: 0
Files-changed: 22
Commits: 2
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-16 (Completed deterministic-control probe for `ker_lti` seed-stabilization blocker)

Ran `/orient dymad_dev`, selected and claimed `Isolate deterministic-runtime controls for test_slow_ker_lti_cli.py before further seed sweeps`, and completed the required 4-setting control probe for `km_ln`.

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false` (no LLM API calls, no external API calls, no GPU compute, no long-running detached jobs).

Task claim:
- `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"taskText":"Isolate deterministic-runtime controls for `test_slow_ker_lti_cli.py` before further seed sweeps","project":"dymad_dev","agentId":"work-session-mo12lasr"}'`
  - `{"ok":true,"claim":{"claimId":"2dece3bad638af5e",...}}`

Changes made:
- Added `projects/dymad_dev/analysis/diagnosis-ker-lti-deterministic-controls-2026-04-16.md` with:
  - 4 deterministic-runtime settings (including `shuffle` on/off and thread pinning),
  - 5 reruns per setting (`20` runs total),
  - pass-rate and threshold-ratio variability by setting,
  - recommendation that `ker_lti` is not yet seed-only stabilizable under tested controls.
- Added probe artifacts:
  - `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_probe_2026-04-16.csv`
  - `projects/dymad_dev/analysis/data/ker_lti_deterministic_controls_probe_2026-04-16.json`
  - `projects/dymad_dev/analysis/data/ker_lti_controls_logs_2026-04-16/` (20 raw run logs)
- Updated `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md` with a new deterministic-control findings section.
- Updated `projects/dymad_dev/TASKS.md`:
  - marked the deterministic-control isolation task complete,
  - annotated the Family 2 seed-only stabilization task with `3/20` control-probe evidence,
  - added follow-up diagnosis task for deeper runtime-determinism controls.

Verification:
- Probe runner emitted per-run outcomes for all 20 runs; summary excerpts:
  - `S1_default_shuffle_default_threads: passes=0/5 ratios=min=1.148 avg=2.000 max=3.119`
  - `S2_default_shuffle_thread_pinned: passes=1/5 ratios=min=1.083 avg=2.910 max=7.692`
  - `S3_shuffle_false_default_threads: passes=1/5 ratios=min=2.672 avg=9.142 max=26.900`
  - `S4_shuffle_false_thread_pinned: passes=1/5 ratios=min=1.095 avg=1.737 max=2.267`
- `du -sh projects/dymad_dev/analysis/data/ker_lti_controls_logs_2026-04-16`
  - `148K`
- `git status --short` (after probe completion, before task-close edits)
  - showed only project-owned task/analysis artifacts changed; no module runtime files remained modified.

Session-type: autonomous
Duration: 88
Task-selected: Isolate deterministic-runtime controls for `test_slow_ker_lti_cli.py` before further seed sweeps
Task-completed: yes
Approvals-created: 0
Files-changed: 26
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-16 (Completed `ker_lti` nondeterminism diagnosis and decomposed Family 2 follow-up)

Ran `/orient dymad_dev`, selected and claimed `Diagnose residual nondeterminism in test_slow_ker_lti_cli.py under seed-only constraints`, and completed the diagnosis artifact requested by the task.

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false` (no LLM API calls, no external API calls, no GPU compute, no long-running detached jobs).

Task claim:
- `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"taskText":"Diagnose residual nondeterminism in `test_slow_ker_lti_cli.py` under seed-only constraints","project":"dymad_dev","agentId":"work-session-mo10g4vg"}'`
  - `{"ok":true,"claim":{"claimId":"be062f3d135875ce",...}}`

Changes made:
- Added diagnosis note `projects/dymad_dev/analysis/diagnosis-ker-lti-nondeterminism-2026-04-16.md` with:
  - exact repro commands,
  - observed metric variability under fixed seed,
  - evidence-backed hypotheses,
  - recommendation to decompose Family 2 work for `ker_lti`.
- Updated `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md` with a new diagnosis findings section and command/output excerpts.
- Updated `projects/dymad_dev/TASKS.md`:
  - marked the diagnosis task complete,
  - annotated the Family 2 stabilization task with diagnosis findings,
  - added decomposed follow-up task `Isolate deterministic-runtime controls for test_slow_ker_lti_cli.py before further seed sweeps`.

Verification:
- `cd modules/dymad_dev && for mode in default serial; do ... pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' ...; done`
  - default-mode failures (same seed): `5.565582586220919e-05 <= 3.0152980685024556e-06`, `0.498131653991013 <= 0.14944818489137485`, `0.01867423212532156 <= 0.00233733233805354`
  - serial-mode failures (same seed): `4.844859347597597e-06 <= 3.0152980685024556e-06`, `0.10342498899581704 <= 0.00233733233805354`, `8.728553968644036 <= 8.196865277722416`
- `cd modules/dymad_dev && for i in 1 2 3 4; do pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' ...; done`
  - run excerpts:
    - `metric_name = 'crit_valid_last'`, `0.010308897274475396 <= 0.00233733233805354`
    - `metric_name = 'crit_train_last'`, `0.00012279360711213943 <= 3.0152980685024556e-06`
- `cd modules/dymad_dev && pytest -q --reruns 0 -o log_cli=false --showlocals --tb=long 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[dkm_ln]'`
  - `metric_name = 'crit_train_last'`, `5.019007493601319e-07 <= 8.55738987656145e-08`
- `rg -n "use_deterministic_algorithms|cudnn\\.deterministic|cudnn\\.benchmark|torch\\.set_num_threads|deterministic" modules/dymad_dev/src modules/dymad_dev/scripts modules/dymad_dev/tests -g '!**/*.ipynb'`
  - no matches

Compound (fast): no additional actions (task discovery and decomposition already recorded during execution).

Session-type: autonomous
Duration: 53
Task-selected: Diagnose residual nondeterminism in `test_slow_ker_lti_cli.py` under seed-only constraints
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-16 (Partial execution on Family 2 seed stabilization; `ker_lti` scan found no pass-all seed)

Ran `/orient dymad_dev`, selected and claimed `Stabilize kernel and Koopman slow regressions by seed-only edits`, and executed a deeper seed-only probe focused on the current Family 2 blocker in `tests/test_slow_ker_lti_cli.py`.

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false` (no LLM API calls, no external API calls, no GPU compute, no long-running detached jobs).

Task claim:
- `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"taskText":"Stabilize kernel and Koopman slow regressions by seed-only edits","project":"dymad_dev","agentId":"work-session-mo0yayzi"}'`
  - `{"ok":true,"claim":{"claimId":"eec3f9d1680b6c73",...}}`

Changes made:
- Updated `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md` with a new `## Execution findings (2026-04-16, Family 2 ker_lti deep seed probe)` section containing exact repro commands and outputs.
- Updated `projects/dymad_dev/TASKS.md` note for `Stabilize kernel and Koopman slow regressions by seed-only edits` with `0/19` pass-all seed-scan evidence.
- Added a follow-up diagnosis task: `Diagnose residual nondeterminism in test_slow_ker_lti_cli.py under seed-only constraints`.

Verification:
- `cd modules/dymad_dev && for i in 1 2 3 4 5; do echo "RUN $i"; pytest -q --reruns 0 -o log_cli=false 'tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]' >/tmp/km_ln_$i.log 2>&1; ec=$?; echo "exit=$ec"; rg -n "FAILED|1 passed|AssertionError|short test summary" /tmp/km_ln_$i.log || true; done`
  - all five runs failed (`5/5`), with varying assertion magnitudes (e.g., `0.003362957967460712 <= 0.00233733233805354`, `17.0598617123593 <= 8.196865277722416`).
- `cd modules/dymad_dev && python -u - <<'PY' ...` (seed scan script for `ker_lti` cases)
  - `seed_count=19`
  - `01 seed=20260415 FAIL km_ln:best_valid_total:1.405`
  - `14 seed=1496597 FAIL dkm_ln:crit_valid_last:5.329`
  - `19 seed=2318764 FAIL km_ln:best_valid_total:1.107`
  - `NO_SEED_FOUND`

Compound (fast): 1 action (task discovery) — added the `ker_lti` nondeterminism diagnosis task; fleet spot-check found no recent `triggerSource:"fleet"` sessions in the last 500 metrics rows.

Session-type: autonomous
Duration: 76
Task-selected: Stabilize kernel and Koopman slow regressions by seed-only edits
Task-completed: partial
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-15 (Partial execution on Family 2 seed stabilization; fail-fast evidence logged)

Ran `/orient dymad_dev`, selected and claimed `Stabilize kernel and Koopman slow regressions by seed-only edits`, then executed a fail-fast verification pass focused on Family 2 (`kernel` / `koopman`) without changing thresholds or baselines.

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false` (no LLM API calls, no external API calls, no GPU compute, no long-running detached jobs).

Task claim:
- `curl -s -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"taskText":"Stabilize kernel and Koopman slow regressions by seed-only edits","project":"dymad_dev","agentId":"work-session-mo0w5t0f"}'`
  - `{"ok":true,"claim":{"claimId":"411292e0d16e8019",...}}`

Changes made:
- Updated `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md` with a new `## Execution findings (2026-04-15, Family 2 exploratory sweep)` section documenting exact fail-fast outputs and next-step strategy.
- Updated `projects/dymad_dev/TASKS.md` to remove the temporary `[in-progress]` marker and add a note pointing to the new fail-fast evidence.
- Restored exploratory test-file edits in `modules/dymad_dev/tests/test_slow_ker_*.py` and `tests/test_slow_kp_*.py`; no runtime thresholds, baselines, or regression utilities were modified.

Verification:
- `cd modules/dymad_dev && pytest -q --reruns 0 -o log_cli=false tests/test_slow_ker_lti_cli.py`
  - `FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`
  - `FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[dkm_ln]`
- `cd modules/dymad_dev && pytest -q -o log_cli=false -x tests/test_slow_ker_lti_cli.py tests/test_slow_ker_lco_cli.py tests/test_slow_ker_s1_cli.py tests/test_slow_ker_s1u_cli.py tests/test_slow_kp_train_cli.py tests/test_slow_kp_sweep_dt_cli.py tests/test_slow_kp_sweep_ct_cli.py tests/test_slow_kp_sa_cli.py > /tmp/dymad_family2_failfast.log 2>&1`
  - `/tmp/dymad_family2_failfast.log`: `FAILED tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]`
  - assertion excerpt: `assert 0.017551757928779117 <= 0.00233733233805354`

Compound (fast): no actions.

Session-type: autonomous
Duration: 78
Task-selected: Stabilize kernel and Koopman slow regressions by seed-only edits
Task-completed: partial
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-15 (Completed slow-regression seed-entry inventory task)

Ran `/orient dymad_dev`, selected the highest-leverage zero-resource unblocker in this project (`Inventory seed-controlled slow and extra_slow regression tests`), and completed it by making the seed controls explicit in the stabilization plan.

Scope classification (Step 3): `ROUTINE` / `consumes_resources: false` (no LLM API calls, no external API calls, no GPU compute, no long-running compute).

Changes made:
- Added a new `## Seed-entry inventory (2026-04-15 verification)` section to `projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md` documenting:
  - shared seed control patterns (`TEST_SEED`, CLI `--seed`, NumPy/Torch seeding, `module.set_seed` where present),
  - family-level target-file coverage,
  - explicit `extra_slow` marker locations.
- Marked the inventory task complete in `projects/dymad_dev/TASKS.md`.

Verification:
- `cd modules/dymad_dev && rg -n --no-heading "@pytest\\.mark\\.extra_slow|def test_lti_cli_training_regression_extra_slow" tests/test_slow_lti_cli.py tests/test_slow_vortex_cli.py`
  - `tests/test_slow_vortex_cli.py:16:@pytest.mark.extra_slow`
  - `tests/test_slow_lti_cli.py:344:@pytest.mark.extra_slow`
  - `tests/test_slow_lti_cli.py:346:def test_lti_cli_training_regression_extra_slow(`
- `cd modules/dymad_dev && rg -n --no-heading "TEST_SEED|--seed|np\\.random\\.seed|torch\\.manual_seed|module\\.set_seed" tests/test_slow_lti_cli.py tests/test_slow_kp_sa_cli.py tests/test_slow_vortex_cli.py`
  - `tests/test_slow_lti_cli.py:23:TEST_SEED = 12345`
  - `tests/test_slow_lti_cli.py:156:    np.random.seed(TEST_SEED)`
  - `tests/test_slow_lti_cli.py:157:    torch.manual_seed(TEST_SEED)`
  - `tests/test_slow_lti_cli.py:198:            "--seed",`
  - `tests/test_slow_kp_sa_cli.py:145:    module.set_seed(TEST_SEED)`
- `rg -n --no-heading '## Seed-entry inventory|Do not change metric thresholds|Do not change baseline JSON files|Do not change the asserted error criteria|Do not change \`slow_regression_utils.py\`' projects/dymad_dev/plans/2026-04-15-slow-test-seed-stabilization.md`
  - `22:- Do not change metric thresholds.`
  - `23:- Do not change \`slow_regression_utils.py\`.`
  - `24:- Do not change baseline JSON files.`
  - `25:- Do not change the asserted error criteria.`
  - `64:## Seed-entry inventory (2026-04-15 verification)`

Session-type: autonomous
Duration: 23
Task-selected: Inventory seed-controlled slow and extra_slow regression tests
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-15 (Added seed-only stabilization task series for slow regressions)

Added a second workstream to this project for stabilizing DyMAD's `slow` and `extra_slow` pytest regressions by changing only random seeds. The key finding that shaped the task decomposition is that many `test_slow_*` files already expose deterministic controls through `TEST_SEED`, explicit NumPy / Torch seeding, and CLI `--seed` arguments, so the intended fix surface is local seed values rather than regression thresholds or baseline JSONs.

Recorded a dedicated plan and decomposed the work into family-level execution tasks plus a final scope-audit task. The new plan explicitly keeps `modules/dymad_dev/tests/slow_regression_utils.py`, baseline JSON stores, and all existing error criteria out of scope.

Verification:
- `sed -n '1,260p' modules/dymad_dev/tests/slow_regression_utils.py`
  - shows threshold logic lives in `SAFETY_FACTOR`, `ABS_TOLERANCES`, and `compare_record_metrics(...)`
- `sed -n '1,140p' modules/dymad_dev/pyproject.toml`
  - shows both `slow` and `extra_slow` pytest markers are registered
- `rg -n "seed|random|rng|default_rng|manual_seed" modules/dymad_dev/tests/test_slow_* modules/dymad_dev/scripts -g '!*.ipynb'`
  - confirms many slow tests already seed NumPy/Torch and pass CLI `--seed` args

Sources: `modules/dymad_dev/tests/slow_regression_utils.py`, `modules/dymad_dev/pyproject.toml`, `modules/dymad_dev/tests/test_slow_*.py`

### 2026-04-15 (Committed to user-facing denoising phase exposure)

Resolved the remaining boundary question for this project: denoising should be a user-requestable training phase rather than an internal runtime-only hook. That means the project now explicitly includes the user-facing contract work needed to let denoising be requested in staged training flows alongside linear-solve and optimizer phases.

Updated the project task inventory and plan accordingly. The old "decide whether to expose denoising" task was replaced with an execution task to wire denoising through the appropriate registry/compiler/user-facing path, while keeping the runtime implementation in `src/dymad/training/*` aligned with the supported boundary.

Sources: `projects/dymad_dev/TASKS.md`, `projects/dymad_dev/plans/2026-04-15-noise-and-denoise-pipeline.md`

### 2026-04-15 (Reviewed updated DyMAD agent-facing docs)

Reviewed the updated DyMAD development docs in `modules/dymad_dev/AGENTS.md`, `modules/dymad_dev/docs/architecture.md`, `modules/dymad_dev/docs/feature-placement.md`, and `modules/dymad_dev/skills/dymad-train-eval-workflow/SKILL.md` against this project's task list. The main new constraint is architectural rather than algorithmic: the docs now make an explicit boundary between runtime changes in `src/dymad/training/*` / related implementation packages and user-facing exposure in `src/dymad/agent/*`.

The existing runtime tasks still fit, but the project had been missing one explicit decision task: whether the new denoising phase should remain runtime-only or also be surfaced through the user-mode registry/compiler path. Updated `projects/dymad_dev/TASKS.md` and the project plan to capture that boundary decision, plus notes pointing future implementation work at the documented test surfaces for training-phase and user-facing changes.

Verification:
- `sed -n '1,260p' modules/dymad_dev/AGENTS.md`
  - confirms the new "read architecture + feature-placement first" rule and the `make lint` / `make typecheck` closeout requirement for Python edits
- `sed -n '1,260p' modules/dymad_dev/docs/architecture.md`
  - documents the package map and the split between runtime packages and `src/dymad/agent/*`
- `sed -n '1,260p' modules/dymad_dev/docs/feature-placement.md`
  - explicitly routes training phase kinds to `src/dymad/training/*`, with compiler/registry updates only when the user-facing boundary changes

Sources: `modules/dymad_dev/AGENTS.md`, `modules/dymad_dev/docs/architecture.md`, `modules/dymad_dev/docs/feature-placement.md`, `modules/dymad_dev/skills/dymad-train-eval-workflow/SKILL.md`

### 2026-04-15 (Scaffolded noise and denoising workstream)

Created the durable project scaffold around the existing `modules/dymad_dev/` module and recorded the initial implementation seams for the requested work. `modules/dymad_dev/src/dymad/utils/sampling.py` already supports config-driven `control`, `x0`, and `p` sampling, so a parallel `noise` config can follow an established pattern. `modules/dymad_dev/src/dymad/training/phases.py` already normalizes explicit `type: data` phases, but its current `ContextDataPhase` only reports dataset sizes and does not transform data before later phases consume it.

Added a focused task list, a concrete implementation plan, and a planned benchmark record for comparing clean, noisy, and denoised trajectories. The initial project assumption is to target regular, non-graph datasets first, because that path already exercises both trajectory sampling and downstream optimizer phases without graph-specific batching complexity.

Verification:
- `sed -n '1,220p' modules/registry.yaml`
  - shows `project: dymad_dev`, `module: dymad_dev`, `path: modules/dymad_dev`
- `test -d projects/dymad_dev && echo exists || echo missing`
  - `exists`
- `rg -n "TrajectorySampler|ContextDataPhase|AUTO_APPENDED_PHASES" modules/dymad_dev/src/dymad/utils/sampling.py modules/dymad_dev/src/dymad/training/phases.py modules/dymad_dev/src/dymad/agent/registry/training_schema.py`
  - confirms the existing sampler entry point, current no-op data phase implementation, and auto-appended terminal phases

Sources: `modules/registry.yaml`, `modules/dymad_dev/src/dymad/utils/sampling.py`, `modules/dymad_dev/src/dymad/training/phases.py`, `modules/dymad_dev/src/dymad/agent/registry/training_schema.py`

## Open questions

- Should v1 noise injection target observations only, or should the config support independent noise on state, control, and observation channels?
- Should the denoising phase run before or after existing normalization / transform steps in the regular trajectory pipeline?
- Should user-facing denoising reuse the existing `type: data` phase shape directly, or does it need additional registry/compiler metadata beyond the current phase schema examples?
- Is regular-dataset support sufficient for the first benchmark, or is graph / ragged-series support also required in scope?
- Are there any slow-regression cases whose flakiness is not actually seed-fixable, and would therefore need to be excluded from the seed-only task stream rather than silently broaden scope?
- After wiring runtime worker controls (including `dataloader.num_workers`) and re-running deterministic-profile validation, does `tests/test_slow_ker_lti_cli.py::test_ker_lti_cli[km_ln]` become stable enough to avoid harness redesign?
