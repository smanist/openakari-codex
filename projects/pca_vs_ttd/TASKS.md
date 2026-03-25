# Data Compression Benchmark — Tasks

### Phase 1: Baseline evaluation

- [x] Synthesize the dataset to test the algorithm [skill: execute]
  Why: Need the dataset for benchmark
  Done when: Dataset generated as a three-dimensional data array. Results in `experiments/dc-test/data/`.
  Priority: high

- [x] Implement the PCA algorithm together with data reconstruction [skill: execute] [zero-resource]
  Why: Prerequisite for benchmark
  Done when: The algorithm can achieve data compression and reconstruction of the synthesized dataset using a generic choice of hyperparameters. Compression rate and reconstruction accuracy documented.
  Priority: high

- [x] Implement the TTD algorithm together with data reconstruction [skill: execute] [zero-resource]
  Why: Prerequisite for benchmark
  Done when: The algorithm can achieve data compression and reconstruction of the synthesized dataset using a generic choice of hyperparameters. Compression rate and reconstruction accuracy documented.
  Priority: high

### Phase 2: Trade-off analysis

- [x] Compare the compression rate and reconstruction accuracy from PCA and TTD [skill: execute]
  Why: An initial comparison is needed to determine the range of trade-off study regarding to varying hyperparameters.
  Done when: Comparison results documented.  The scope of trade-off study determined and documented.
  Priority: high
  Evidence: `projects/pca_vs_ttd/baseline_comparison.md`

## Mission gap tasks

- [x] Define and document the evaluation protocol (metrics + reporting format) [skill: record] [zero-resource]
  Why: Mission gap — no task for "recommended evaluation protocol" (per ADR 0049)
  Done when: `projects/pca_vs_ttd/evaluation_protocol.md` exists with (a) compression metric definition, (b) reconstruction accuracy metric definition, and (c) standard plots/tables to report.
  Priority: high
  Evidence: `projects/pca_vs_ttd/evaluation_protocol.md`

- [x] Run a hyperparameter trade-off study for PCA and TTD [skill: execute]
  Why: Mission gap — no task for "demonstrated trade-off in compression rate and accuracy against hyperparameters" (per ADR 0049)
  Done when: A documented sweep exists showing compression vs accuracy curves for both PCA and TTD over at least 3 hyperparameter settings each.
  Priority: high
  Evidence: `projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/EXPERIMENT.md`

- [x] Write the benchmark report artifact [skill: record] [zero-resource]
  Why: Mission gap — no task for "published benchmark with compression rate and accuracy comparison" (per ADR 0049)
  Done when: `projects/pca_vs_ttd/benchmark_report.md` exists summarizing dataset, methods, and results with the agreed protocol.
  Priority: high
  Evidence: `projects/pca_vs_ttd/benchmark_report.md`

### Phase 3: Publishable report

- [ ] Finalize the benchmark report narrative and recommendation [skill: record] [zero-resource]
  Why: The report is still marked "draft" and should clearly state how to compare methods (full curve overlay vs matched-compression vs matched-quality), with explicit provenance.
  Done when: `projects/pca_vs_ttd/benchmark_report.md` is updated to a non-draft status and includes a short “Recommendation” section describing the comparison rule and citing the sweep artifacts.
  Priority: medium

- [ ] (Optional) Expand the TTD sweep beyond equal ranks [skill: execute]
  Why: Equal-rank `(r, r)` TT is a convenient baseline, but unequal ranks may better match the data’s anisotropy (T vs H vs W) and improve the curve.
  Done when: `projects/pca_vs_ttd/experiments/` contains an additional sweep record that includes at least 3 unequal-rank settings and updates the trade-off overlay plot.
  Priority: low
