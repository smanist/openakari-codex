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

## Open questions

- Should the project treat `f_LF(x)` strictly as a fixed mean function, or also compare against more general multi-fidelity GP constructions such as autoregressive co-kriging?
- How sensitive are the findings to the amount and placement of high-fidelity training data?
- Which uncertainty metric is most decision-relevant for this benchmark: interval coverage, negative log likelihood, or sharpness at matched coverage?
- Is the severe undercoverage (≪95%) in the initial GP uncertainty metrics primarily a hyperparameter-selection issue (e.g., length scale too large) or a modeling/metric mismatch (latent vs predictive variance)?
