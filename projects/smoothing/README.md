# Smoothing

Status: active
Mission: Identify denoising algorithms and hyperparameters that best recover clean on-attractor Lorenz63 trajectories from coordinate-scaled i.i.d. Gaussian observation noise.
Done when: A reproducible benchmark report compares Savitzky-Golay filtering and kernel smoothing across a range of noise levels, reports mean and variance of RMSE and supporting metrics across multiple trajectory/noise realizations, and recommends hyperparameter regimes for each method.

## Context

This project studies signal denoising on synthetic Lorenz63 trajectories sampled on the attractor. Clean trajectories should be generated first, then corrupted by independent Gaussian noise whose per-coordinate standard deviation is proportional to that coordinate's average absolute clean-signal magnitude. The initial algorithm set includes the standard Savitzky-Golay filter and a kernel smoother that fits the full signal using kernels centered at `M < N` equidistant time steps.

The kernel smoother should sweep `M`, bandwidth `h`, and kernel type. Kernel types in scope are Gaussian kernels and compact polynomial kernels of the form `k(x,x') = (1 - (x - x')^2 / h^2)^p` supported on `|x - x'| <= h`, where `p` is an additional hyperparameter. The first benchmark should be CPU-only and complete within 20 minutes, so the initial grid should be deliberately small and expanded only after a pilot confirms runtime.

## Log

### 2026-04-28 (Integrated isolated task `Restore portable Lorenz63 sweep plot artifacts [fleet-eligible] [skill: execute] [zero-resource]`)

Integrated isolated task `Restore portable Lorenz63 sweep plot artifacts [fleet-eligible] [skill: execute] [zero-resource]` after 1 review round(s).

Session-type: autonomous
Duration: 9
Task-selected: Restore portable Lorenz63 sweep plot artifacts [fleet-eligible] [skill: execute] [zero-resource]
Task-completed: yes
Approvals-created: 0
Files-changed: 11
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-28 (Restored portable Lorenz63 sweep plot artifacts)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Restore portable Lorenz63 sweep plot artifacts [fleet-eligible] [skill: execute] [zero-resource]","agentId":"codex-manual-2026-04-28-restore-lorenz63-plots"}'`
  Output: `{"ok":true,"claim":{"claimId":"d044c068033539dc","taskId":"67ec68f3a4cd","taskText":"Restore portable Lorenz63 sweep plot artifacts [fleet-eligible] [skill: execute] [zero-resource]","project":"smoothing","agentId":"codex-manual-2026-04-28-restore-lorenz63-plots","claimedAt":1777348920491,"expiresAt":1777351620491}}` and `200`
  Interpretation: the scheduler claim API is live in this worktree and accepted the pre-selected artifact-restoration task before project state changed.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — module-local artifact regeneration and documentation updates only; no external model/API calls beyond the scheduler claim, no GPU work, and no long-running compute.

Discovery:
- The committed `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/` bundle had the sweep CSVs and dataset snapshot, but it lacked `plots/`, and both `run_manifest.json` plus the trailing manifest block in `output.log` still referenced the original execution worktree.
- The repo-wide `*.png` ignore rule would also hide regenerated plot files unless this specific sweep artifact directory was explicitly unignored.

Execution result:
- Added a portable restore path to [modules/smoothing/run_denoising_sweep.py](../../modules/smoothing/run_denoising_sweep.py): `restore_portable_artifacts(...)` plus `--restore-portable-artifacts` now rebuild the three standard plot PNGs from `best_by_noise.csv`, rewrite `run_manifest.json` with current-worktree artifact paths, and normalize `output.log` so its final manifest no longer points at the original run directory.
- Added a regression test in [modules/smoothing/test_run_denoising_sweep.py](../../modules/smoothing/test_run_denoising_sweep.py) that simulates stale manifest/log paths, deletes `plots/*.png`, runs the restore helper, and verifies the rewritten files now point at the current artifact directory.
- Restored the committed plot artifacts under [modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots](../../modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots), updated [.gitignore](../../.gitignore) to unignore this plot directory, documented the restore mode in [modules/smoothing/README.md](../../modules/smoothing/README.md), and marked the selected task complete in [TASKS.md](./TASKS.md).

Verification:
- `pytest -q modules/smoothing/test_run_denoising_sweep.py`
  Output: `3 passed in 1.02s`
- `python modules/smoothing/run_denoising_sweep.py --out-dir modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 --restore-portable-artifacts`
  Output: JSON manifest with `plots_dir = "modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots"`, `n_rows_written = 1920`, and the three restored plot paths under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/`.
- `find modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots -maxdepth 1 -type f | sort`
  Output:
  - `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/denoising_gain_vs_noise.png`
  - `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/relative_rmse_vs_noise.png`
  - `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/rmse_vs_noise.png`
- `python - <<'PY' ... PY` reading `run_manifest.json` and `output.log`
  Output: `old_ref_in_manifest = false` and `old_ref_in_output_log = false`, with `dataset.clean_path = "modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/dataset/clean_trajectories.npz"` and `plots_dir = "modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots"`.

Compound (fast): no actions. `git diff --stat HEAD~1..HEAD` showed only the intended portable-artifact restoration changes, and `.scheduler/metrics/sessions.jsonl` was absent in this worktree so there were no recent fleet sessions to audit.

### 2026-04-28 (Integrated isolated task `Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]`)

Integrated isolated task `Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]` after 2 review round(s).

Session-type: autonomous
Duration: 16
Task-selected: Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]
Task-completed: yes
Approvals-created: 0
Files-changed: 4
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-27 (Review fix: supporting-metric variances in Lorenz63 sweep findings)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]","agentId":"codex-manual-2026-04-27-review-fix"}'`
  Output: `{"ok":true,"claim":{"claimId":"d92a1cc36282ec2e","taskId":"ff78fd4bff9a","taskText":"Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]","project":"smoothing","agentId":"codex-manual-2026-04-27-review-fix","claimedAt":1777347647851,"expiresAt":1777350347851}}` and `200`
  Interpretation: the scheduler claim API is live in this worktree and accepted the pre-selected analysis task for the review-fix session.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — this fix is limited to artifact inspection plus documentation updates in project records; no new experiment run, external model call, or long-running compute was required.

