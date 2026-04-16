# DyMAD Development

Status: active
Mission: Extend DyMAD's data pipeline so trajectories can include config-driven synthetic noise, training can optionally denoise datasets before optimization, and the resulting filter can be evaluated against a clean reference.
Done when: `modules/dymad_dev` supports a config-driven noise sampler, a denoising data phase that passes transformed datasets to later training phases, and user-facing training workflows can request that denoising phase; `projects/dymad_dev/experiments/noise-denoise-benchmark-v1/EXPERIMENT.md` is then completed with direct and downstream effectiveness metrics.

## Context

`modules/dymad_dev/` is already a registered execution module in `modules/registry.yaml`, but `projects/dymad_dev/` had no durable project record yet.

The immediate scope is two linked workstreams. First, extend trajectory generation so noise can be configured in parallel with the existing `control`, `x0`, and `p` samplers. Second, turn the existing training `data` phase hook into a real dataset-transform phase that can denoise trajectories, with Savitzky-Golay filtering as the initial target.

This project is framed as both implementation and measurement work. The code changes matter because they enable controlled noise injection and denoising; the knowledge output is whether denoising measurably improves signal fidelity and downstream training quality on regular trajectory datasets.

## Log

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
