# Multi-Fidelity GP Correction

Status: active
Priority: medium
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

### 2026-03-25 — Synthetic benchmark artifacts generated

Claimed and completed the task “Generate the synthetic benchmark and data splits” (highest-priority unblocker for model implementation and evaluation).

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"274ecfc09a6682c3","taskId":"f2c9bf1efde7","taskText":"Generate the synthetic benchmark and data splits","project":"multi_fidelity_gp","agentId":"work-session-mn6cmspz","claimedAt":1774461744374,"expiresAt":1774464444374}}`

Changes:
- Added `projects/multi_fidelity_gp/experiments/synthetic-benchmark/` with function spec, reproducible generator, CSV splits, and a plot of `f(x)` vs `f_LF(x)`.

Verification:
- `python projects/multi_fidelity_gp/experiments/synthetic-benchmark/generate.py` ->
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/synthetic-benchmark/data/high_fidelity_train.csv`
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/synthetic-benchmark/data/high_fidelity_test.csv`
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/synthetic-benchmark/plots/functions.svg`

Compound (fast): no actions.

Session-type: autonomous
Duration: 10
Task-selected: Generate the synthetic benchmark and data splits
Task-completed: yes
Approvals-created: 0
Files-changed: 8
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

Sources: none (synthetic benchmark)

### 2026-03-25 — Residual GP correction model implemented

Claimed and completed the task “Implement the residual GP correction model” (central unblocker for running the model comparison benchmark).

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"ddc742cbe2f3c213","taskId":"1efa48ed8475","taskText":"Implement the residual GP correction model","project":"multi_fidelity_gp","agentId":"work-session-mn6cvttb","claimedAt":1774462158854,"expiresAt":1774464858854}}`

Changes:
- Added `projects/multi_fidelity_gp/experiments/residual-gp/` with a NumPy-only 1D GP regressor (RBF + Cholesky) and wrappers for low-fidelity-only, high-fidelity GP, and residual-GP correction prediction (mean + std).
- Marked the task complete in `projects/multi_fidelity_gp/TASKS.md` with evidence + verification command.

Verification:
- `python projects/multi_fidelity_gp/experiments/residual-gp/demo.py` ->
  - `Residual-GP demo (synthetic benchmark)`
  - `- Train points: 12, test points: 80`
  - `- Low-fidelity-only RMSE: 0.486761`
  - `- High-fidelity-only GP RMSE: 0.030922`
  - `- Residual correction GP RMSE: 0.050056`

Session-type: autonomous
Duration: n/a
Task-selected: Implement the residual GP correction model
Task-completed: yes
Approvals-created: 0
Files-changed: 6
Commits: 1
Compound-actions: not run
Resources-consumed: none
Budget-remaining: n/a

Sources: none (model implementation)

### 2026-03-25 — Holdout accuracy + uncertainty evaluation

Claimed and completed the task “Evaluate accuracy and uncertainty on holdout high-fidelity data” (first end-to-end benchmark readout with both accuracy and uncertainty metrics).

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"2e2adace762f222e","taskId":"5fae0ee201aa","taskText":"Evaluate accuracy and uncertainty on holdout high-fidelity data","project":"multi_fidelity_gp","agentId":"work-session-mn6d4iqb","claimedAt":1774462601417,"expiresAt":1774465301417}}`

Changes:
- Added `projects/multi_fidelity_gp/experiments/holdout-eval/` with a reproducible evaluation script plus `results.md` / `results.json`.
- Marked the comparison baselines + holdout evaluation tasks complete in `projects/multi_fidelity_gp/TASKS.md` (they were already implemented / executed as part of the benchmark).
- Updated `projects/multi_fidelity_gp/plans/2026-03-25-initial-benchmark.md` status to reflect completed phases.

Verification:
- `python projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py` ->
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.md`
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.json`