Discovery:
- `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/best_by_noise.csv` already contained the missing supporting-metric variance columns: `variance_cluster_relative_rmse` and `variance_cluster_denoising_gain`.
- The completed Findings section had reported only RMSE variance, so the selected task's done-when was still under-documented even though the source artifact already supported the missing evidence.

Execution result:
- Updated [projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md) so the per-noise comparison table now reports mean plus cluster-adjusted variance for RMSE, relative RMSE, and denoising gain for both Savitzky-Golay and kernel winners.
- Expanded the uncertainty narrative in Findings item 8 to state explicitly that kernel uncertainty remains larger on all three reported metrics, not just RMSE.

Verification:
- `python - <<'PY'\nimport pandas as pd\nfrom pathlib import Path\nbase = Path('modules/smoothing/artifacts/lorenz63-denoising-sweep-v1')\ndf = pd.read_csv(base / 'best_by_noise.csv').sort_values(['alpha','method'])\nprint(df[['alpha','method','setting_id','mean_rmse','variance_cluster_rmse','mean_relative_rmse','variance_cluster_relative_rmse','mean_denoising_gain','variance_cluster_denoising_gain']].to_string(index=False))\nPY`
  Output included the exact supporting-metric variance columns used in the patched Findings table, e.g. at `alpha = 0.02` the best kernel row reported `variance_cluster_relative_rmse = 2.865330e-05` and `variance_cluster_denoising_gain = 0.102205`, while the best Savitzky-Golay row reported `2.065305e-08` and `0.000068`.

Compound (fast): no actions. `git diff --stat HEAD~1..HEAD` showed only the project log plus the experiment Findings fix, `.scheduler/metrics/sessions.jsonl` was absent in this worktree, and the review resolution did not surface a new reusable convention or follow-up task beyond the evidence already recorded.

### 2026-04-27 (Analyzed Lorenz63 denoising sweep results)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]","agentId":"codex-manual-2026-04-27-lorenz63-sweep-analysis"}'`
  Output: `{"ok":true,"claim":{"claimId":"a1fe144dcff83b33","taskId":"ff78fd4bff9a","taskText":"Analyze Lorenz63 denoising sweep results [requires-frontier] [skill: analyze] [zero-resource]","project":"smoothing","agentId":"codex-manual-2026-04-27-lorenz63-sweep-analysis","claimedAt":1777347086909,"expiresAt":1777349786909}}` and `200`
  Interpretation: the scheduler claim API is available and accepted the pre-selected analysis task before project state changed.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — artifact inspection, result synthesis, and documentation only; no external model/API calls beyond the scheduler claim, no GPU work, and no long-running compute.

Plan:
- Added [plans/2026-04-27-analyze-lorenz63-sweep-results.md](./plans/2026-04-27-analyze-lorenz63-sweep-results.md) to record the interpretation workflow and closeout criteria for the completed v1 sweep.

Discovery:
- `best_by_noise.csv` shows the same kernel winner at every noise level, `kernel|type=gaussian|M=128|ch=1`, but the best Savitzky-Golay setting beats it on RMSE, relative RMSE, and denoising gain in every `alpha` slice.
- `robust_settings.csv` contains only one cross-noise recommendation, `savgol|w=21|p=3`, which indicates no kernel setting satisfied the sweep's robust-positive-gain filter.
- The committed artifact directory in this worktree contains the tabular outputs and dataset snapshot but not `plots/`; `run_manifest.json` and `output.log` still point to plot files under the original execution worktree.

Execution result:
- Expanded [projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md) with provenance-backed findings that compare the best Savitzky-Golay and kernel rows at each noise level, quantify the low-noise kernel failure mode, and recommend `savgol|w=21|p=3` as the best single cross-noise default.
- Marked the selected analysis task complete in [TASKS.md](./TASKS.md) and added a follow-up execution task to restore portable plot artifacts for the sweep output.

Verification:
- `python - <<'PY'\nimport pandas as pd\nbase = 'modules/smoothing/artifacts/lorenz63-denoising-sweep-v1'\ndf = pd.read_csv(f'{base}/summary_by_setting.csv')\nbest = pd.read_csv(f'{base}/best_by_noise.csv')\nidx = df.groupby(['alpha','method'])['mean_rmse'].idxmin()\nprint(df.loc[idx][['alpha','method','setting_id','mean_rmse','mean_relative_rmse','mean_denoising_gain','variance_cluster_rmse']].sort_values(['alpha','method']).to_string(index=False))\nprint('\\nrobust_settings:')\nprint(pd.read_csv(f'{base}/robust_settings.csv').to_string(index=False))\nPY`
  Output included:
  - best Savitzky-Golay rows `savgol|w=21|p=5` at `alpha = 0.02`, `savgol|w=21|p=3` at `0.05` and `0.10`, and `savgol|w=41|p=5` at `0.20`
  - best kernel row `kernel|type=gaussian|M=128|ch=1` at all `4` noise levels
  - robust row `savgol|w=21|p=3` with `robust_mean_relative_rmse_across_noise = 0.029421693881328793` and `positive_gain_noise_levels = 4`
