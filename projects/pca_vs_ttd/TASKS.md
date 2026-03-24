# Data Compression Benchmark — Tasks

### Phase 1: Baseline evaluation

- [ ] Synthesize the dataset to test the algorithm [skill: execute]
  Why: Need the dataset for benchmark
  Done when: Dataset generated as a three-dimensional data array. Results in `experiments/dc-test/data/`.
  Priority: high

- [ ] Implement the PCA algorithm together with data reconstruction [skill: execute] [zero-resource]
  Why: Prerequisite for benchmark
  Done when: The algorithm can achieve data compression and reconstruction of the synthesized dataset using a generic choice of hyperparameters. Compression rate and reconstruction accuracy documented.
  Priority: high

- [ ] Implement the TTD algorithm together with data reconstruction [skill: execute] [zero-resource]
  Why: Prerequisite for benchmark
  Done when: The algorithm can achieve data compression and reconstruction of the synthesized dataset using a generic choice of hyperparameters. Compression rate and reconstruction accuracy documented.
  Priority: high

### Phase 2: Trade-off analysis

- [ ] Compare the compression rate and reconstruction accuracy from PCA and TTD [skill: execute] [blocked-by: Phase 1 analysis]
  Why: An initial comparison is needed to determine the range of trade-off study regarding to varying hyperparameters.
  Done when: Comparison results documented.  The scope of trade-off study determined and documented.
  Priority: high
