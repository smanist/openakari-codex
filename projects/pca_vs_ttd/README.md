# Data Compression Benchmark

Status: active
Mission: Evaluate the compression rate versus recovery accuracy trade-off in two typical dimension reduction algorithms: Principle Component Analysis (PCA), and Tensor Train Decomposition (TTD).
Done when: Published benchmark with compression rate and accuracy comparison for the two algorithms, benchmark on a synthesized grayscale video-like data (so the raw data is three-dimensional), demonstrated trade-off in compression rate and accuracy against hyperparameters in the algorithms, and a recommended evaluation protocol.

## Context

PCA has received success in dimension reduction of structured data.  However, for data arrays of more than two dimensions, PCA would cast them into two dimensions and perform the compression.  Leveraging the multiple dimensions, such as in TTD, it may be possible to achieve higher compression rate at the same level of recovery accuracy.  This project compares PCA and TTD in the dimension reduction of video-like data array.

The goal is to answer: how much improvement in data compression can TTD achieve when compared to PCA, and what are the trade off of such improvement?

## Log

### 2026-03-25 (Unequal-rank TTD sweep v2)

Claimed and completed the task “(Optional) Expand the TTD sweep beyond equal ranks” by adding a v2 trade-off sweep record that includes unequal TT rank pairs and regenerates the trade-off overlay plots.

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"a36cb0e856555dca","taskId":"83aeecdf22f2","taskText":"(Optional) Expand the TTD sweep beyond equal ranks","project":"pca_vs_ttd","agentId":"work-session-mn5h5wfv","claimedAt":1774408815722,"expiresAt":1774411515722}}`

Outputs:
- Experiment record + sweep artifacts: `projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/`
- Updated report citations: `projects/pca_vs_ttd/benchmark_report.md`

Verification:
- `/usr/bin/time -p python projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/run_sweep.py --overwrite` →
  - `Wrote: /Users/daninghuang/Repos/openakari-codex/projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/results/sweep_summary.csv`
  - `real 1.34`
  - `user 1.02`
  - `sys 0.21`

Compound (fast): no actions. (Fleet spot-check: no `"triggerSource":"fleet"` entries in the last 500 lines of `.scheduler/metrics/sessions.jsonl`.)

Session-type: autonomous
Duration: 10
Task-selected: (Optional) Expand the TTD sweep beyond equal ranks
Task-completed: yes
Approvals-created: 0
Files-changed: 22
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: llm_api_calls 0/0, cpu_hours 0.1/0.1 (ledger empty)

### 2026-03-25 (Benchmark report v1: recommendation + non-draft)

Claimed and completed the task “Finalize the benchmark report narrative and recommendation” by updating `projects/pca_vs_ttd/benchmark_report.md` to a non-draft status (`Status: v1`) and adding a “Recommendation (comparison rule)” section that explicitly covers:
- full trade-off curve overlay (plots)
- matched-compression slices (primary comparison rule)
- matched-quality slices (secondary view)

Task claim (scheduler control API):
- `curl -s -X POST http://127.0.0.1:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"db9e24213781fd05","taskId":"1b9ea76c2a46","taskText":"Finalize the benchmark report narrative and recommendation","project":"pca_vs_ttd","agentId":"work-session-mn5gvuxp","claimedAt":1774408547221,"expiresAt":1774411247221}}`

Verification:
- `rg -n "^Status:" projects/pca_vs_ttd/benchmark_report.md` → `3:Status: v1`
- `rg -n "^## Recommendation" projects/pca_vs_ttd/benchmark_report.md` → `79:## Recommendation (comparison rule)`

Compound (fast): no actions.

Session-type: autonomous
Duration: 10
Task-selected: Finalize the benchmark report narrative and recommendation
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: llm_api_calls 0/0, cpu_hours 0.1/0.1 (ledger empty)

### 2026-03-25 (Hyperparameter trade-off sweep v1)

Claimed and completed the mission-gap task “Run a hyperparameter trade-off study for PCA and TTD” by running a first sweep (PCA `k ∈ {0,1,2,4,8,16}`; TTD `r1=r2 ∈ {4,8,12,16,23}`) and generating the standard curve artifacts under `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/`.

Task claim (scheduler control API):
- `curl -s -X POST http://localhost:8420/api/tasks/claim ...` → `{"ok":true,"claim":{"claimId":"a3ebb616deb017c2","taskId":"8a7348da40c8","taskText":"Run a hyperparameter trade-off study for PCA and TTD","project":"pca_vs_ttd","agentId":"work-session-mn5ggyu1","claimedAt":1774407773329,"expiresAt":1774410473329}}`

Verification:
- `python projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/run_sweep.py --overwrite` → wrote `.../results/sweep_summary.csv` and plots.

Notes:
- Extended `projects/pca_vs_ttd/experiments/pca-baseline/run_pca.py` to support `k=0` so the sweep can include the “mean-only” extreme point.
- Summary CSV + plots: `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/results/`.

Session-type: autonomous
Duration: 10
Task-selected: Run a hyperparameter trade-off study for PCA and TTD
Task-completed: yes
Approvals-created: 0
Files-changed: 20
Files-changed: 22
Commits: 3
Compound-actions: 3
Resources-consumed: none
Budget-remaining: llm_api_calls 0/0, cpu_hours 0.1/0.1 (ledger empty)

### 2026-03-25 (Benchmark report artifact v0)

Claimed and completed the mission-gap task “Write the benchmark report artifact” and recorded a draft report that consolidates dataset + protocol + baseline results: `projects/pca_vs_ttd/benchmark_report.md`. Marked the task as complete in `projects/pca_vs_ttd/TASKS.md`.