- `python - <<'PY'\nimport pandas as pd\nbase = 'modules/smoothing/artifacts/lorenz63-denoising-sweep-v1'\ndf = pd.read_csv(f'{base}/summary_by_setting.csv')\nres = df.groupby(['alpha','method']).agg(\n    n_settings=('setting_id','count'),\n    n_positive_gain=('mean_denoising_gain', lambda s: int((s > 0).sum()))\n).reset_index()\nprint(res.to_string(index=False))\nPY`
  Output:
  - `0.02 kernel_smoothing n_settings=36 n_positive_gain=0`
  - `0.02 savitzky_golay n_settings=12 n_positive_gain=10`
  - `0.05 kernel_smoothing n_settings=36 n_positive_gain=0`
  - `0.05 savitzky_golay n_settings=12 n_positive_gain=10`
  - `0.10 kernel_smoothing n_settings=36 n_positive_gain=8`
  - `0.10 savitzky_golay n_settings=12 n_positive_gain=12`
  - `0.20 kernel_smoothing n_settings=36 n_positive_gain=11`
  - `0.20 savitzky_golay n_settings=12 n_positive_gain=12`
- `find modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 -maxdepth 2 -type f | sort`
  Output listed `best_by_noise.csv`, `metrics_raw.csv`, `robust_settings.csv`, `run_manifest.json`, `summary_by_setting.csv`, and the `dataset/` files, but no `plots/*.png`.

Compound (fast): 1 action — added the follow-up task `Restore portable Lorenz63 sweep plot artifacts` so a later execution session can regenerate or clarify the missing committed plot files referenced by the sweep manifest. `.scheduler/metrics/sessions.jsonl` was absent in this worktree, so there were no recent fleet sessions to audit.

### 2026-04-28 (Integrated isolated task `Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]`)

Integrated isolated task `Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]` after 1 review round(s).

Session-type: autonomous
Duration: 18
Task-selected: Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]
Task-completed: yes
Approvals-created: 0
Files-changed: 19
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-27 (Ran the first Lorenz63 denoising sweep)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]","agentId":"codex-manual-2026-04-27-lorenz63-sweep"}'`
  Output: `{"ok":true,"claim":{"claimId":"4af764fc9cd2df0b","taskId":"0b7ba9d6a4db","taskText":"Run the first Lorenz63 denoising hyperparameter sweep [skill: execute]","project":"smoothing","agentId":"codex-manual-2026-04-27-lorenz63-sweep","claimedAt":1777345327845,"expiresAt":1777348027845}}` and `200`
  Interpretation: the scheduler claim API is available and accepted the selected sweep-execution task before project state changed.

Scope classification:
`RESOURCE` (`consumes_resources: true`) — the selected task includes a CPU hyperparameter sweep that is expected to exceed the 2-minute in-session threshold, so it must be prepared locally and submitted through `infra/experiment-runner/run.py --detach` rather than supervised inline.

Plan:
- Added [plans/2026-04-27-first-sweep-execution.md](./plans/2026-04-27-first-sweep-execution.md) to record the implementation, smoke-verification, and fire-and-forget submission sequence for the first v1 sweep.

Discovery:
- The repo already had the adopted protocol, dataset generator, and reusable denoisers, but it did not yet have a sweep runner or aggregation pipeline for `metrics_raw.csv`, cluster-aware summaries, recommendation tables, and plots.
- `infra/experiment-runner/run.py --detach` executes the child command from the experiment directory, not the repo root. The first launch therefore failed with `ModuleNotFoundError: No module named 'modules'` until `modules/smoothing/run_denoising_sweep.py` bootstrapped the repo root on `sys.path`.
- Passing `--watch-csv` as a relative path to the detached runner caused it to be re-resolved under the experiment directory; the successful rerun used an absolute `metrics_raw.csv` path.
- This workspace's scheduler server accepted `/api/tasks/claim` requests but returned `404` for `/api/experiments/register`, so experiment completion evidence for this session comes from `progress.json` plus the written artifact files rather than scheduler-side registration.

Execution result:
- Added [modules/smoothing/run_denoising_sweep.py](../../modules/smoothing/run_denoising_sweep.py), which builds the protocol dataset, evaluates the `48`-setting v1 grid, streams `metrics_raw.csv` for runner progress tracking, writes `summary_by_setting.csv`, `best_by_noise.csv`, `robust_settings.csv`, `run_manifest.json`, and renders the three required plots.
- Added [modules/smoothing/test_run_denoising_sweep.py](../../modules/smoothing/test_run_denoising_sweep.py) to verify cluster-aware aggregation and a smoke-sized end-to-end sweep contract.
- Submitted the full run through `infra/experiment-runner/run.py --detach`, then reran it with repo-root-safe imports and an absolute watch path after the first detached attempt failed. The completed run wrote artifacts under [modules/smoothing/artifacts/lorenz63-denoising-sweep-v1](../../modules/smoothing/artifacts/lorenz63-denoising-sweep-v1).
- Updated [projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md) to `status: completed` and marked the execution task complete in [TASKS.md](./TASKS.md).

Verification:
- `pytest -q modules/smoothing/test_denoise_baselines.py modules/smoothing/test_generate_lorenz63_dataset.py modules/smoothing/test_run_denoising_sweep.py`
  Output: `8 passed in 0.74s`
