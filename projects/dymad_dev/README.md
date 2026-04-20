# DyMAD Development

Status: active
Mission: Extend DyMAD with bounded, verifiable feature slices and record the design, implementation, and verification findings needed to support the next DyMAD development steps.  Use code review during the development.
Done when: each user-requested DyMAD feature slice tracked in this project is either implemented with verification artifacts or explicitly deferred with documented findings, and the project records the current baseline, completed work, and remaining open questions.

## Context

This project now tracks sequential DyMAD feature-development slices under a single `dymad_dev` workspace, per user direction.

Feature 1 is complete: the observation-noise sampler in `modules/dymad_dev/src/dymad/utils/sampling.py` now supports four additive `noise.kind` values (`gaussian`, `uniform`, `laplace`, `student_t`) while preserving the existing `{kind, params}` config contract and the observation-only corruption path.

Feature 2 is the next active slice: extend DyMAD's current single-split CV workflow with a Nelder-Mead-like optimizer so CV can search hyperparameters automatically instead of requiring exhaustive `param_grid` enumeration. The current intent is to keep the present single-split structure rather than implement k-fold CV in this slice.

The current CV baseline is narrow and explicit. `SingleSplitDriver` in `modules/dymad_dev/src/dymad/training/driver.py` yields exactly one fold, the user-mode registry advertises the CV workflow as `"single_split_param_sweep"`, and the compiler/registry currently only expose `cv.param_grid` plus optional `cv.metric`.

## Log

### 2026-04-20 (Integrated isolated task `Implement a Nelder-Mead-like optimizer path for single-split CV [skill: execute] [requires-frontier]`)

Integrated isolated task `Implement a Nelder-Mead-like optimizer path for single-split CV [skill: execute] [requires-frontier]` after 2 review round(s).

Session-type: autonomous
Duration: 22
Task-selected: Implement a Nelder-Mead-like optimizer path for single-split CV [skill: execute] [requires-frontier]
Task-completed: yes
Approvals-created: 0
Files-changed: 1
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-20 (Integrated isolated task `Design the single-split Nelder-Mead-like CV interface and selection rules [skill: multi] [requires-frontier]`)

Integrated isolated task `Design the single-split Nelder-Mead-like CV interface and selection rules [skill: multi] [requires-frontier]` after 1 review round(s).

Session-type: autonomous
Duration: 7
Task-selected: Design the single-split Nelder-Mead-like CV interface and selection rules [skill: multi] [requires-frontier]
Task-completed: yes
Approvals-created: 0
Files-changed: 1
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-20 — Reframed `dymad_dev` around sequential DyMAD feature slices

Per user instruction, rewrote the project records so `dymad_dev` continues past the completed noise-sampler work and now tracks the second requested DyMAD feature: a Nelder-Mead-like optimizer for CV. Recorded the present CV baseline before implementation planning: `DriverBase.train(...)` currently evaluates either a single default combo or the full Cartesian product from `cv.param_grid`, `SingleSplitDriver` remains the active one-fold runtime, and `KFoldDriver` still exists only as an unimplemented stub.

Also recorded the current interface constraint that the agent-facing CV schema only documents `param_grid` and `metric`, with notes stating that the workflow is the existing single-split sweep rather than true k-fold cross-validation. This establishes the baseline the optimizer feature must extend or revise.

Sources: `modules/dymad_dev/src/dymad/training/driver.py`, `modules/dymad_dev/src/dymad/training/helper.py`, `modules/dymad_dev/src/dymad/agent/registry/training_schema.py`, `modules/dymad_dev/tests/test_agent_registry.py`

### 2026-04-20 — Extended observation-noise sampler with `laplace` and `student_t`

Completed the first active feature slice by adding two config-driven additive noise kinds to the runtime sampler map (`laplace`, `student_t`) while preserving the existing `noise: {kind, params}` contract and observation-only corruption path. Extended regression coverage so the reproducibility and latent-state invariants are now verified for all four kinds (`gaussian`, `uniform`, `laplace`, `student_t`).