Findings (see `projects/multi_fidelity_gp/experiments/holdout-eval/results.md`):
- RMSE: low-fidelity `0.486761`, high-fidelity GP `0.030922`, residual correction `0.050056`
- 95% interval coverage: low-fidelity `0.000000` (deterministic), high-fidelity GP `0.025000`, residual correction `0.037500`
- Residual correction preferred under the initial rule (RMSE + coverage vs HF GP): no

Session-type: autonomous
Duration: 10
Task-selected: Evaluate accuracy and uncertainty on holdout high-fidelity data
Task-completed: yes
Approvals-created: 0
Files-changed: 7
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

Sources: none (evaluation)

### 2026-03-25 — Hyperparameter selection improved for calibrated uncertainty

Claimed and completed the task “Improve GP hyperparameter selection for calibrated uncertainty” (addressing severe uncertainty undercoverage from the heuristic hyperparameters in the initial holdout evaluation).

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"3f3e9f0ed9907808","taskId":"255d402990b2","taskText":"Improve GP hyperparameter selection for calibrated uncertainty","project":"multi_fidelity_gp","agentId":"work-session-mn6eryly","claimedAt":1774465319400,"expiresAt":1774468019400}}`

Changes:
- Updated `projects/multi_fidelity_gp/experiments/residual-gp/gp.py` to support GP hyperparameter selection via log marginal likelihood grid search (`hyperparam_selection="lml_grid"`) and optionally include fitted observation noise in predictive std (`include_noise=True`).
- Updated `projects/multi_fidelity_gp/experiments/residual-gp/models.py` to use the LML-grid selection by default and report observation uncertainty for probabilistic metrics.
- Re-ran holdout evaluation and updated `projects/multi_fidelity_gp/experiments/holdout-eval/results.md` / `results.json` + EXPERIMENT findings.
- Marked the task complete in `projects/multi_fidelity_gp/TASKS.md` and added follow-up tasks to separate latent vs observation uncertainty metrics.

Verification:
- `python projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py` ->
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.md`
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.json`
- `python projects/multi_fidelity_gp/experiments/residual-gp/demo.py` ->
  - `Residual-GP demo (synthetic benchmark)`
  - `- Train points: 12, test points: 80`
  - `- Low-fidelity-only RMSE: 0.486761`
  - `- High-fidelity-only GP RMSE: 0.002392`
  - `- Residual correction GP RMSE: 0.004678`

Findings (see `projects/multi_fidelity_gp/experiments/holdout-eval/results.md`):
- RMSE: low-fidelity `0.486761`, high-fidelity GP `0.002392`, residual correction `0.004678`
- 95% interval coverage: low-fidelity `0.000000` (deterministic), high-fidelity GP `1.000000`, residual correction `1.000000`

Compound (fast): 1 action — added two follow-up tasks about latent vs observation uncertainty definitions/metrics.

Session-type: autonomous
Duration: n/a
Task-selected: Improve GP hyperparameter selection for calibrated uncertainty
Task-completed: yes
Approvals-created: 0
Files-changed: 10
Commits: 2
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

Sources: none (hyperparameter selection + re-eval)

### 2026-03-25 — Latent vs observation uncertainty reported in holdout eval

Claimed and completed the task “Report latent vs observation uncertainty metrics in holdout evaluation” (clarifying uncertainty definitions after coverage saturated at 1.0 with `include_noise=True`).

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"51abc66e5e79c00e","taskId":"1588ce1e175a","taskText":"Report latent vs observation uncertainty metrics in holdout evaluation","project":"multi_fidelity_gp","agentId":"work-session-mn6f28a0","claimedAt":1774465771435,"expiresAt":1774468471435}}`

Changes:
- Updated `projects/multi_fidelity_gp/experiments/residual-gp/models.py` to expose both `predict_latent()` and `predict_observation()` for GP-based models (with `predict()` continuing to return observation uncertainty).
- Updated `projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py` to emit separate latent vs observation NLL/coverage/width tables, and updated `results.md` / `results.json` accordingly.
- Updated `projects/multi_fidelity_gp/experiments/holdout-eval/EXPERIMENT.md` to reflect the new reporting.