- `python modules/smoothing/run_denoising_sweep.py --out-dir /tmp/lorenz63-sweep-smoke --trajectory-seeds 0 1 --replicate-ids 0 --noise-levels 0.05 0.10 --burn-in-steps 32 --record-steps 64 --window-lengths 7 --polyorders 2 --kernel-anchors 8 --bandwidth-multipliers 1 --kernel-types gaussian compact_polynomial --kernel-degrees 2 --overwrite`
  Output included `n_rows_written = 12`, `n_summary_rows = 6`, `n_best_rows = 4`, `n_robust_rows = 4`, and the three required plot paths.
- `/usr/bin/time -p python modules/smoothing/run_denoising_sweep.py --out-dir /tmp/lorenz63-sweep-smoke-timed --trajectory-seeds 0 1 --replicate-ids 0 --noise-levels 0.05 0.10 --burn-in-steps 32 --record-steps 64 --window-lengths 7 --polyorders 2 --kernel-anchors 8 --bandwidth-multipliers 1 --kernel-types gaussian compact_polynomial --kernel-degrees 2 --overwrite >/tmp/lorenz63-sweep-smoke-timed.stdout`
  Output: `real 0.79`, `user 0.68`, `sys 0.07`
- `python infra/experiment-runner/run.py --detach --artifacts-dir /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 --project-dir /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/projects/smoothing --max-retries 1 --watch-csv /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/metrics_raw.csv --total 1920 /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/projects/smoothing/experiments/lorenz63-denoising-sweep-v1 -- python /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/run_denoising_sweep.py --out-dir /Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/modules/smoothing/artifacts/lorenz63-denoising-sweep-v1 --overwrite`
  Output: `Budget check: No budget.yaml found, skipping budget check` and `{"launched": true, "pid": 43167}`
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/experiments/register -H 'Content-Type: application/json' -d '{"dir":"/Users/daninghuang/Repos/openakari-codex/modules/.worktrees/smoothing/Run-the-first-Lorenz63-denoising-hyperparameter--task-run-moi1g0xv/projects/smoothing/experiments/lorenz63-denoising-sweep-v1","project":"smoothing","id":"lorenz63-denoising-sweep-v1"}'`
  Output: `{"error":"not found"}` and `404`
- `sed -n '1,260p' projects/smoothing/experiments/lorenz63-denoising-sweep-v1/progress.json`
  Output included `status: "completed"`, `current: 1920`, `pct: 100.0`, `exit_code: 0`, and `duration_s: 5`.
- `python - <<'PY' ... PY` counting rows in `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/{metrics_raw.csv,summary_by_setting.csv,best_by_noise.csv,robust_settings.csv}` and reading `run_manifest.json`
  Output: `metrics_raw.csv 1920`, `summary_by_setting.csv 192`, `best_by_noise.csv 8`, `robust_settings.csv 4`, and `manifest_counts {'n_best_rows': 8, 'n_robust_rows': 4, 'n_rows_expected': 1920, 'n_rows_written': 1920, 'n_samples': 40, 'n_settings': 48, 'n_summary_rows': 192}`

Compound (fast): 1 action — updated [docs/sops/autonomous-work-cycle.md](../../docs/sops/autonomous-work-cycle.md) so the fire-and-forget submission step now warns that detached runs execute from `<experiment-dir>` and that `--watch-csv` should use an absolute path to avoid silent mis-resolution.

### 2026-04-28 (Integrated isolated task `Implement Savitzky-Golay and kernel smoothing baselines [skill: execute]`)

Integrated isolated task `Implement Savitzky-Golay and kernel smoothing baselines [skill: execute]` after 1 review round(s).

Session-type: autonomous
Duration: 7
Task-selected: Implement Savitzky-Golay and kernel smoothing baselines [skill: execute]
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-27 (Implemented Savitzky-Golay and kernel smoothing baselines)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Implement Savitzky-Golay and kernel smoothing baselines [skill: execute]","agentId":"codex-manual-2026-04-28-smoothing-baselines"}'`
  Output: `{"ok":true,"claim":{"claimId":"938ee6418f445a7a","taskId":"91881d58b7fa","taskText":"Implement Savitzky-Golay and kernel smoothing baselines [skill: execute]","project":"smoothing","agentId":"codex-manual-2026-04-28-smoothing-baselines","claimedAt":1777343523588,"expiresAt":1777346223588}}` and `200`
  Interpretation: the scheduler claim API is available and accepted the selected baseline-implementation task before project state changed.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — module-local Python implementation and test verification only; no external model/API calls beyond the scheduler claim, no GPU work, and no long-running compute.

Discovery:
- SciPy is installed in this environment, so the Savitzky-Golay baseline can implement the protocol's exact `scipy.signal.savgol_filter(..., mode="interp")` semantics instead of approximating the boundary rule.

Execution result:
- Added [modules/smoothing/denoise_baselines.py](../../modules/smoothing/denoise_baselines.py), which exposes three reusable denoisers for the benchmark: `savitzky_golay_denoise`, `gaussian_kernel_denoise`, and `compact_polynomial_kernel_denoise`.
- Implemented the kernel smoother as the protocol-specified anchor-basis least-squares estimator on sample index: equidistant anchors over `0..N-1`, Gaussian or compact-polynomial basis evaluation, Moore-Penrose pseudoinverse solve, and full-length same-shape reconstruction.
- Added [modules/smoothing/test_denoise_baselines.py](../../modules/smoothing/test_denoise_baselines.py) to pin the baseline contract: exact Savitzky-Golay parity with SciPy `mode="interp"` and closed-form projection checks for both kernel families.
- Updated [modules/smoothing/README.md](../../modules/smoothing/README.md) and [TASKS.md](./TASKS.md) so the module advertises the new entry points and the selected task records concrete implementation evidence.