Execution notes:
- Task-selected: `Extend NOISE_MAP with additional config-driven noise kinds`
- Scope classification (SOP Step 3): `STRUCTURAL (verifiable)`, `consumes_resources: false` (no LLM/API/GPU/long-running compute used)
- Task-claim API attempt failed (service unavailable), so execution proceeded without claim per SOP fallback.

Verification:
- `cd modules/dymad_dev && PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src pytest -q tests/test_workflow_sample.py -k observation_noise`
  - `6 passed, 7 deselected, 2 warnings`
- `cd modules/dymad_dev && PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src pytest -q tests/test_workflow_sample.py`
  - `13 passed, 2 warnings`

Session-type: autonomous
Duration: 28 minutes
Task-selected: Extend `NOISE_MAP` with additional config-driven noise kinds
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 3
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-20 — Recorded local import-path verification for module tests

During noise-sampler implementation, verified that running tests from `modules/dymad_dev` without a `src`-rooted `PYTHONPATH` can resolve `dymad` from an external checkout (`/Users/daninghuang/Repos/dymad-dev`) instead of this workspace module. For local verification commands in this project, use `PYTHONPATH=/Users/daninghuang/Repos/openakari-codex/modules/dymad_dev/src` so test results reflect the code being edited.

Verification:
- `cd modules/dymad_dev && python - <<'PY' ... import dymad.utils.sampling as s; print(s.__file__); print(list(s.NOISE_MAP)) ... PY`
  - `sampling file /Users/daninghuang/Repos/dymad-dev/src/dymad/utils/sampling.py`
  - `map ['gaussian', 'uniform']`

### 2026-04-20 — Confirmed local DyMAD baseline is current

Updated the project baseline after the user confirmed the `dymad_dev` repo is up to date. Verified that the local `modules/dymad_dev/` checkout now contains the same observation-noise implementation and test surface the project was planning against, so the baseline-confirmation step is resolved and the remaining work can focus directly on adding new `noise.kind` variants.

Verification:
- `rg -n "NOISE_MAP|gaussian_noise|uniform_noise|_apply_observation_noise|test_observation_noise" modules/dymad_dev/src/dymad/utils/sampling.py modules/dymad_dev/tests/test_workflow_sample.py`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:407:def gaussian_noise(`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:426:def uniform_noise(`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:443:NOISE_MAP = {`
  - `modules/dymad_dev/src/dymad/utils/sampling.py:622:    def _apply_observation_noise(self, y_grid: Array, traj_idx: int) -> Array:`
  - `modules/dymad_dev/tests/test_workflow_sample.py:141:def test_observation_noise_sampler_is_reproducible_and_leaves_latent_state_clean(noise_cfg):`

Sources: `modules/dymad_dev/src/dymad/utils/sampling.py`, `modules/dymad_dev/tests/test_workflow_sample.py`

### 2026-04-20 — Re-scaffolded project for noise sampler extensions

Project initiated via `/project scaffold` at user request. Recorded the DyMAD noise-sampler baseline: `NOISE_MAP` exposes `gaussian` and `uniform`, `TrajectorySampler._apply_observation_noise(...)` applies noise to observations only, and tests already verify reproducibility plus saved noisy observations.

Sources: `modules/registry.yaml`

## Open questions

- What config shape should represent optimizer-driven CV while preserving backward compatibility for existing `cv.param_grid` callers?
- Should optimizer-based CV preserve the current `.npz` and `cv_results.png` artifact contract, or add explicit optimization-history artifacts for simplex trajectories and restart decisions?
- Should the optimizer support bounded/log-domain parameter transforms in v1 so positive-only hyperparameters can be searched without invalid proposals?
- Should the current CV docs enumerate both supported selection modes once optimizer-based CV is added, or should the optimizer remain an internal runtime option until examples and agent schema support are ready?