Verification:
- `python projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py` ->
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.md`
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.json`

Compound (fast): 1 action — added a follow-up task to report multi-level interval calibration metrics.
Fleet: no recent sessions found.

Session-type: autonomous
Duration: n/a
Task-selected: Report latent vs observation uncertainty metrics in holdout evaluation
Task-completed: yes
Approvals-created: 0
Files-changed: 7
Commits: 2
Compound-actions: 1
Resources-consumed: none
Budget-remaining: n/a

Sources: none (latent vs observation uncertainty reporting)

### 2026-03-25 — Multi-level interval calibration metrics added

Claimed and completed the task “Add multi-level calibration metrics for the GP models” (adding additional coverage/width levels to make over/under-dispersion easier to diagnose on small test sets).

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"2718da7704d923aa","taskId":"7833fa1724d9","taskText":"Add multi-level calibration metrics for the GP models","project":"multi_fidelity_gp","agentId":"work-session-mn6faz4j","claimedAt":1774466212872,"expiresAt":1774468912872}}`

Changes:
- Updated `projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py` to report 68% + 95% interval coverage/width for both latent and observation predictive distributions.
- Re-ran evaluation, updating `projects/multi_fidelity_gp/experiments/holdout-eval/results.md` and `projects/multi_fidelity_gp/experiments/holdout-eval/results.json`, and updated `projects/multi_fidelity_gp/experiments/holdout-eval/EXPERIMENT.md`.
- Marked the task complete in `projects/multi_fidelity_gp/TASKS.md`.

Verification:
- `python projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py` ->
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.md`
  - `Wrote /Users/daninghuang/Repos/openakari-codex/projects/multi_fidelity_gp/experiments/holdout-eval/results.json`

Findings (see `projects/multi_fidelity_gp/experiments/holdout-eval/results.md`):
- 68% coverage (latent): high-fidelity GP `1.000000`, residual correction `0.987500`
- 68% coverage (observation): high-fidelity GP `1.000000`, residual correction `0.987500`
- 95% coverage: still saturated at `1.000000` for both GP models (latent + observation), suggesting the current uncertainty is conservative relative to nominal 95% intervals under this synthetic setup.

Compound (fast): 2 actions — added `Priority: medium` to `projects/multi_fidelity_gp/README.md`; added a follow-up task for PIT/standardized residual diagnostics.
Fleet: no recent sessions found.

Session-type: autonomous
Duration: n/a
Task-selected: Add multi-level calibration metrics for the GP models
Task-completed: yes
Approvals-created: 0
Files-changed: 6
Commits: 2
Compound-actions: 2
Resources-consumed: none
Budget-remaining: n/a

Sources: none (multi-level calibration metrics)

## Open questions

- Holdout evaluation now shows 95% interval coverage = 1.0 for both GP-based models after LML grid hyperparameters + `include_noise=True`. Should uncertainty be reported separately for latent vs observation uncertainty, and should hyperparameters be selected with an explicit calibration target (coverage closer to 0.95) rather than marginal likelihood alone?

- Should the project treat `f_LF(x)` strictly as a fixed mean function, or also compare against more general multi-fidelity GP constructions such as autoregressive co-kriging?
- How sensitive are the findings to the amount and placement of high-fidelity training data?
- Which uncertainty metric is most decision-relevant for this benchmark: interval coverage, negative log likelihood, or sharpness at matched coverage?
- Was the initial severe undercoverage (≪95%) primarily a hyperparameter-selection issue, a modeling/metric mismatch (latent vs observation uncertainty), or both? After switching to LML-grid hyperparameters + `include_noise=True`, coverage jumped to 1.0, suggesting the uncertainty definition/target may still be mis-specified.