Verification:
- `pytest -q modules/smoothing/test_denoise_baselines.py modules/smoothing/test_generate_lorenz63_dataset.py`
  Output: `6 passed in 0.43s`
- `python - <<'PY' ... PY` importing the three denoisers and applying them to a `(12, 3)` array
  Output: `{'savitzky_shape': (12, 3), 'gaussian_shape': (12, 3), 'compact_shape': (12, 3)}`

Compound (fast): no actions. The session produced a project-local baseline module and tests but did not surface a reusable repo-wide convention change, follow-up task, or recent fleet-session artifact to audit.

### 2026-04-28 (Integrated isolated task `Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]`)

Integrated isolated task `Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]` after 2 review round(s).

Session-type: autonomous
Duration: 15
Task-selected: Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-27 (Review fix: per-sample noise-seed replay)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]","agentId":"codex-manual-2026-04-27-lorenz63-review-fix-1e9f8294"}'`
  Output: `{"ok":false,"error":"Task already claimed","claimedBy":"codex-manual-2026-04-27-lorenz63-generator","expiresAt":1777344392281}` and `409`
  Interpretation: the scheduler claim API is available, but the selected task already had an active claim from the earlier dataset-generator session, so this review-fix session proceeded without creating a duplicate claim.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — module-local Python bugfix and regression-test verification only; no external model/API calls beyond the scheduler claim, no GPU work, and no long-running compute.

Discovery:
- `modules/smoothing/generate_lorenz63_dataset.py` currently instantiates one RNG per `(trajectory_seed, replicate_id)` pair before iterating over `alpha`. The saved `noise_seed` therefore replays only the first noisy sample for that pair; later `alpha` rows depend on prior draws from the same stream and cannot be reconstructed from the persisted per-row metadata alone.

Execution result:
- Resolved the blocking dataset-generator review finding in [modules/smoothing/generate_lorenz63_dataset.py](../../modules/smoothing/generate_lorenz63_dataset.py) by reinitializing the RNG from the saved `noise_seed` for each emitted noisy row instead of advancing one shared stream across `alpha`.
- Added a regression test in [modules/smoothing/test_generate_lorenz63_dataset.py](../../modules/smoothing/test_generate_lorenz63_dataset.py) that reconstructs every noisy sample directly from its persisted `noise_seed` and `noise_scales`; it failed before the fix and now passes.
- Extended dataset metadata with `seed_rules.noise_replay_rule` so downstream audits know the intended replay contract for saved noisy rows.

Verification:
- `pytest -q modules/smoothing/test_generate_lorenz63_dataset.py`
  Output: `3 passed in 0.04s`
- `python modules/smoothing/generate_lorenz63_dataset.py --out-dir /tmp/lorenz63-review-fix --trajectory-seeds 0 --replicate-ids 0 --noise-levels 0.02 0.05 --burn-in-steps 8 --record-steps 16 --overwrite`
  Output: JSON with `clean_path`, `noisy_path`, and `metadata_path` under `/tmp/lorenz63-review-fix/`
- `python - <<'PY' ... PY` to replay `/tmp/lorenz63-review-fix/noisy_observations.npz` rows from their saved seeds
  Output: `{"replay_matches": true, "noise_seeds": [1000, 1000], "noise_levels": [0.02, 0.05], "shape": [2, 16, 3]}`

Compound (fast): no actions. The session surfaced a project-local replay-contract bugfix but no reusable repo-wide convention or follow-up task, and `.scheduler/metrics/sessions.jsonl` was absent so there were no recent fleet sessions to audit.

### 2026-04-27 (In progress: reproducible Lorenz63 noisy-signal dataset generator)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]","agentId":"codex-manual-2026-04-27-lorenz63-generator"}'`
  Output: `{"ok":true,"claim":{"claimId":"28912556fd325d7b","taskId":"80d472d04969","taskText":"Implement a reproducible Lorenz63 noisy-signal dataset generator [skill: execute]","project":"smoothing","agentId":"codex-manual-2026-04-27-lorenz63-generator","claimedAt":1777341692281,"expiresAt":1777344392281}}` and `200`
  Interpretation: the scheduler claim API is available and accepted the selected dataset-generator task before project state changed.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — module-local Python implementation and smoke-test verification only; no external model/API calls beyond the scheduler claim, no GPU work, and no long-running compute.

Execution result:
- Added [modules/smoothing/generate_lorenz63_dataset.py](../../modules/smoothing/generate_lorenz63_dataset.py), a reproducible RK4-based Lorenz63 dataset generator with both reusable Python APIs (`build_dataset`, `write_dataset`) and a CLI entrypoint. It generates clean trajectories from protocol-seeded initial conditions, derives coordinate scales from the clean signal, injects Gaussian noise with `noise_seed = 1000 + 2 * trajectory_seed + replicate_id`, and writes `clean_trajectories.npz`, `noisy_observations.npz`, and `metadata.json`.
- Added [modules/smoothing/test_generate_lorenz63_dataset.py](../../modules/smoothing/test_generate_lorenz63_dataset.py) to pin the generator contract: reproducible outputs for repeated runs with the same seeds, coordinate-scaled noise bookkeeping, and saved artifact/metadata layout for a two-seed, two-noise-level smoke configuration.
- Updated [modules/smoothing/README.md](../../modules/smoothing/README.md) and [TASKS.md](./TASKS.md) so the module advertises the new entrypoint and the selected task now records concrete implementation evidence.