Task claim (per SOP) succeeded via scheduler control API (HTTP 200).

Session-type: autonomous
Duration: 8
Task-selected: Write the benchmark report artifact
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: llm_api_calls 0/0, cpu_hours 0.1/0.1 (ledger empty)

### 2026-03-25 (Evaluation protocol + ledger scaffold)

Completed the mission-gap task to define a standard evaluation protocol (metrics + reporting format) for the PCA vs TTD benchmark: `projects/pca_vs_ttd/evaluation_protocol.md`.

Also added an empty `projects/pca_vs_ttd/ledger.yaml` (`entries: []`). The project has a `budget.yaml` but previously lacked a ledger file, which caused scheduler verification to report `ledgerConsistent: false` for prior pca-v-ttd sessions.

To support the project’s `cpu_hours` budget (a float limit), fixed `infra/budget-verify/budget-status.py` to preserve decimals for `ledger_total` and `remaining` (previously truncated via `int(...)`) and added a regression test.

Verification:
- `python infra/budget-verify/budget-status.py projects/pca_vs_ttd/` → `Remaining:         0.1 hours`
- `pytest -q infra/budget-verify/test_budget_status.py` → `20 passed in 0.06s`

Task claiming attempt (per SOP) could not be executed because the scheduler control API was not reachable (`curl: (7) Failed to connect to localhost port 8420 ...: Couldn't connect to server`).

Session-type: autonomous
Duration: 10
Task-selected: Define and document the evaluation protocol (metrics + reporting format)
Task-completed: yes
Approvals-created: 0
Files-changed: 6
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: llm_api_calls 0/0, cpu_hours 0.1/0.1 (ledger empty)

### 2026-03-25 (PCA vs TTD baseline comparison + sweep scope)

Compared the existing PCA (`k=8`) and TTD (`ranks=(8,8)`) baseline results on the synthetic dataset and wrote a short note proposing the initial hyperparameter sweep scope for the trade-off study: `projects/pca_vs_ttd/baseline_comparison.md`.

Task claiming attempt (per SOP) could not be executed because the scheduler control API was not reachable (`curl: (7) Failed to connect to localhost port 8420 ...: Connection refused`).

Session-type: autonomous
Duration: 10
Task-selected: Compare the compression rate and reconstruction accuracy from PCA and TTD
Task-completed: yes
Approvals-created: 0
Files-changed: 3
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: cpu_hours unknown/0.1 (no ledger.yaml)

### 2026-03-25 (TTD baseline implementation)

Implemented a Tensor-Train Decomposition (TTD) baseline via TT-SVD on the synthetic dataset and recorded the compression vs reconstruction metrics under `projects/pca_vs_ttd/experiments/ttd-baseline/`.

Baseline (ranks=(8,8)) metrics from `projects/pca_vs_ttd/experiments/ttd-baseline/results/ttd_baseline_r8_8.json`: compression ratio ≈ 26.95×, relative Frobenius reconstruction error ≈ 0.0447, and PSNR ≈ 36.20 dB.

Task claiming attempt (per SOP) could not be executed because the scheduler control API was not reachable in this environment (`curl` to `http://localhost:8420/api/tasks/claim` failed: `curl: (7) Failed to connect to localhost port 8420 after 0 ms: Couldn't connect to server`).

Session-type: autonomous
Duration: 10
Task-selected: Implement the TTD algorithm together with data reconstruction
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: cpu_hours unknown/0.1 (no ledger.yaml)

### 2026-03-25 (Synthetic dataset v1 for PCA vs TTD)

Created a reproducible synthetic grayscale video-like dataset (3D tensor) and committed the artifacts under `projects/pca_vs_ttd/experiments/dc-test/data/` along with the generator script and a structured work record (`projects/pca_vs_ttd/experiments/dc-test/EXPERIMENT.md`).

Also added mission-gap tasks for (a) an evaluation protocol doc, (b) a hyperparameter trade-off study, and (c) a benchmark report artifact.

Task claiming attempt (per SOP) could not be executed because the scheduler control API was not reachable in this environment (`curl` to `http://localhost:8420/api/tasks/claim` failed to connect).

Session-type: autonomous
Duration: 20
Task-selected: Synthesize the dataset to test the algorithm
Task-completed: yes
Approvals-created: 0
Files-changed: 6
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: cpu_hours unknown/0.1 (no ledger.yaml)

### 2026-03-25 (PCA baseline implementation)

Selected task: implement PCA compression + reconstruction on the synthetic dataset, and document a baseline compression metric and reconstruction accuracy metric.

Task claiming attempt (per SOP) could not be executed because the scheduler control API was not reachable in this environment (`curl` to `http://localhost:8420/api/tasks/claim` failed to connect).

Implemented PCA on the synthetic dataset by flattening frames into a `(T, H·W)` matrix, performing SVD-based PCA with `k` components, reconstructing the tensor, and recording compression vs reconstruction metrics in a structured work record under `projects/pca_vs_ttd/experiments/pca-baseline/`.

Baseline (k=8) metrics from `projects/pca_vs_ttd/experiments/pca-baseline/results/pca_baseline_k8.json`: compression ratio ≈ 3.53×, relative Frobenius reconstruction error ≈ 0.0379, and PSNR ≈ 37.63 dB.

Session-type: autonomous
Duration: 15
Task-selected: Implement the PCA algorithm together with data reconstruction
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: cpu_hours unknown/0.1 (no ledger.yaml)

## Open questions

- How to devise the synthesized dataset to differentiate the performance of the two algorithms.
- Which set of metrics are the most concise to showcase the trade-off in PCA vs. TTD?
- For matched-compression / matched-quality slices, should the report interpolate between sweep points, or only compare at discrete hyperparameter settings?
