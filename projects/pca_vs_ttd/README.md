# Data Compression Benchmark

Status: active
Mission: Evaluate the compression rate versus recovery accuracy trade-off in two typical dimension reduction algorithms: Principle Component Analysis (PCA), and Tensor Train Decomposition (TTD).
Done when: Published benchmark with compression rate and accuracy comparison for the two algorithms, benchmark on a synthesized grayscale video-like data (so the raw data is three-dimensional), demonstrated trade-off in compression rate and accuracy against hyperparameters in the algorithms, and a recommended evaluation protocol.

## Context

PCA has received success in dimension reduction of structured data.  However, for data arrays of more than two dimensions, PCA would cast them into two dimensions and perform the compression.  Leveraging the multiple dimensions, such as in TTD, it may be possible to achieve higher compression rate at the same level of recovery accuracy.  This project compares PCA and TTD in the dimension reduction of video-like data array.

The goal is to answer: how much improvement in data compression can TTD achieve when compared to PCA, and what are the trade off of such improvement?

## Log

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