Verification:
- `pytest -q modules/smoothing/test_generate_lorenz63_dataset.py`
  Output: `2 passed in 0.04s`
- `python modules/smoothing/generate_lorenz63_dataset.py --out-dir /tmp/lorenz63-smoke --trajectory-seeds 0 1 --replicate-ids 0 1 --noise-levels 0.02 0.05 --burn-in-steps 8 --record-steps 16 --overwrite`
  Output: JSON with `clean_path`, `noisy_path`, and `metadata_path` under `/tmp/lorenz63-smoke/`
- `python - <<'PY' ... PY` to inspect `/tmp/lorenz63-smoke/metadata.json`
  Output included `dataset_counts = {"n_clean_trajectories": 2, "n_noise_levels": 2, "n_replicates_per_clean": 2, "n_noisy_samples": 8}`, `integration = {"method": "rk4", "dt": 0.01, "burn_in_steps": 8, "record_steps": 16, "total_steps": 24}`, and per-clean `coordinate_scales` metadata.
- `python - <<'PY' ... PY` to inspect `/tmp/lorenz63-smoke/{clean_trajectories,noisy_observations}.npz`
  Output included `clean trajectories shape (2, 16, 3)`, `clean seeds [0, 1]`, `noisy observations shape (8, 16, 3)`, `alphas [0.02, 0.05]`, and `noise scales shape (8, 3)`.

Compound (fast): no actions. This session produced a project-local implementation and tests but surfaced no reusable repo-wide convention change or follow-up task, and `.scheduler/metrics/sessions.jsonl` was absent so there were no recent fleet sessions to audit.

### 2026-04-28 (Integrated isolated task `Define the Lorenz63 denoising evaluation protocol [requires-frontier] [skill: design] [zero-resource]`)

Integrated isolated task `Define the Lorenz63 denoising evaluation protocol [requires-frontier] [skill: design] [zero-resource]` after 2 review round(s).

Session-type: autonomous
Duration: 12
Task-selected: Define the Lorenz63 denoising evaluation protocol [requires-frontier] [skill: design] [zero-resource]
Task-completed: yes
Approvals-created: 0
Files-changed: 6
Commits: 1
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a
### 2026-04-27 (Review fix: cluster-aware variance and Savitzky-Golay edge handling)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Define the Lorenz63 denoising evaluation protocol","agentId":"codex-manual-2026-04-27-review-fixes"}'`
  Output: `{"ok":false,"error":"Task already claimed","claimedBy":"codex-9524D6CB-A348-404A-8CAD-D974ACEF007A","expiresAt":1777341416770}` and `409`
  Interpretation: the scheduler claim API is available, but this selected task was already actively claimed, so work proceeded without creating a duplicate claim.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — protocol, plan, and experiment-spec documentation updates only; no model/API calls beyond the scheduler claim, no GPU work, and no long-running compute.

Execution result:
- Resolved the blocking variance-review finding in [evaluation_protocol.md](./evaluation_protocol.md) by replacing the false `n_realizations = 10` independence claim with trajectory-seed clustered uncertainty reporting: each `{alpha, method, hyperparameters}` group still contains `10` raw rows, but summary variance and error bars now use the `5` per-seed cluster means and record both `n_realizations = 10` and `n_clusters = 5`.
- Resolved the blocking Savitzky-Golay reproducibility finding by fixing the exact edge rule to `scipy.signal.savgol_filter(..., mode="interp")` semantics and marking alternative padding modes as non-compliant for v1.
- Propagated both protocol fixes into [plans/2026-04-27-denoising-benchmark.md](./plans/2026-04-27-denoising-benchmark.md) and [experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md) so downstream implementation uses the same aggregation and boundary contract.

Verification:
- `rg -n "mode=\"interp\"|trajectory-seed cluster|n_clusters|cluster-adjusted|5 trajectory-seed|10 noisy rows" projects/smoothing/{evaluation_protocol.md,experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md,plans/2026-04-27-denoising-benchmark.md}`
  Output included:
  - `projects/smoothing/evaluation_protocol.md:18:... scipy.signal.savgol_filter(..., mode="interp") ...`
  - `projects/smoothing/evaluation_protocol.md:59:... cluster-adjusted sample variance ... n_realizations = 10 ... n_clusters = 5 ...`
  - `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md:25:... 10 noisy rows per noise level arranged as 5 trajectory-seed clusters ...`
  - `projects/smoothing/plans/2026-04-27-denoising-benchmark.md:46:- Savitzky-Golay edge handling: scipy.signal.savgol_filter(..., mode="interp")`
- `git diff --stat HEAD~1..HEAD`
  Output:
  - `projects/smoothing/evaluation_protocol.md | 26 ++++++++++++----------`
  - `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md | 5 +++--`
  - `projects/smoothing/plans/2026-04-27-denoising-benchmark.md | 7 +++---`
  - `3 files changed, 21 insertions(+), 17 deletions(-)`

Compound (fast): no actions. This session surfaced no new repo-wide convention or follow-up task, and `.scheduler/metrics/sessions.jsonl` was absent so there were no recent fleet sessions to audit.

### 2026-04-27 (Selected-task closeout verification)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Define the Lorenz63 denoising evaluation protocol","agentId":"codex-manual-2026-04-27-closeout"}'`
  Output: `{"ok":false,"error":"Task already claimed","claimedBy":"codex-9524D6CB-A348-404A-8CAD-D974ACEF007A","expiresAt":1777341416770}` and `409`
  Interpretation: the scheduler claim API is available, but this selected task was already actively claimed by the prior protocol-design session, so no duplicate claim was created.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — verification-and-closeout only; no model calls, no GPU work, and no long-running compute.

Execution result:
- Verified that the selected task is already complete in the current branch state: [evaluation_protocol.md](./evaluation_protocol.md) is present with `Status: adopted`, [TASKS.md](./TASKS.md) marks the task complete, and [experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md) reflects the adopted protocol defaults.
- No protocol edits were required in this session because the design artifact, downstream experiment record, and task state were already aligned.

Verification:
- `sed -n '1,220p' projects/smoothing/TASKS.md`
  Output included `- [x] Define the Lorenz63 denoising evaluation protocol [requires-frontier] [skill: design] [zero-resource]`
- `sed -n '1,260p' projects/smoothing/evaluation_protocol.md`
  Output included `# Lorenz63 Denoising Evaluation Protocol`, `Status: adopted`, and `Date: 2026-04-27`
- `sed -n '1,260p' projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`
  Output included `status: planned` plus the adopted v1 defaults for integration, burn-in, recorded length, noise levels, realizations, estimator definition, and required outputs.
- `git status --short`
  Output: empty, confirming the worktree was clean before this closeout entry was recorded.

Compound (fast): no actions. This session surfaced no new reusable convention, failure mode, or follow-up task because the selected design work had already been completed and documented.

### 2026-04-27 (Review fix: align protocol adoption dates with git provenance)

Task claim check:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Define the Lorenz63 denoising evaluation protocol","agentId":"codex-manual-2026-04-27"}'`
  Output: `{"ok":false,"error":"Task already claimed","claimedBy":"codex-9524D6CB-A348-404A-8CAD-D974ACEF007A","expiresAt":1777341416770}` and `409`
  Interpretation: the selected task was already actively claimed in the scheduler store, so work proceeded under the existing claim rather than creating a duplicate.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — project-local temporal-record correction only; no model calls, GPU work, or long-running compute.

Resolved the blocking review finding that future-dated the protocol adoption relative to the branch's actual git provenance. Updated the adopted date in [evaluation_protocol.md](./evaluation_protocol.md) and [experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md) to `2026-04-27`, renamed the benchmark plan to [plans/2026-04-27-denoising-benchmark.md](./plans/2026-04-27-denoising-benchmark.md), and updated task/readme references to the renamed plan path. Also corrected the project creation and protocol-adoption log headings below to `2026-04-27` so the durable record matches the file-local and branch-local commit timestamps.

Verification:
- `git log --oneline --decorate --date=iso-strict-local --pretty=format:'%h %ad %s' main..HEAD`
  Output:
  - `1c4e222 2026-04-27T21:15:01-04:00 record: log smoothing protocol review fixes`
  - `3bac41c 2026-04-27T21:14:11-04:00 design: tighten Lorenz63 denoising protocol reproducibility`
  - `d01aac7 2026-04-27T21:07:15-04:00 docs: close smoothing protocol design session`
  - `dfc3a96 2026-04-27T21:06:29-04:00 design: Lorenz63 denoising evaluation protocol — status: planned`
- `rg -n "2026-04-27-denoising-benchmark|Date: 2026-04-27|date: 2026-04-27|### 2026-04-27" projects/smoothing/{README.md,evaluation_protocol.md,TASKS.md,experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md} projects/smoothing/plans/2026-04-27-denoising-benchmark.md`
  Output included the corrected adopted-date lines in `README.md`, `evaluation_protocol.md`, and `EXPERIMENT.md`, plus the updated plan path in `README.md` and `TASKS.md`.

Compound (fast): no actions. This session corrected project-local temporal provenance but did not reveal a reusable repo-wide convention or a missing follow-up task.

### 2026-04-27 (Review revision: protocol reproducibility fixes)

Claimed the selected task through the scheduler control API before editing project state. `POST /api/tasks/claim` returned HTTP `200` with claim ID `10e7dd1d6b25101d` for `Define the Lorenz63 denoising evaluation protocol`.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — project-local protocol and experiment-record clarification only; no LLM/API calls beyond the scheduler claim, no GPU work, and no long-running compute.

Addressed the two blocking review findings in [evaluation_protocol.md](./evaluation_protocol.md). Kernel smoothing is now a single reproducible estimator: coordinate-wise anchor-basis least-squares on sample index, with explicit anchor centers, kernel formulas, coefficient solve, and `x_hat` definition. The replication scheme now assigns unique noise seeds `1000 + 2 * trajectory_seed + replicate_id`, records `replicate_id` in raw outputs, and states that the `n_realizations = 10` aggregation assumes those ten `(trajectory_seed, replicate_id)` rows are independent.

Propagated the revised protocol contract into [projects/smoothing/plans/2026-04-27-denoising-benchmark.md](./plans/2026-04-27-denoising-benchmark.md) and [projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md) so downstream implementation and sweep execution use the same kernel estimator and seed derivation.

Verification:
- `curl -s -w '\n%{http_code}\n' -X POST http://localhost:8420/api/tasks/claim -H 'Content-Type: application/json' -d '{"project":"smoothing","taskText":"Define the Lorenz63 denoising evaluation protocol","agentId":"codex-9524D6CB-A348-404A-8CAD-D974ACEF007A"}'`
  Output: `{"ok":true,"claim":{"claimId":"10e7dd1d6b25101d","taskId":"115c6923cb81","taskText":"Define the Lorenz63 denoising evaluation protocol","project":"smoothing","agentId":"codex-9524D6CB-A348-404A-8CAD-D974ACEF007A","claimedAt":1777338716770,"expiresAt":1777341416770}}` and `200`
- `rg -n "1000 \\+ 2 \\*|replicate_id|anchor-basis least-squares|sample index|Moore-Penrose" projects/smoothing/evaluation_protocol.md projects/smoothing/plans/2026-04-27-denoising-benchmark.md projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`
  Output included:
  - `projects/smoothing/evaluation_protocol.md:18:- Independent: denoising method and hyperparameters. ... Kernel smoothing uses a coordinate-wise anchor-basis least-squares estimator on the sample-index grid ...`
  - `projects/smoothing/evaluation_protocol.md:35:   noise_seed(s, r) = 1000 + 2 * s + r`
  - `projects/smoothing/evaluation_protocol.md:53:   If multiple minimizers exist, use the minimum-Euclidean-norm solution from the Moore-Penrose pseudoinverse of B.`
  - `projects/smoothing/plans/2026-04-27-denoising-benchmark.md:50:- kernel estimator: coordinate-wise anchor-basis least-squares fit on sample index ...`
  - `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md:25:- realizations: 5 trajectory seeds times 2 replicate IDs, with noise_seed = 1000 + 2 * trajectory_seed + replicate_id, for 10 independent realizations per noise level`

Compound (fast): no actions. The session produced project-local clarifications but no repo-wide convention change or missing follow-up task, and `.scheduler/metrics/sessions.jsonl` was absent so there were no recent fleet sessions to audit.

### 2026-04-27 (Adopted Lorenz63 denoising evaluation protocol)

Claimed the pre-selected task through the scheduler control API before editing project state. `POST /api/tasks/claim` returned HTTP `200` with claim ID `53f4ca3df6c6a78b` for `Define the Lorenz63 denoising evaluation protocol`.

Scope classification:
`ROUTINE` (`consumes_resources: false`) — project-local protocol design and documentation only; no LLM/API calls, GPU work, or long-running compute.

Adopted the benchmark defaults in [evaluation_protocol.md](./evaluation_protocol.md): fixed-step RK4 with `dt = 0.01`, burn-in `5000`, recorded length `2048`, noise levels `0.02/0.05/0.10/0.20`, and `10` realizations per noise level from `5` trajectory seeds times `2` noise seeds. The protocol now fixes the metric set (`RMSE`, `relative_RMSE`, `denoising_gain`, per-coordinate RMSE), aggregation rule (sample mean and variance with complete `n = 10` groups), and required reporting outputs (`metrics_raw.csv`, `summary_by_setting.csv`, `best_by_noise.csv`, `robust_settings.csv`, plus three standard plots).

Aligned downstream project state with the adopted protocol by updating [projects/smoothing/plans/2026-04-27-denoising-benchmark.md](./plans/2026-04-27-denoising-benchmark.md), [projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md](./experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md), and marking the design task complete in [TASKS.md](./TASKS.md).

Verification:
- `curl -s -o /tmp/smoothing_claim_resp.json -w '%{http_code}' -X POST http://localhost:8420/api/tasks/claim ...`
  Output: `200` and `{"ok":true,"claim":{"claimId":"53f4ca3df6c6a78b",...}}`
- `rg -n "dt = 0\\.01|5000|2048|0\\.02, 0\\.05, 0\\.10, 0\\.20|metrics_raw\\.csv|best_by_noise\\.csv|robust_settings\\.csv|denoising_gain_vs_noise\\.png" projects/smoothing/evaluation_protocol.md projects/smoothing/plans/2026-04-27-denoising-benchmark.md projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md`
  Output included:
  - `projects/smoothing/evaluation_protocol.md:24:- Controlled: integration uses fixed-step RK4 with dt = 0.01.`
  - `projects/smoothing/evaluation_protocol.md:31:1. Generate 5 clean trajectories ... integrate for 5000 + 2048 RK4 steps ...`
  - `projects/smoothing/evaluation_protocol.md:43:5. Record one raw-result row ... metrics_raw.csv`
  - `projects/smoothing/evaluation_protocol.md:47:8. Produce robust_settings.csv ...`
  - `projects/smoothing/experiments/lorenz63-denoising-sweep-v1/EXPERIMENT.md:24:- noise levels: alpha in {0.02, 0.05, 0.10, 0.20}`

Compound (fast): no actions. The session did not reveal a repo-wide convention change or a missing follow-up task, and there was no `.scheduler/metrics/sessions.jsonl` file to audit recent fleet output.

Session-type: autonomous
Duration: 5
Task-selected: Define the Lorenz63 denoising evaluation protocol
Task-completed: yes
Approvals-created: 0
Files-changed: 5
Commits: 2
Compound-actions: none
Resources-consumed: none
Budget-remaining: n/a

### 2026-04-27 — Project created

Project initiated via `/project scaffold` for a human-requested study of denoising algorithms on noisy Lorenz63 trajectories. The project is scoped to produce benchmark knowledge: which method and hyperparameter regimes recover clean trajectories best as noise level varies.

Sources: none (project creation)

## Open questions

- Should a later v2 protocol add dynamics-aware metrics, such as derivative or attractor-geometry error, once the v1 amplitude-space benchmark is running?
